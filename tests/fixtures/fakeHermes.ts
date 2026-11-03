import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

/**
 * Faux serveur reproduisant les réponses de gateway/platforms/api_server.py au commit
 * 2bd1977d (Hermes v0.17.0). Il prouve la cohérence avec le source lu, pas avec une instance.
 */
export interface FakeHermes {
  url: string
  key: string
  requests: { method: string; path: string; authorized: boolean; body: unknown }[]
  sessions: Record<string, unknown>[]
  messages: Map<string, Record<string, unknown>[]>
  runs: Map<string, Record<string, unknown>>
  /** Événements émis pour le prochain run ; une fonction reçoit l'identifiant du run. */
  nextRunEvents: Record<string, unknown>[]
  health: Record<string, unknown>
  failNext: { status: number; body?: unknown; times: number } | null
  close(): Promise<void>
}

function json(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(payload))
}

const openAiError = (message: string, code: string) => ({ error: { message, type: 'invalid_request_error', code } })

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  if (chunks.length === 0) return undefined
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return undefined
  }
}

export async function startFakeHermes(options: { key?: string; model?: string } = {}): Promise<FakeHermes> {
  const key = options.key ?? 'cle-de-test-hermes-0123456789'
  let sequence = 0
  const state: Omit<FakeHermes, 'url' | 'close'> = {
    key,
    requests: [],
    sessions: [],
    messages: new Map(),
    runs: new Map(),
    nextRunEvents: [],
    health: {
      status: 'ok',
      platform: 'hermes-agent',
      version: '0.17.0',
      gateway_state: 'running',
      platforms: {},
      active_agents: 0,
      updated_at: new Date().toISOString(),
      pid: 1,
    },
    failNext: null,
  }

  const server: Server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://fake')
    const path = url.pathname
    const body = await readBody(request)
    const authorized = request.headers.authorization === `Bearer ${key}`
    state.requests.push({ method: request.method ?? 'GET', path: `${path}${url.search}`, authorized, body })

    if (state.failNext && state.failNext.times > 0) {
      state.failNext.times--
      return json(response, state.failNext.status, state.failNext.body ?? {})
    }

    if (path === '/health') return json(response, 200, { status: 'ok', platform: 'hermes-agent', version: state.health.version })
    if (path === '/health/detailed') return json(response, 200, state.health)
    if (!authorized) return json(response, 401, openAiError('Invalid API key', 'invalid_api_key'))

    if (path === '/v1/capabilities') {
      return json(response, 200, {
        object: 'hermes.api_server.capabilities',
        platform: 'hermes-agent',
        model: options.model ?? 'jarvis',
        auth: { type: 'bearer', required: true },
        features: { run_submission: true, run_events_sse: true, run_stop: true, run_approval_response: true, session_resources: true },
      })
    }
    if (path === '/api/sessions' && request.method === 'GET') {
      const limit = Number(url.searchParams.get('limit') ?? 50)
      return json(response, 200, { object: 'list', data: state.sessions.slice(0, limit), limit, offset: 0, has_more: false })
    }
    if (path === '/api/sessions' && request.method === 'POST') {
      const id = `api_${++sequence}`
      const session = {
        id,
        source: 'api_server',
        model: options.model ?? 'jarvis',
        title: (body as { title?: string } | undefined)?.title ?? null,
        started_at: Date.now() / 1000,
        message_count: 0,
        has_system_prompt: false,
        has_model_config: false,
      }
      state.sessions.unshift(session)
      state.messages.set(id, [])
      return json(response, 201, { object: 'hermes.session', session })
    }
    const sessionMatch = path.match(/^\/api\/sessions\/([^/]+)(\/messages)?$/)
    if (sessionMatch) {
      const id = decodeURIComponent(sessionMatch[1]!)
      const session = state.sessions.find((candidate) => candidate.id === id)
      if (!session) return json(response, 404, openAiError(`Session not found: ${id}`, 'session_not_found'))
      if (sessionMatch[2]) return json(response, 200, { object: 'list', session_id: id, data: state.messages.get(id) ?? [] })
      return json(response, 200, { object: 'hermes.session', session })
    }
    if (path === '/v1/runs' && request.method === 'POST') {
      const input = (body as { input?: unknown } | undefined)?.input
      if (!input) return json(response, 400, openAiError("Missing 'input' field", 'invalid_request'))
      const runId = `run_${++sequence}`
      state.runs.set(runId, { object: 'hermes.run', run_id: runId, status: 'running', updated_at: Date.now() / 1000 })
      return json(response, 202, { run_id: runId, status: 'started' })
    }
    const runMatch = path.match(/^\/v1\/runs\/([^/]+)(?:\/(events|stop|approval))?$/)
    if (runMatch) {
      const runId = decodeURIComponent(runMatch[1]!)
      const run = state.runs.get(runId)
      if (!run) return json(response, 404, openAiError(`Run not found: ${runId}`, 'run_not_found'))
      if (!runMatch[2]) return json(response, 200, run)
      if (runMatch[2] === 'stop') {
        run.status = 'cancelled'
        return json(response, 200, { object: 'hermes.run', run_id: runId, status: 'stopping' })
      }
      if (runMatch[2] === 'approval') {
        const choice = (body as { choice?: string } | undefined)?.choice
        if (!['once', 'session', 'always', 'deny'].includes(choice ?? '')) {
          return json(response, 400, openAiError('Invalid approval choice', 'invalid_approval_choice'))
        }
        return json(response, 200, { object: 'hermes.run.approval_response', run_id: runId, choice, resolved: 1 })
      }
      response.writeHead(200, { 'Content-Type': 'text/event-stream' })
      response.write(': keepalive\n\n')
      for (const event of state.nextRunEvents) {
        response.write(`data: ${JSON.stringify({ run_id: runId, timestamp: Date.now() / 1000, ...event })}\n\n`)
        if (event.event === 'run.completed') {
          run.status = 'completed'
          run.output = event.output
        }
        if (event.event === 'run.failed') {
          run.status = 'failed'
          run.error = event.error
        }
      }
      response.end(': stream closed\n\n')
      return undefined
    }
    if (path === '/api/jobs') {
      return json(response, 200, { jobs: [{ id: 'job1', name: 'Veille', enabled: true, next_run_at: null, last_run_at: null, last_status: 'ok' }] })
    }
    return json(response, 404, openAiError('Not found', 'not_found'))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return Object.assign(state, {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => {
      server.closeAllConnections()
      server.close(() => resolve())
    }),
  })
}
