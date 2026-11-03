import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentId, SessionId } from '../../src/domain/agents'
import type { RunEvent } from '../../src/domain/platform'
import { HermesClient, HermesError } from '../../server/adapters/hermes/client'
import { deriveObservedState, HermesPlatform, toRunEvent, toSessionSummary } from '../../server/adapters/hermes/platform'
import { parseSse } from '../../server/adapters/hermes/sse'
import { loadConfig } from '../../server/config'
import { startFakeHermes, type FakeHermes } from '../fixtures/fakeHermes'

const JARVIS = 'jarvis' as AgentId

describe('parseur SSE', () => {
  async function collect(parts: string[]) {
    const encoder = new TextEncoder()
    async function* chunks() {
      for (const part of parts) yield encoder.encode(part)
    }
    const messages = []
    for await (const message of parseSse(chunks())) messages.push(message)
    return messages
  }

  it('ignore les commentaires de maintien de connexion', async () => {
    expect(await collect([': keepalive\n\n', 'data: {"a":1}\n\n', ': stream closed\n\n'])).toEqual([{ event: null, data: '{"a":1}' }])
  })

  it('recompose un message découpé entre deux paquets', async () => {
    expect(await collect(['event: to', 'ol\nda', 'ta: x\n', '\n'])).toEqual([{ event: 'tool', data: 'x' }])
  })
})

describe('contrat du client Hermes', () => {
  let hermes: FakeHermes
  let client: HermesClient

  beforeEach(async () => {
    hermes = await startFakeHermes()
    client = new HermesClient({ baseUrl: hermes.url, apiKey: hermes.key, retryDelayMs: 1 })
  })
  afterEach(() => hermes.close())

  it('envoie la clé en Bearer sur les routes protégées', async () => {
    await client.capabilities()
    expect(hermes.requests[0]).toMatchObject({ path: '/v1/capabilities', authorized: true })
  })

  it('signale une clé refusée sans la révéler', async () => {
    const wrong = new HermesClient({ baseUrl: hermes.url, apiKey: 'mauvaise-cle-secrete' })
    const error = await wrong.capabilities().catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(HermesError)
    expect(error).toMatchObject({ kind: 'unauthorized', status: 401, code: 'invalid_api_key' })
    expect(String((error as Error).message)).not.toContain('mauvaise-cle-secrete')
  })

  it('retente une lecture après une panne passagère', async () => {
    hermes.failNext = { status: 503, times: 2 }
    await expect(client.health()).resolves.toMatchObject({ status: 'ok' })
    expect(hermes.requests).toHaveLength(3)
  })

  it('abandonne une lecture après le nombre maximal d\'essais', async () => {
    hermes.failNext = { status: 503, times: 5 }
    await expect(client.health()).rejects.toMatchObject({ kind: 'server', status: 503 })
    expect(hermes.requests).toHaveLength(3)
  })

  it('ne retente jamais une écriture : elle pourrait agir deux fois', async () => {
    hermes.failNext = { status: 503, times: 5 }
    await expect(client.startRun('bonjour', 'api_1', [])).rejects.toMatchObject({ kind: 'server' })
    expect(hermes.requests).toHaveLength(1)
  })

  it('ne retente pas une erreur définitive', async () => {
    hermes.failNext = { status: 404, times: 5, body: { error: { message: 'absent', code: 'run_not_found' } } }
    await expect(client.getRun('x')).rejects.toMatchObject({ kind: 'not_found', code: 'run_not_found' })
    expect(hermes.requests).toHaveLength(1)
  })

  it('signale une réponse de format inattendu', async () => {
    hermes.failNext = { status: 200, body: { pas: 'une session' }, times: 1 }
    await expect(client.getSession('x')).rejects.toMatchObject({ kind: 'invalid_response' })
  })

  it('signale un serveur injoignable', async () => {
    const down = new HermesClient({ baseUrl: 'http://127.0.0.1:9', apiKey: 'k', retries: 0 })
    await expect(down.health()).rejects.toMatchObject({ kind: 'unreachable' })
  })

  it('applique un délai maximal', async () => {
    const slow = new HermesClient({
      baseUrl: hermes.url,
      apiKey: 'k',
      retries: 0,
      timeoutMs: 5,
      fetch: ((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(new Error('abort')))
      })) as unknown as typeof fetch,
    })
    await expect(slow.health()).rejects.toMatchObject({ kind: 'timeout' })
  })

  it('transmet l\'historique à un run, qui ne le recharge pas lui-même', async () => {
    await client.startRun('suite', 'api_1', [{ role: 'user', content: 'avant' }])
    expect(hermes.requests[0]?.body).toEqual({
      input: 'suite',
      session_id: 'api_1',
      conversation_history: [{ role: 'user', content: 'avant' }],
    })
  })

  it('rejette un choix d\'approbation invalide côté Hermes', async () => {
    const runId = await client.startRun('x', 's', [])
    await expect(client.respondApproval(runId, 'peut-etre' as 'once')).rejects.toMatchObject({ kind: 'bad_request', code: 'invalid_approval_choice' })
  })
})

