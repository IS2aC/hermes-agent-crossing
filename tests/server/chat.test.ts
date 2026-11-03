import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AgentId, SessionId } from '../../src/domain/agents'
import { applyRunEvent, createTurn, isTerminal, toRunHistory, type SequencedRunEvent } from '../../src/domain/chat'
import type { AgentPlatform, RunEvent } from '../../src/domain/platform'
import { HermesPlatform } from '../../server/adapters/hermes/platform'
import { MockPlatform } from '../../server/adapters/mock/platform'
import { chatRoutes } from '../../server/chat/routes'
import { RunTracker } from '../../server/chat/runs'
import type { AppConfig } from '../../server/config'
import { createApp } from '../../server/http/app'
import { RateLimiter, SessionStore } from '../../server/http/auth'
import { startFakeHermes, type FakeHermes } from '../fixtures/fakeHermes'

const ORIGIN = 'http://office.test'
const JARVIS = 'jarvis' as AgentId
const config: AppConfig = {
  production: false, host: '127.0.0.1', port: 0, mode: 'mock', profiles: [], databaseUrl: null,
  passwordHash: null, allowedOrigins: [ORIGIN], secureCookies: false, sessionTtlMs: 60_000,
}

function build(platform: AgentPlatform, tracker = new RunTracker(platform, { pollMs: 1 }), limiter?: RateLimiter) {
  return {
    tracker,
    app: createApp({ config, platform, sessions: new SessionStore(60_000), routes: [chatRoutes(platform, tracker, limiter)] }),
  }
}

const seq = (n: number, event: RunEvent): SequencedRunEvent => ({ seq: n, event })

describe('état d\'un tour', () => {
  it('compose la réponse et suit les outils', () => {
    let turn = createTurn('r')
    turn = applyRunEvent(turn, seq(1, { type: 'tool.started', tool: 'bash', preview: null }))
    expect(turn.tools).toEqual([{ name: 'bash', state: 'running' }])
    turn = applyRunEvent(turn, seq(2, { type: 'tool.completed', tool: 'bash', failed: true }))
    expect(turn.tools).toEqual([{ name: 'bash', state: 'failed' }])
    turn = applyRunEvent(turn, seq(3, { type: 'message.delta', delta: 'Sa' }))
    turn = applyRunEvent(turn, seq(4, { type: 'message.delta', delta: 'lut' }))
    expect(turn.text).toBe('Salut')
    expect(isTerminal(turn.status)).toBe(false)
  })

  it('ignore un événement rejoué après une reconnexion', () => {
    let turn = createTurn('r')
    turn = applyRunEvent(turn, seq(1, { type: 'message.delta', delta: 'a' }))
    turn = applyRunEvent(turn, seq(1, { type: 'message.delta', delta: 'a' }))
    expect(turn.text).toBe('a')
  })

  it('n\'affiche jamais de succès en cas d\'échec', () => {
    const turn = applyRunEvent(createTurn('r'), seq(1, { type: 'run.failed', error: 'non' }))
    expect(turn).toMatchObject({ status: 'failed', error: 'non' })
    expect(isTerminal(turn.status)).toBe(true)
  })

  it('reprend le texte final s\'il n\'y a pas eu de flux', () => {
    expect(applyRunEvent(createTurn('r'), seq(1, { type: 'run.completed', output: 'fin' })).text).toBe('fin')
  })

  it('garde le texte reçu si le résultat final est vide', () => {
    let turn = applyRunEvent(createTurn('r'), seq(1, { type: 'message.delta', delta: 'partiel' }))
    turn = applyRunEvent(turn, seq(2, { type: 'run.completed', output: '' }))
    expect(turn.text).toBe('partiel')
  })

  it('suit une demande d\'autorisation', () => {
    let turn = applyRunEvent(createTurn('r'), seq(1, { type: 'approval.request', command: 'rm', description: 'd' }))
    expect(turn).toMatchObject({ status: 'waiting', approval: { command: 'rm' } })
    turn = applyRunEvent(turn, seq(2, { type: 'approval.responded', choice: 'deny' }))
    expect(turn).toMatchObject({ status: 'running', approval: null })
  })
})

describe('historique transmis', () => {
  it('ne garde que les échanges visibles', () => {
    const message = (role: string, content: string) => ({ id: role, role, content, toolName: null, at: null })
    expect(toRunHistory([message('system', 's'), message('user', 'q'), message('tool', 't'), message('assistant', ''), message('assistant', 'r')])).toEqual([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'r' },
    ])
  })
})

