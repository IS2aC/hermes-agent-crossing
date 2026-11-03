import { Router } from 'express'
import { z } from 'zod'
import type { CharacterId } from '../../src/domain/agents'
import type { ActivityEvent, EventFilter, LocalTask } from '../../src/domain/activity'
import { sendStoreError } from '../registry/routes'
import type { Store } from '../storage/store'
import type { EventBus } from './bus'

const eventQuery = z.object({
  agentId: z.string().max(64).optional(),
  provenance: z.enum(['hermes', 'application', 'simulation']).optional(),
  before: z.string().datetime().optional(),
  taskId: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

const taskCreate = z.object({
  title: z.string().trim().min(1).max(200),
  details: z.string().trim().max(5_000).nullish(),
  assigneeId: z.string().max(64).nullish(),
})

const taskUpdate = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  details: z.string().trim().max(5_000).nullable().optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  assigneeId: z.string().max(64).nullable().optional(),
})

const STATUS_LABELS: Record<LocalTask['status'], string> = { todo: 'À faire', 'in-progress': 'En cours', done: 'Terminée' }

function taskEvent(task: LocalTask, type: string, summary: string): ActivityEvent {
  const occurredAt = new Date().toISOString()
  return {
    id: `task:${task.id}:${type}:${occurredAt}:${Math.random().toString(36).slice(2)}`,
    provenance: 'application',
    confidence: { level: 'confirmed' },
    occurredAt,
    type,
    agentId: null,
    sessionId: null,
    runId: task.id,
    summary,
  }
}

export function eventRoutes(store: Store, bus: EventBus): Router {
  const router = Router()

  router.get('/events', async (request, response, next) => {
    const parsed = eventQuery.safeParse(request.query)
    if (!parsed.success) {
      response.status(400).json({ error: 'Filtre invalide' })
      return
    }
    try {
      const { agentId, provenance, before, taskId, limit } = parsed.data
      const filter: EventFilter = { limit }
      if (agentId) filter.agentId = agentId
      if (provenance) filter.provenance = provenance
      if (before) filter.before = before
      if (taskId) filter.taskId = taskId
      response.json(await store.listEvents(filter))
    } catch (error) {
      next(error)
    }
  })

  router.get('/events/stream', (_request, response) => {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    })
    response.write(': connecté\n\n')
    const unsubscribe = bus.subscribe((event) => response.write(`data: ${JSON.stringify(event)}\n\n`))
    const keepalive = setInterval(() => response.write(': keepalive\n\n'), 15_000)
    response.on('close', () => {
      clearInterval(keepalive)
      unsubscribe()
    })
  })

  router.get('/tasks', async (_request, response, next) => {
    try {
      response.json(await store.listTasks())
    } catch (error) {
      next(error)
    }
  })

  router.post('/tasks', async (request, response, next) => {
    const parsed = taskCreate.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: 'Titre requis (200 caractères au plus)' })
      return
    }
    try {
      const task = await store.createTask({
        title: parsed.data.title,
        details: parsed.data.details ?? null,
        assigneeId: (parsed.data.assigneeId ?? null) as CharacterId | null,
      })
      await bus.publish(taskEvent(task, 'task.created', `Tâche créée : ${task.title}`))
      response.status(201).json(task)
    } catch (error) {
      next(error)
    }
  })

  router.patch('/tasks/:id', async (request, response, next) => {
    const parsed = taskUpdate.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: 'Modification invalide' })
      return
    }
    try {
      const update: Parameters<Store['updateTask']>[1] = {}
      if (parsed.data.title !== undefined) update.title = parsed.data.title
      if (parsed.data.details !== undefined) update.details = parsed.data.details
      if (parsed.data.status !== undefined) update.status = parsed.data.status
      if (parsed.data.assigneeId !== undefined) update.assigneeId = parsed.data.assigneeId as CharacterId | null
      const task = await store.updateTask(request.params.id, update)
      const summary = parsed.data.status ? `Tâche ${STATUS_LABELS[parsed.data.status].toLowerCase()} : ${task.title}` : `Tâche modifiée : ${task.title}`
      await bus.publish(taskEvent(task, 'task.updated', summary))
      response.json(task)
    } catch (error) {
      try {
        sendStoreError(error, response)
      } catch (other) {
        next(other)
      }
    }
  })

  router.delete('/tasks/:id', async (request, response, next) => {
    try {
      await store.deleteTask(request.params.id)
      response.status(204).end()
    } catch (error) {
      try {
        sendStoreError(error, response)
      } catch (other) {
        next(other)
      }
    }
  })

  return router
}
