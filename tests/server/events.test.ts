import { newDb } from 'pg-mem'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { mergeEvents, type ActivityEvent } from '../../src/domain/activity'
import type { AgentId, CharacterId, SessionId } from '../../src/domain/agents'
import type { SessionSummary } from '../../src/domain/platform'
import { MockPlatform } from '../../server/adapters/mock/platform'
import type { AppConfig } from '../../server/config'
import { EventBus } from '../../server/events/bus'
import { ActivityObserver, runEventToActivity } from '../../server/events/observer'
import { eventRoutes } from '../../server/events/routes'
import { createApp } from '../../server/http/app'
import { SessionStore } from '../../server/http/auth'
import { PostgresStore, type SqlPool } from '../../server/storage/postgres'
import { MemoryStore, NotFoundError, type Store } from '../../server/storage/store'

const ORIGIN = 'http://office.test'
const AGENT = 'demo-jarvis' as AgentId

function event(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: 'e1',
    provenance: 'hermes',
    confidence: { level: 'confirmed' },
    occurredAt: '2026-11-03T10:00:00.000Z',
    type: 'tool.started',
    agentId: 'a' as AgentId,
    sessionId: null,
    runId: null,
    summary: 'x',
    ...overrides,
  }
}

function postgres() {
  return new PostgresStore(new (newDb().adapters.createPg().Pool)() as unknown as SqlPool)
}