describe('suivi d\'un run', () => {
  let hermes: FakeHermes
  let platform: HermesPlatform

  beforeEach(async () => {
    hermes = await startFakeHermes()
    platform = new HermesPlatform([{ id: 'jarvis', name: 'JARVIS', baseUrl: hermes.url, apiKey: hermes.key }], { retryDelayMs: 1 })
  })
  afterEach(() => hermes.close())

  it('numérote les événements et s\'arrête à la fin', async () => {
    hermes.runs.set('r1', { run_id: 'r1', status: 'running' })
    hermes.nextRunEvents = [{ event: 'message.delta', delta: 'x' }, { event: 'run.completed', output: 'x' }]
    const tracker = new RunTracker(platform, { pollMs: 1 })
    const run = tracker.track(JARVIS, 's' as SessionId, 'r1')
    await tracker.finished(run)
    expect(run.events.map((event) => [event.seq, event.event.type])).toEqual([[1, 'message.delta'], [2, 'run.completed']])
    expect(run.outcomeUnknown).toBe(false)
  })

  it('consulte l\'état final si le flux se coupe sans annoncer la fin', async () => {
    hermes.runs.set('r1', { run_id: 'r1', status: 'completed', output: 'lu après coupure' })
    hermes.nextRunEvents = [{ event: 'message.delta', delta: 'x' }]
    const tracker = new RunTracker(platform, { pollMs: 1 })
    const run = tracker.track(JARVIS, 's' as SessionId, 'r1')
    await tracker.finished(run)
    expect(run.events.at(-1)?.event).toEqual({ type: 'run.completed', output: 'lu après coupure' })
  })

  it('rapporte un échec lu après une coupure', async () => {
    hermes.runs.set('r1', { run_id: 'r1', status: 'failed', error: 'panne agent' })
    const tracker = new RunTracker(platform, { pollMs: 1 })
    const run = tracker.track(JARVIS, 's' as SessionId, 'r1')
    await tracker.finished(run)
    expect(run.events.at(-1)?.event).toEqual({ type: 'run.failed', error: 'panne agent' })
  })

  it('annonce un résultat inconnu si le run a disparu, sans inventer de réussite', async () => {
    const tracker = new RunTracker(platform, { pollMs: 1 })
    const run = tracker.track(JARVIS, 's' as SessionId, 'disparu')
    await tracker.finished(run)
    expect(run.outcomeUnknown).toBe(true)
    expect(run.events.at(-1)?.event).toMatchObject({ type: 'run.failed', error: expect.stringContaining('Résultat inconnu') })
  })

  it('renonce au bout du nombre maximal de lectures', async () => {
    hermes.runs.set('r1', { run_id: 'r1', status: 'running' })
    const tracker = new RunTracker(platform, { pollMs: 1, maxPolls: 2 })
    const run = tracker.track(JARVIS, 's' as SessionId, 'r1')
    await tracker.finished(run)
    expect(run.outcomeUnknown).toBe(true)
  })

  it('ignore tout événement après la fin', async () => {
    hermes.runs.set('r1', { run_id: 'r1', status: 'running' })
    hermes.nextRunEvents = [{ event: 'run.completed', output: 'x' }, { event: 'message.delta', delta: 'tard' }]
    const tracker = new RunTracker(platform, { pollMs: 1 })
    const run = tracker.track(JARVIS, 's' as SessionId, 'r1')
    await tracker.finished(run)
    expect(run.events).toHaveLength(1)
  })
})