describe('traduction des données Hermes', () => {
  it.each([
    [{ event: 'message.delta', delta: 'x' }, { type: 'message.delta', delta: 'x' }],
    [{ event: 'tool.started', tool: 'bash', preview: 'ls' }, { type: 'tool.started', tool: 'bash', preview: 'ls' }],
    [{ event: 'tool.completed', tool: 'bash', error: true }, { type: 'tool.completed', tool: 'bash', failed: true }],
    [{ event: 'reasoning.available', text: 'secret' }, { type: 'reasoning.available' }],
    [{ event: 'approval.request', command: 'rm', description: 'd' }, { type: 'approval.request', command: 'rm', description: 'd' }],
    [{ event: 'run.completed', output: 'ok' }, { type: 'run.completed', output: 'ok' }],
    [{ event: 'run.failed', error: 'non' }, { type: 'run.failed', error: 'non' }],
    [{ event: 'run.cancelled' }, { type: 'run.cancelled' }],
  ])('traduit %j', (input, expected) => {
    expect(toRunEvent(input)).toEqual(expected)
  })

  it('ignore un événement inconnu au lieu de l\'inventer', () => {
    expect(toRunEvent({ event: 'nouveau.type' })).toBeNull()
    expect(toRunEvent('texte')).toBeNull()
  })

  it('convertit les horodatages en secondes', () => {
    expect(toSessionSummary({ id: 'a', source: 'telegram', started_at: 1_700_000_000 })).toMatchObject({
      source: 'telegram',
      startedAt: '2023-11-14T22:13:20.000Z',
      title: null,
    })
  })
})

describe('état déduit de la santé détaillée', () => {
  const now = Date.parse('2026-11-03T10:00:00Z')
  const fresh = { status: 'ok', gateway_state: 'running', updated_at: '2026-11-03T09:59:00Z' }

  it('déduit un travail, avec sa règle, si des agents sont actifs', () => {
    expect(deriveObservedState({ ...fresh, active_agents: 2 }, now)).toEqual({
      state: 'working',
      confidence: { level: 'inferred', rule: 'active_agents > 0 sur /health/detailed' },
    })
  })

  it('déduit le repos, sans le présenter comme confirmé', () => {
    expect(deriveObservedState({ ...fresh, active_agents: 0 }, now)).toMatchObject({ state: 'idle', confidence: { level: 'inferred' } })
  })

  it.each([
    ['gateway arrêtée', { ...fresh, gateway_state: 'stopped', active_agents: 0 }],
    ['compteur absent', { ...fresh, active_agents: null }],
    ['information périmée', { ...fresh, active_agents: 0, updated_at: '2026-11-03T09:00:00Z' }],
    ['date absente', { status: 'ok', gateway_state: 'running', active_agents: 0 }],
  ])('reste inconnu si : %s', (_label, health) => {
    expect(deriveObservedState(health, now)).toEqual({ state: 'unknown', confidence: { level: 'unknown' } })
  })
})

