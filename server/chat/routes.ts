import { Router, type Response } from 'express'
import { z } from 'zod'
import type { AgentId, SessionId } from '../../src/domain/agents'
import { toRunHistory, WRITABLE_SOURCE, type SessionView } from '../../src/domain/chat'
import type { AgentPlatform } from '../../src/domain/platform'
import type { Capability } from '../../src/domain/provenance'
import { RateLimiter } from '../http/auth'
import type { RunTracker } from './runs'

const MAX_INPUT = 20_000

const runBody = z.object({ input: z.string().trim().min(1).max(MAX_INPUT) })
const sessionBody = z.object({ title: z.string().trim().min(1).max(120).nullish() })
const approvalBody = z.object({ choice: z.enum(['once', 'deny']) })

/** Répond avec la valeur, ou explique pourquoi Hermes ne peut pas la fournir. */
function sendCapability<T>(response: Response, result: Capability<T>, map: (value: T) => unknown = (value) => value): void {
  if (result.status === 'unavailable') {
    response.status(502).json({ error: result.reason })
    return
  }
  response.json(map(result.value))
}

function toView<T extends { source: string }>(session: T): T & { writable: boolean } {
  return { ...session, writable: session.source === WRITABLE_SOURCE }
}

export function chatRoutes(platform: AgentPlatform, tracker: RunTracker, limiter = new RateLimiter(30, 60_000)): Router {
  const router = Router()
  const agentId = (value: string | undefined) => value as AgentId
  const sessionId = (value: string | undefined) => value as SessionId

  router.get('/agents/:agentId/sessions', (request, response, next) => {
    platform.listSessions(agentId(request.params.agentId)).then((result) => {
      sendCapability(response, result, (sessions): SessionView[] => sessions.map(toView))
    }).catch(next)
  })

  router.post('/agents/:agentId/sessions', (request, response, next) => {
    const parsed = sessionBody.safeParse(request.body ?? {})
    if (!parsed.success) {
      response.status(400).json({ error: 'Titre invalide' })
      return
    }
    platform.createSession(agentId(request.params.agentId), parsed.data.title ?? null).then((result) => {
      if (result.status === 'available') response.status(201)
      sendCapability(response, result, toView)
    }).catch(next)
  })

  router.get('/agents/:agentId/sessions/:sessionId/messages', (request, response, next) => {
    platform.listMessages(agentId(request.params.agentId), sessionId(request.params.sessionId))
      .then((result) => sendCapability(response, result))
      .catch(next)
  })

  router.post('/agents/:agentId/sessions/:sessionId/runs', async (request, response, next) => {
    const parsed = runBody.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: `Message vide ou trop long (${MAX_INPUT} caractères au plus)` })
      return
    }
    if (!limiter.allow(request.ip ?? 'inconnu')) {
      response.status(429).json({ error: 'Trop de messages, patiente une minute' })
      return
    }
    try {
      const agent = agentId(request.params.agentId)
      const session = sessionId(request.params.sessionId)
      const existing = await platform.getSession(agent, session)
      if (existing.status === 'unavailable') {
        response.status(502).json({ error: existing.reason })
        return
      }
      if (existing.value.source !== WRITABLE_SOURCE) {
        response.status(403).json({ error: `Session ${existing.value.source} en lecture seule : écris dans une session créée ici` })
        return
      }
      const messages = await platform.listMessages(agent, session)
      if (messages.status === 'unavailable') {
        // Sans l'historique, l'agent perdrait le fil sans le dire : on n'envoie rien.
        response.status(502).json({ error: `Historique indisponible : ${messages.reason}` })
        return
      }
      const started = await platform.startRun(agent, {
        sessionId: session,
        input: parsed.data.input,
        history: toRunHistory(messages.value),
      })
      if (started.status === 'unavailable') {
        response.status(502).json({ error: started.reason })
        return
      }
      tracker.track(agent, session, started.value.runId)
      response.status(202).json({ runId: started.value.runId })
    } catch (error) {
      next(error)
    }
  })

  router.get('/agents/:agentId/runs/active', (request, response) => {
    const run = tracker.active(agentId(request.params.agentId))
    response.json(run ? { runId: run.runId, sessionId: run.sessionId } : null)
  })

  const tracked = (request: { params: Record<string, string | undefined> }, response: Response) => {
    const run = tracker.get(request.params.runId ?? '')
    if (!run || run.agentId !== request.params.agentId) {
      response.status(404).json({ error: 'Run inconnu : le serveur a peut-être redémarré' })
      return null
    }
    return run
  }

  // Le navigateur se reconnecte seul en indiquant le dernier événement reçu.
  router.get('/agents/:agentId/runs/:runId/events', (request, response) => {
    const run = tracked(request, response)
    if (!run) return
    const after = Number(request.headers['last-event-id'] ?? 0) || 0
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    })
    const send = (event: { seq: number; event: unknown }) => {
      response.write(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`)
    }
    for (const event of run.events) if (event.seq > after) send(event)
    if (run.finished) {
      response.end()
      return
    }
    const keepalive = setInterval(() => response.write(': keepalive\n\n'), 15_000)
    const listener = (event: { seq: number; event: unknown }) => {
      send(event)
      if (run.finished) response.end()
    }
    run.listeners.add(listener)
    response.on('close', () => {
      clearInterval(keepalive)
      run.listeners.delete(listener)
    })
  })

  router.post('/agents/:agentId/runs/:runId/stop', (request, response, next) => {
    const run = tracked(request, response)
    if (!run) return
    platform.stopRun(run.agentId, run.runId).then((result) => {
      sendCapability(response, result, () => ({ status: 'stopping' }))
    }).catch(next)
  })

  router.post('/agents/:agentId/runs/:runId/approval', (request, response, next) => {
    const run = tracked(request, response)
    if (!run) return
    const parsed = approvalBody.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: 'Choix invalide : once ou deny' })
      return
    }
    platform.respondApproval(run.agentId, run.runId, parsed.data.choice).then((result) => {
      sendCapability(response, result, () => ({ choice: parsed.data.choice }))
    }).catch(next)
  })

  return router
}