describe('API du chat sur Hermes', () => {
  let hermes: FakeHermes
  let app: ReturnType<typeof build>['app']
  let tracker: RunTracker

  beforeEach(async () => {
    hermes = await startFakeHermes()
    const platform = new HermesPlatform([{ id: 'jarvis', name: 'JARVIS', baseUrl: hermes.url, apiKey: hermes.key }], { retryDelayMs: 1 })
    ;({ app, tracker } = build(platform))
    hermes.sessions.push({ id: 'tg', source: 'telegram', title: 'Telegram' })
    hermes.messages.set('tg', [{ id: 1, role: 'user', content: 'privé' }])
  })
  afterEach(() => {
    tracker.stopAll()
    return hermes.close()
  })

  const post = (path: string, body: unknown) => request(app).post(path).set('Origin', ORIGIN).send(body as object)

  it('marque chaque session comme modifiable ou non', async () => {
    await post('/api/agents/jarvis/sessions', { title: 'Essai' }).expect(201)
    const { body } = await request(app).get('/api/agents/jarvis/sessions').expect(200)
    expect(body.map((session: { source: string; writable: boolean }) => [session.source, session.writable])).toEqual([
      ['api_server', true],
      ['telegram', false],
    ])
  })

  it('refuse d\'écrire dans une session Telegram, sans contacter l\'agent', async () => {
    await post('/api/agents/jarvis/sessions/tg/runs', { input: 'intrus' }).expect(403)
    expect(hermes.requests.some((call) => call.path === '/v1/runs')).toBe(false)
  })

  it('permet de lire une session Telegram', async () => {
    const { body } = await request(app).get('/api/agents/jarvis/sessions/tg/messages').expect(200)
    expect(body[0]).toMatchObject({ role: 'user', content: 'privé' })
  })

  it('renvoie l\'historique à Hermes, et le flux au navigateur', async () => {
    const created = await post('/api/agents/jarvis/sessions', {}).expect(201)
    const id = created.body.id as string
    hermes.messages.set(id, [
      { id: 1, role: 'user', content: 'avant' },
      { id: 2, role: 'tool', content: 'sortie' },
    ])
    hermes.nextRunEvents = [{ event: 'message.delta', delta: 'Salut' }, { event: 'run.completed', output: 'Salut' }]
    const started = await post(`/api/agents/jarvis/sessions/${id}/runs`, { input: 'après' }).expect(202)
    const runCall = hermes.requests.find((call) => call.path === '/v1/runs')
    expect(runCall?.body).toEqual({ input: 'après', session_id: id, conversation_history: [{ role: 'user', content: 'avant' }] })

    const run = tracker.get(started.body.runId as string)!
    await tracker.finished(run)
    const stream = await request(app).get(`/api/agents/jarvis/runs/${run.runId}/events`).expect(200)
    expect(stream.headers['content-type']).toContain('text/event-stream')
    expect(stream.text).toContain('id: 1\n')
    expect(stream.text).toContain('"run.completed"')

    const resumed = await request(app).get(`/api/agents/jarvis/runs/${run.runId}/events`).set('Last-Event-ID', '1').expect(200)
    expect(resumed.text).not.toContain('id: 1\n')
    expect(resumed.text).toContain('id: 2\n')
  })

  it('n\'envoie rien si l\'historique est indisponible', async () => {
    const created = await post('/api/agents/jarvis/sessions', {}).expect(201)
    const failing = new HermesPlatform([{ id: 'jarvis', name: 'JARVIS', baseUrl: hermes.url, apiKey: hermes.key }], { retryDelayMs: 1 })
    failing.listMessages = async () => ({ status: 'unavailable', reason: 'panne' })
    const local = build(failing)
    await request(local.app).post(`/api/agents/jarvis/sessions/${created.body.id as string}/runs`).set('Origin', ORIGIN).send({ input: 'x' }).expect(502)
    expect(hermes.requests.some((call) => call.path === '/v1/runs')).toBe(false)
  })

  it('remonte le refus de Hermes, sans faux succès', async () => {
    const created = await post('/api/agents/jarvis/sessions', {}).expect(201)
    const failing = new HermesPlatform([{ id: 'jarvis', name: 'JARVIS', baseUrl: hermes.url, apiKey: hermes.key }], { retryDelayMs: 1 })
    failing.startRun = async () => ({ status: 'unavailable', reason: 'Too many concurrent runs (max 10)' })
    const local = build(failing)
    const response = await request(local.app).post(`/api/agents/jarvis/sessions/${created.body.id as string}/runs`).set('Origin', ORIGIN).send({ input: 'x' }).expect(502)
    expect(response.body.error).toContain('Too many concurrent runs')
  })

  it('valide le message et limite le débit', async () => {
    const created = await post('/api/agents/jarvis/sessions', {}).expect(201)
    const path = `/api/agents/jarvis/sessions/${created.body.id as string}/runs`
    await post(path, { input: '   ' }).expect(400)
    await post(path, { input: 'x'.repeat(20_001) }).expect(400)
    await post(path, {}).expect(400)
    const platform = new HermesPlatform([{ id: 'jarvis', name: 'JARVIS', baseUrl: hermes.url, apiKey: hermes.key }], { retryDelayMs: 1 })
    const local = build(platform, undefined, new RateLimiter(1, 60_000))
    hermes.nextRunEvents = [{ event: 'run.completed', output: 'x' }]
    await request(local.app).post(path).set('Origin', ORIGIN).send({ input: 'a' }).expect(202)
    await request(local.app).post(path).set('Origin', ORIGIN).send({ input: 'b' }).expect(429)
    local.tracker.stopAll()
  })

  it('n\'accepte que once ou deny : pas d\'autorisation durable', async () => {
    const created = await post('/api/agents/jarvis/sessions', {}).expect(201)
    hermes.nextRunEvents = [{ event: 'run.completed', output: 'x' }]
    const { body } = await post(`/api/agents/jarvis/sessions/${created.body.id as string}/runs`, { input: 'a' }).expect(202)
    const path = `/api/agents/jarvis/runs/${body.runId as string}/approval`
    await post(path, { choice: 'always' }).expect(400)
    await post(path, { choice: 'session' }).expect(400)
    await post(path, { choice: 'deny' }).expect(200)
    expect(hermes.requests.at(-1)).toMatchObject({ path: `/v1/runs/${body.runId as string}/approval`, body: { choice: 'deny' } })
  })

  it('transmet un arrêt à Hermes', async () => {
    const created = await post('/api/agents/jarvis/sessions', {}).expect(201)
    hermes.nextRunEvents = [{ event: 'run.completed', output: 'x' }]
    const { body } = await post(`/api/agents/jarvis/sessions/${created.body.id as string}/runs`, { input: 'a' }).expect(202)
    await post(`/api/agents/jarvis/runs/${body.runId as string}/stop`, {}).expect(200)
    expect(hermes.requests.at(-1)?.path).toBe(`/v1/runs/${body.runId as string}/stop`)
  })

  it('indique le run en cours, puis plus rien une fois terminé', async () => {
    await request(app).get('/api/agents/jarvis/runs/active').expect(200, 'null')
    hermes.runs.set('r1', { run_id: 'r1', status: 'running' })
    hermes.nextRunEvents = [{ event: 'message.delta', delta: 'x' }, { event: 'run.completed', output: 'x' }]
    const run = tracker.track(JARVIS, 's' as SessionId, 'r1')
    expect((await request(app).get('/api/agents/jarvis/runs/active')).body).toEqual({ runId: 'r1', sessionId: 's' })
    expect((await request(app).get('/api/agents/veilleur/runs/active')).body).toBeNull()
    await tracker.finished(run)
    expect((await request(app).get('/api/agents/jarvis/runs/active')).body).toBeNull()
  })

  it('refuse un run inconnu ou d\'un autre agent', async () => {
    await request(app).get('/api/agents/jarvis/runs/inconnu/events').expect(404)
    await post('/api/agents/jarvis/runs/inconnu/stop', {}).expect(404)
    const created = await post('/api/agents/jarvis/sessions', {}).expect(201)
    hermes.nextRunEvents = [{ event: 'run.completed', output: 'x' }]
    const { body } = await post(`/api/agents/jarvis/sessions/${created.body.id as string}/runs`, { input: 'a' }).expect(202)
    await request(app).get(`/api/agents/veilleur/runs/${body.runId as string}/events`).expect(404)
  })
})

describe('chat en mode mock', () => {
  it('simule une approbation, puis la réponse', async () => {
    const platform = new MockPlatform(1)
    const tracker = new RunTracker(platform)
    const agent = 'demo-jarvis' as AgentId
    const session = await platform.createSession(agent, null)
    if (session.status !== 'available') throw new Error('attendu')
    const started = await platform.startRun(agent, { sessionId: session.value.id, input: 'danger', history: [] })
    if (started.status !== 'available') throw new Error('attendu')
    const run = tracker.track(agent, session.value.id, started.value.runId)
    await new Promise<void>((resolve) => {
      run.listeners.add((event) => {
        if (event.event.type === 'approval.request') resolve()
      })
    })
    await platform.respondApproval(agent, run.runId, 'deny')
    await tracker.finished(run)
    expect(run.events.map((event) => event.event.type)).toContain('approval.responded')
    expect(run.events.at(-1)?.event.type).toBe('run.completed')
  })

  it('refuse un agent simulé hors ligne', async () => {
    const platform = new MockPlatform(1)
    expect(await platform.startRun('demo-hors-ligne' as AgentId, { sessionId: 's' as SessionId, input: 'x', history: [] })).toMatchObject({ status: 'unavailable' })
  })
})