describe('fusion côté interface', () => {
  it('trie du plus récent au plus ancien, sans doublon', () => {
    const merged = mergeEvents(
      [event({ id: 'a', occurredAt: '2026-01-01T00:00:00.000Z' })],
      [event({ id: 'b', occurredAt: '2026-01-02T00:00:00.000Z' }), event({ id: 'a', occurredAt: '2026-01-01T00:00:00.000Z' })],
    )
    expect(merged.map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('range un événement tardif à sa place', () => {
    const merged = mergeEvents(
      [event({ id: 'recent', occurredAt: '2026-01-03T00:00:00.000Z' })],
      [event({ id: 'tardif', occurredAt: '2026-01-01T00:00:00.000Z' })],
    )
    expect(merged.map((item) => item.id)).toEqual(['recent', 'tardif'])
  })

  it('borne la taille conservée', () => {
    const many = Array.from({ length: 10 }, (_, index) => event({ id: String(index) }))
    expect(mergeEvents([], many, 3)).toHaveLength(3)
  })
})

describe.each([
  ['mémoire', () => new MemoryStore() as Store],
  ['PostgreSQL (simulé par pg-mem)', () => postgres() as Store],
])('journal et tâches, stockage %s', (_label, create) => {
  let store: Store

  beforeEach(async () => {
    store = create()
    await store.migrate()
  })

  it('n\'enregistre pas deux fois le même événement', async () => {
    expect(await store.addEvent(event())).toBe(true)
    expect(await store.addEvent(event())).toBe(false)
    expect(await store.listEvents({ limit: 10 })).toHaveLength(1)
  })

  it('restitue fidèlement un événement, confiance comprise', async () => {
    const original = event({ confidence: { level: 'inferred', rule: 'ma règle' }, sessionId: 's' as SessionId, runId: 'r' })
    await store.addEvent(original)
    expect((await store.listEvents({ limit: 1 }))[0]).toEqual(original)
  })

  it('trie, filtre et pagine', async () => {
    await store.addEvent(event({ id: 'a', occurredAt: '2026-01-01T00:00:00.000Z', provenance: 'application', agentId: null }))
    await store.addEvent(event({ id: 'b', occurredAt: '2026-01-02T00:00:00.000Z' }))
    await store.addEvent(event({ id: 'c', occurredAt: '2026-01-03T00:00:00.000Z', agentId: 'z' as AgentId }))
    const ids = (events: ActivityEvent[]) => events.map((item) => item.id)
    expect(ids(await store.listEvents({ limit: 10 }))).toEqual(['c', 'b', 'a'])
    expect(ids(await store.listEvents({ limit: 1 }))).toEqual(['c'])
    expect(ids(await store.listEvents({ limit: 10, before: '2026-01-03T00:00:00.000Z' }))).toEqual(['b', 'a'])
    expect(ids(await store.listEvents({ limit: 10, provenance: 'application' }))).toEqual(['a'])
    expect(ids(await store.listEvents({ limit: 10, agentId: 'z' }))).toEqual(['c'])
  })

  it('supprime seulement ce qui dépasse la rétention', async () => {
    await store.addEvent(event({ id: 'vieux', occurredAt: '2020-01-01T00:00:00.000Z' }))
    await store.addEvent(event({ id: 'recent', occurredAt: '2026-01-01T00:00:00.000Z' }))
    await store.purgeEventsBefore('2025-01-01T00:00:00.000Z')
    expect((await store.listEvents({ limit: 10 })).map((item) => item.id)).toEqual(['recent'])
  })

  it('crée, modifie et supprime une tâche, toujours en provenance application', async () => {
    const task = await store.createTask({ title: 'Relire', details: null, assigneeId: null })
    expect(task).toMatchObject({ provenance: 'application', status: 'todo', title: 'Relire' })
    const updated = await store.updateTask(task.id, { status: 'done', assigneeId: 'jarvis' as CharacterId })
    expect(updated).toMatchObject({ status: 'done', assigneeId: 'jarvis' })
    expect(await store.listTasks()).toHaveLength(1)
    await store.deleteTask(task.id)
    expect(await store.listTasks()).toEqual([])
  })

  it('signale une tâche inconnue', async () => {
    await expect(store.updateTask('absente', {})).rejects.toBeInstanceOf(NotFoundError)
    await expect(store.deleteTask('absente')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('bus d\'événements', () => {
  it('diffuse une seule fois un événement répété', async () => {
    const store = new MemoryStore()
    const bus = new EventBus(store)
    const seen: string[] = []
    bus.subscribe((item) => seen.push(item.id))
    expect(await bus.publish(event())).toBe(true)
    expect(await bus.publish(event())).toBe(false)
    expect(seen).toEqual(['e1'])
  })

  it('ne rediffuse pas un événement déjà en base, même après un redémarrage', async () => {
    const store = new MemoryStore()
    await new EventBus(store).publish(event())
    const seen: string[] = []
    const restarted = new EventBus(store)
    restarted.subscribe((item) => seen.push(item.id))
    expect(await restarted.publish(event())).toBe(false)
    expect(seen).toEqual([])
  })

  it('arrête de notifier après le désabonnement', async () => {
    const bus = new EventBus(new MemoryStore())
    const seen: string[] = []
    const unsubscribe = bus.subscribe((item) => seen.push(item.id))
    unsubscribe()
    await bus.publish(event())
    expect(seen).toEqual([])
  })
})

describe('traduction d\'un run en journal', () => {
  const translate = (input: Parameters<typeof runEventToActivity>[4]) =>
    runEventToActivity(AGENT, 's' as SessionId, 'r', 3, input, 'hermes', '2026-11-03T10:00:00.000Z')

  it('ne copie pas le texte de la réponse dans le journal', () => {
    expect(translate({ type: 'message.delta', delta: 'secret' })).toBeNull()
    expect(JSON.stringify(translate({ type: 'run.completed', output: 'secret' }))).not.toContain('secret')
    expect(JSON.stringify(translate({ type: 'run.failed', error: 'secret' }))).not.toContain('secret')
    expect(JSON.stringify(translate({ type: 'tool.started', tool: 'bash', preview: 'secret' }))).not.toContain('secret')
    expect(JSON.stringify(translate({ type: 'approval.request', command: 'secret', description: 'secret' }))).not.toContain('secret')
  })

  it('produit un identifiant stable, et conserve le type de la source', () => {
    expect(translate({ type: 'run.cancelled' })).toMatchObject({ id: 'run:r:3', type: 'run.cancelled', runId: 'r', confidence: { level: 'confirmed' } })
  })
})

describe('observation de l\'activité hors du bureau', () => {
  const NOW = Date.parse('2026-11-03T10:00:00.000Z')

  class ScriptedPlatform extends MockPlatform {
    sessionsScript: SessionSummary[] = []
    failing = false
    jobsScript: { id: string; name: string | null; enabled: boolean | null; nextRunAt: null; lastRunAt: string | null; lastStatus: string | null }[] = []
    override async listAgents() {
      const agents = await super.listAgents()
      if (agents.status !== 'available') return agents
      return { status: 'available' as const, value: agents.value.slice(0, 1) }
    }
    override async listSessions() {
      return this.failing
        ? { status: 'unavailable' as const, reason: 'panne' }
        : { status: 'available' as const, value: this.sessionsScript }
    }
    override async listJobs() {
      return { status: 'available' as const, value: this.jobsScript }
    }
  }

  const session = (overrides: Partial<SessionSummary> = {}): SessionSummary => ({
    id: 'tg1' as SessionId,
    source: 'telegram',
    title: null,
    model: null,
    startedAt: null,
    lastActiveAt: '2026-11-03T09:00:00.000Z',
    endedAt: null,
    messageCount: 2,
    toolCallCount: 0,
    preview: null,
    ...overrides,
  })

  function setup() {
    const platform = new ScriptedPlatform(1)
    const store = new MemoryStore()
    const observer = new ActivityObserver(platform, new EventBus(store), { now: () => NOW })
    return { platform, store, observer }
  }

  it('ne présente pas l\'historique existant comme une activité récente', async () => {
    const { platform, store, observer } = setup()
    platform.sessionsScript = [session()]
    await observer.poll()
    expect(await store.listEvents({ limit: 10 })).toEqual([])
  })

  it('détecte qu\'une session Telegram a avancé, en le marquant comme déduit', async () => {
    const { platform, store, observer } = setup()
    platform.sessionsScript = [session()]
    await observer.poll()
    platform.sessionsScript = [session({ messageCount: 4, lastActiveAt: '2026-11-03T09:59:00.000Z' })]
    await observer.poll()
    const [activity] = await store.listEvents({ limit: 10 })
    expect(activity).toMatchObject({
      type: 'session.activity',
      provenance: 'simulation',
      agentId: 'demo-jarvis',
      sessionId: 'tg1',
      confidence: { level: 'inferred' },
      occurredAt: '2026-11-03T09:59:00.000Z',
    })
    expect(activity?.summary).toContain('telegram')
  })

  it('n\'invente rien quand rien ne change', async () => {
    const { platform, store, observer } = setup()
    platform.sessionsScript = [session()]
    await observer.poll()
    await observer.poll()
    await observer.poll()
    expect(await store.listEvents({ limit: 10 })).toEqual([])
  })

  it('ne double pas les sessions déjà suivies par leur run', async () => {
    const { platform, store, observer } = setup()
    platform.sessionsScript = [session({ source: 'api_server' })]
    await observer.poll()
    platform.sessionsScript = [session({ source: 'api_server', messageCount: 9 })]
    await observer.poll()
    expect(await store.listEvents({ limit: 10 })).toEqual([])
  })

  it('signale le résultat d\'une tâche planifiée', async () => {
    const { platform, store, observer } = setup()
    platform.jobsScript = [{ id: 'j', name: 'Veille', enabled: true, nextRunAt: null, lastRunAt: '2026-11-03T08:00:00.000Z', lastStatus: 'ok' }]
    await observer.poll()
    platform.jobsScript = [{ id: 'j', name: 'Veille', enabled: true, nextRunAt: null, lastRunAt: '2026-11-03T09:00:00.000Z', lastStatus: 'error' }]
    await observer.poll()
    const [activity] = await store.listEvents({ limit: 10 })
    expect(activity).toMatchObject({ type: 'job.run', occurredAt: '2026-11-03T09:00:00.000Z' })
    expect(activity?.summary).toContain('error')
  })

  it('signale une seule fois un trou dans l\'observation, puis la reprise', async () => {
    const { platform, store, observer } = setup()
    await observer.poll()
    platform.failing = true
    await observer.poll()
    await observer.poll()
    expect((await store.listEvents({ limit: 10 })).map((item) => item.type)).toEqual(['observer.interrupted'])
    platform.failing = false
    await observer.poll()
    const types = (await store.listEvents({ limit: 10 })).map((item) => item.type).sort()
    expect(types).toEqual(['observer.interrupted', 'observer.resumed'])
    const [first] = await store.listEvents({ limit: 1, provenance: 'application' })
    expect(first?.provenance).toBe('application')
  })
})

describe('API du journal et des tâches', () => {
  const config: AppConfig = {
    production: false, host: '127.0.0.1', port: 0, mode: 'mock', profiles: [], databaseUrl: null,
    passwordHash: null, allowedOrigins: [ORIGIN], secureCookies: false, sessionTtlMs: 60_000,
  }
  let store: MemoryStore
  let app: ReturnType<typeof createApp>

  beforeEach(async () => {
    store = new MemoryStore()
    await store.migrate()
    app = createApp({ config, platform: new MockPlatform(1), sessions: new SessionStore(60_000), routes: [eventRoutes(store, new EventBus(store))] })
  })

  it('valide les filtres', async () => {
    await request(app).get('/api/events?limit=9999').expect(400)
    await request(app).get('/api/events?provenance=autre').expect(400)
    await request(app).get('/api/events?before=hier').expect(400)
    await request(app).get('/api/events').expect(200)
  })

  it('garde la trace de chaque changement, en provenance application', async () => {
    const created = await request(app).post('/api/tasks').set('Origin', ORIGIN).send({ title: ' Relire ' }).expect(201)
    expect(created.body).toMatchObject({ title: 'Relire', provenance: 'application', status: 'todo' })
    const id = created.body.id as string
    await request(app).patch(`/api/tasks/${id}`).set('Origin', ORIGIN).send({ status: 'done' }).expect(200)
    const history = await request(app).get(`/api/events?taskId=${id}`).expect(200)
    expect(history.body).toHaveLength(2)
    expect(history.body.every((item: ActivityEvent) => item.provenance === 'application')).toBe(true)
    expect(history.body.map((item: ActivityEvent) => item.summary)).toContain('Tâche terminée : Relire')
  })

  it('valide les tâches', async () => {
    await request(app).post('/api/tasks').set('Origin', ORIGIN).send({ title: '' }).expect(400)
    await request(app).patch('/api/tasks/absente').set('Origin', ORIGIN).send({ status: 'done' }).expect(404)
    await request(app).delete('/api/tasks/absente').set('Origin', ORIGIN).expect(404)
    const created = await request(app).post('/api/tasks').set('Origin', ORIGIN).send({ title: 'x' }).expect(201)
    await request(app).patch(`/api/tasks/${created.body.id as string}`).set('Origin', ORIGIN).send({ status: 'bof' }).expect(400)
  })
})