describe('plateforme Hermes', () => {
  let hermes: FakeHermes
  let platform: HermesPlatform

  beforeEach(async () => {
    hermes = await startFakeHermes()
    platform = new HermesPlatform([{ id: 'jarvis', name: 'JARVIS', baseUrl: hermes.url, apiKey: hermes.key }], { retryDelayMs: 1 })
  })
  afterEach(() => hermes.close())

  it('confirme un profil seulement s\'il répond', async () => {
    const down = new HermesPlatform([
      { id: 'jarvis', name: 'JARVIS', baseUrl: hermes.url, apiKey: hermes.key },
      { id: 'veilleur', name: 'VEILLEUR', baseUrl: 'http://127.0.0.1:9', apiKey: 'k' },
    ], { retryDelayMs: 1 })
    const result = await down.listAgents()
    if (result.status !== 'available') throw new Error('attendu')
    expect(result.value.map((agent) => [agent.definition.id, agent.reachable, agent.version])).toEqual([
      ['jarvis', true, '0.17.0'],
      ['veilleur', false, null],
    ])
    expect(result.value[0]?.definition.model).toBe('jarvis')
  })

  it('renvoie indisponible, et non une liste vide, si les sessions échouent', async () => {
    hermes.failNext = { status: 401, times: 1, body: { error: { message: 'Invalid API key', code: 'invalid_api_key' } } }
    expect(await platform.listSessions(JARVIS)).toEqual({ status: 'unavailable', reason: 'Invalid API key' })
  })

  it('signale un profil non configuré', async () => {
    expect(await platform.listSessions('inconnu' as AgentId)).toMatchObject({ status: 'unavailable' })
  })

  it('marque l\'agent indisponible si la gateway ne répond plus', async () => {
    await hermes.close()
    const result = await platform.getRuntime(JARVIS)
    expect(result).toMatchObject({ status: 'available', value: { state: { value: 'unavailable', confidence: { level: 'confirmed' } } } })
    hermes = await startFakeHermes()
  })

  it('suit un run jusqu\'à son résultat', async () => {
    const created = await platform.createSession(JARVIS, 'Essai')
    if (created.status !== 'available') throw new Error('attendu')
    const started = await platform.startRun(JARVIS, { sessionId: created.value.id, input: 'bonjour', history: [] })
    if (started.status !== 'available') throw new Error('attendu')
    hermes.nextRunEvents = [
      { event: 'tool.started', tool: 'bash', preview: 'ls' },
      { event: 'message.delta', delta: 'Salut' },
      { event: 'inconnu' },
      { event: 'run.completed', output: 'Salut', usage: {} },
    ]
    const events: RunEvent[] = []
    await platform.streamRun(JARVIS, started.value.runId, (event) => events.push(event), new AbortController().signal)
    expect(events.map((event) => event.type)).toEqual(['tool.started', 'message.delta', 'run.completed'])
    expect(await platform.getRun(JARVIS, started.value.runId)).toMatchObject({ status: 'available', value: { status: 'completed', output: 'Salut' } })
  })

  it('classe un statut de run inconnu comme inconnu', async () => {
    hermes.runs.set('r', { run_id: 'r', status: 'etrange' })
    expect(await platform.getRun(JARVIS, 'r')).toMatchObject({ value: { status: 'unknown' } })
  })

  it('lit les messages et les tâches planifiées', async () => {
    hermes.sessions.push({ id: 's1', source: 'telegram' })
    hermes.messages.set('s1', [{ id: 1, role: 'user', content: 'x', timestamp: 1_700_000_000 }])
    expect(await platform.listMessages(JARVIS, 's1' as SessionId)).toMatchObject({ value: [{ id: '1', role: 'user', content: 'x' }] })
    expect(await platform.listJobs(JARVIS)).toMatchObject({ value: [{ id: 'job1', name: 'Veille', lastStatus: 'ok' }] })
  })

  it('n\'écrit jamais la clé dans les journaux', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) => vi.spyOn(console, method))
    hermes.failNext = { status: 500, times: 1 }
    await platform.listSessions(JARVIS)
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(hermes.key)
      spy.mockRestore()
    }
  })
})

describe('configuration', () => {
  const live = {
    HERMES_MODE: 'live',
    HERMES_PROFILES: JSON.stringify([{ id: 'jarvis', name: 'JARVIS', baseUrl: 'http://hermes:8642', keyEnv: 'KEY_JARVIS' }]),
    KEY_JARVIS: 'valeur-secrete',
    OPERATOR_PASSWORD_HASH: 'x',
  }
  const production = {
    ...live,
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://x',
    ALLOWED_ORIGINS: 'https://office.example',
  }

  it('lit les profils et leurs clés depuis l\'environnement', () => {
    expect(loadConfig(live).profiles).toEqual([{ id: 'jarvis', name: 'JARVIS', baseUrl: 'http://hermes:8642', apiKey: 'valeur-secrete' }])
  })

  it('exige un mode explicite', () => {
    expect(() => loadConfig({})).toThrow(/HERMES_MODE/)
  })

  it('interdit le mode mock en production', () => {
    expect(() => loadConfig({ ...production, HERMES_MODE: 'mock' })).toThrow(/mock est interdit/)
  })

  it.each(['OPERATOR_PASSWORD_HASH', 'DATABASE_URL', 'ALLOWED_ORIGINS'])('exige %s en production', (name) => {
    expect(() => loadConfig({ ...production, [name]: '' })).toThrow(name)
  })

  it('signale une clé manquante sans citer de valeur', () => {
    expect(() => loadConfig({ ...live, KEY_JARVIS: '' })).toThrow(/KEY_JARVIS/)
  })

  it('refuse une clé écrite directement dans les profils', () => {
    expect(() => loadConfig({
      ...live,
      HERMES_PROFILES: JSON.stringify([{ id: 'jarvis', baseUrl: 'http://hermes:8642', keyEnv: 'sk-valeur-secrete' }]),
    })).toThrow(/HERMES_PROFILES invalide/)
  })
})
