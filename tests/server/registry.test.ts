import { newDb } from 'pg-mem'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AgentId, CharacterId } from '../../src/domain/agents'
import type { AgentPlatform } from '../../src/domain/platform'
import { linkState, type RegistryView } from '../../src/domain/registry'
import { HermesPlatform } from '../../server/adapters/hermes/platform'
import { MockPlatform } from '../../server/adapters/mock/platform'
import type { AppConfig } from '../../server/config'
import { createApp } from '../../server/http/app'
import { SessionStore } from '../../server/http/auth'
import { registryRoutes } from '../../server/registry/routes'
import { PostgresStore, type SqlPool } from '../../server/storage/postgres'
import { ConflictError, MemoryStore, NotFoundError, type Store } from '../../server/storage/store'
import { startFakeHermes, type FakeHermes } from '../fixtures/fakeHermes'

const ORIGIN = 'http://office.test'
const config: AppConfig = {
  production: false,
  host: '127.0.0.1',
  port: 0,
  mode: 'mock',
  profiles: [],
  databaseUrl: null,
  passwordHash: null,
  allowedOrigins: [ORIGIN],
  secureCookies: false,
  sessionTtlMs: 60_000,
}

function appWith(platform: AgentPlatform, store: Store) {
  return createApp({ config, platform, sessions: new SessionStore(60_000), routes: [registryRoutes(platform, store)] })
}

const character = (id: string) => id as CharacterId
const agent = (id: string) => id as AgentId

function postgresStore() {
  const pool = new (newDb().adapters.createPg().Pool)() as unknown as SqlPool
  return new PostgresStore(pool)
}

describe('état du lien', () => {
  const discovered = (reachable: boolean) => ({
    status: 'available' as const,
    value: [{ definition: { id: agent('a'), name: 'A', description: null, model: null, provider: null }, reachable, version: null, detail: null }],
  })

  it('distingue chaque cas', () => {
    expect(linkState(null, discovered(true))).toBe('none')
    expect(linkState(agent('a'), discovered(true))).toBe('connected')
    expect(linkState(agent('a'), discovered(false))).toBe('unreachable')
    expect(linkState(agent('b'), discovered(true))).toBe('missing')
    expect(linkState(agent('a'), { status: 'unavailable', reason: 'x' })).toBe('unknown')
  })
})

describe.each([
  ['mémoire', () => new MemoryStore() as Store],
  ['PostgreSQL (simulé par pg-mem)', () => postgresStore() as Store],
])('stockage %s', (_label, createStore) => {
  let store: Store

  beforeEach(async () => {
    store = createStore()
    await store.migrate()
  })

  it('crée les 7 personnages une seule fois, sans agent', async () => {
    await store.migrate()
    expect(await store.listCharacters()).toHaveLength(7)
    expect(await store.listBindings()).toEqual([])
  })

  it('crée, remplace et retire un lien', async () => {
    await store.setBinding(character('jarvis'), agent('a'))
    await store.setBinding(character('jarvis'), agent('b'))
    expect((await store.listBindings()).map((binding) => binding.agentId)).toEqual(['b'])
    await store.removeBinding(character('jarvis'))
    expect(await store.listBindings()).toEqual([])
  })

  it('refuse deux personnages pour un même agent', async () => {
    await store.setBinding(character('jarvis'), agent('a'))
    await expect(store.setBinding(character('veilleur'), agent('a'))).rejects.toBeInstanceOf(ConflictError)
  })

  it('refuse un lien vers un personnage inconnu', async () => {
    await expect(store.setBinding(character('absent'), agent('a'))).rejects.toBeInstanceOf(NotFoundError)
  })

  it('renomme et déplace un personnage', async () => {
    const updated = await store.updateCharacter(character('jarvis'), { displayName: 'Majordome', placement: null })
    expect(updated).toMatchObject({ displayName: 'Majordome', placement: null })
    const moved = await store.updateCharacter(character('jarvis'), { placement: { tileX: 1, tileY: 1 } })
    expect(moved.placement).toEqual({ tileX: 1, tileY: 1 })
  })

  it('refuse un emplacement occupé', async () => {
    await expect(store.updateCharacter(character('jarvis'), { placement: { tileX: 7, tileY: 4 } })).rejects.toBeInstanceOf(ConflictError)
  })

  it('signale un personnage inconnu', async () => {
    await expect(store.updateCharacter(character('absent'), {})).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('migrations PostgreSQL', () => {
  it('conserve les données quand on relance les migrations', async () => {
    const store = postgresStore()
    await store.migrate()
    await store.updateCharacter(character('jarvis'), { displayName: 'Conservé' })
    await store.migrate()
    const jarvis = (await store.listCharacters()).find((profile) => profile.id === 'jarvis')
    expect(jarvis?.displayName).toBe('Conservé')
  })
})

describe('API du registre', () => {
  let store: MemoryStore

  beforeEach(async () => {
    store = new MemoryStore()
    await store.migrate()
  })

  it('montre personnages et agents séparément, sans lien au départ', async () => {
    const response = await request(appWith(new MockPlatform(1), store)).get('/api/registry').expect(200)
    const view = response.body as RegistryView
    expect(view.mode).toBe('mock')
    expect(view.characters.every((entry) => entry.link === 'none')).toBe(true)
    expect(view.agents).toMatchObject({ status: 'available' })
    if (view.agents.status === 'available') expect(view.agents.value.every((entry) => entry.characterId === null)).toBe(true)
  })

  it('associe un personnage à un agent découvert', async () => {
    const app = appWith(new MockPlatform(1), store)
    await request(app).put('/api/bindings').set('Origin', ORIGIN).send({ characterId: 'jarvis', agentId: 'demo-jarvis' }).expect(200)
    const view = (await request(app).get('/api/registry')).body as RegistryView
    expect(view.characters.find((entry) => entry.profile.id === 'jarvis')).toMatchObject({ link: 'connected', agentId: 'demo-jarvis' })
    if (view.agents.status === 'available') {
      expect(view.agents.value.find((entry) => entry.definition.id === 'demo-jarvis')?.characterId).toBe('jarvis')
    }
  })

  it('refuse un agent inventé', async () => {
    await request(appWith(new MockPlatform(1), store)).put('/api/bindings').set('Origin', ORIGIN).send({ characterId: 'jarvis', agentId: 'inventé' }).expect(404)
  })

  it('signale un conflit et une requête invalide', async () => {
    const app = appWith(new MockPlatform(1), store)
    await request(app).put('/api/bindings').set('Origin', ORIGIN).send({ characterId: 'jarvis', agentId: 'demo-jarvis' }).expect(200)
    await request(app).put('/api/bindings').set('Origin', ORIGIN).send({ characterId: 'veilleur', agentId: 'demo-jarvis' }).expect(409)
    await request(app).put('/api/bindings').set('Origin', ORIGIN).send({ characterId: 'jarvis' }).expect(400)
  })

  it('montre un agent associé hors ligne comme injoignable', async () => {
    const app = appWith(new MockPlatform(1), store)
    await request(app).put('/api/bindings').set('Origin', ORIGIN).send({ characterId: 'jarvis', agentId: 'demo-hors-ligne' }).expect(200)
    const view = (await request(app).get('/api/registry')).body as RegistryView
    expect(view.characters.find((entry) => entry.profile.id === 'jarvis')?.link).toBe('unreachable')
  })

  it('conserve le lien vers un agent disparu, en le signalant', async () => {
    await store.setBinding(character('jarvis'), agent('disparu'))
    const view = (await request(appWith(new MockPlatform(1), store)).get('/api/registry')).body as RegistryView
    expect(view.characters.find((entry) => entry.profile.id === 'jarvis')).toMatchObject({ link: 'missing', agentId: 'disparu' })
  })

  it('reste utilisable et honnête si la découverte échoue', async () => {
    const broken = new MockPlatform(1)
    broken.listAgents = async () => ({ status: 'unavailable', reason: 'panne' })
    await store.setBinding(character('jarvis'), agent('a'))
    const app = appWith(broken, store)
    const view = (await request(app).get('/api/registry').expect(200)).body as RegistryView
    expect(view.agents).toEqual({ status: 'unavailable', reason: 'panne' })
    expect(view.characters.find((entry) => entry.profile.id === 'jarvis')?.link).toBe('unknown')
    await request(app).put('/api/bindings').set('Origin', ORIGIN).send({ characterId: 'veilleur', agentId: 'a' }).expect(503)
  })

  it('retire un lien sans toucher à l\'agent', async () => {
    const app = appWith(new MockPlatform(1), store)
    await request(app).put('/api/bindings').set('Origin', ORIGIN).send({ characterId: 'jarvis', agentId: 'demo-jarvis' })
    await request(app).delete('/api/bindings/jarvis').set('Origin', ORIGIN).expect(204)
    const view = (await request(app).get('/api/registry')).body as RegistryView
    expect(view.characters.find((entry) => entry.profile.id === 'jarvis')?.link).toBe('none')
    if (view.agents.status === 'available') expect(view.agents.value).toHaveLength(3)
  })

  it('déplace un personnage vers un emplacement connu seulement', async () => {
    const app = appWith(new MockPlatform(1), store)
    await request(app).patch('/api/characters/jarvis').set('Origin', ORIGIN).send({ spotId: 'nulle-part' }).expect(400)
    await request(app).patch('/api/characters/jarvis').set('Origin', ORIGIN).send({ spotId: 'poste-2' }).expect(409)
    await request(app).patch('/api/characters/jarvis').set('Origin', ORIGIN).send({ spotId: null }).expect(200)
    const moved = await request(app).patch('/api/characters/jarvis').set('Origin', ORIGIN).send({ spotId: 'poste-1', displayName: ' Renommé ' }).expect(200)
    expect(moved.body).toMatchObject({ displayName: 'Renommé', placement: { tileX: 3, tileY: 4 } })
  })

  it('refuse les écritures sans bonne origine', async () => {
    await request(appWith(new MockPlatform(1), store)).put('/api/bindings').send({ characterId: 'jarvis', agentId: 'demo-jarvis' }).expect(403)
  })
})

describe('registre sur la plateforme Hermes', () => {
  let hermes: FakeHermes

  beforeEach(async () => {
    hermes = await startFakeHermes()
  })
  afterEach(() => hermes.close())

  it('n\'affiche connectés que les profils qui répondent', async () => {
    const store = new MemoryStore()
    await store.migrate()
    await store.setBinding(character('jarvis'), agent('jarvis'))
    await store.setBinding(character('veilleur'), agent('veilleur'))
    const platform = new HermesPlatform([
      { id: 'jarvis', name: 'JARVIS', baseUrl: hermes.url, apiKey: hermes.key },
      { id: 'veilleur', name: 'VEILLEUR', baseUrl: 'http://127.0.0.1:9', apiKey: 'k' },
    ], { retryDelayMs: 1 })
    const view = (await request(appWith(platform, store)).get('/api/registry').expect(200)).body as RegistryView
    expect(view.mode).toBe('live')
    expect(view.characters.find((entry) => entry.profile.id === 'jarvis')?.link).toBe('connected')
    expect(view.characters.find((entry) => entry.profile.id === 'veilleur')?.link).toBe('unreachable')
    if (view.agents.status !== 'available') throw new Error('attendu')
    const jarvis = view.agents.value.find((entry) => entry.definition.id === 'jarvis')
    expect(jarvis?.runtime).toMatchObject({ status: 'available', value: { state: { provenance: 'hermes', value: 'idle', confidence: { level: 'inferred' } } } })
    const veilleur = view.agents.value.find((entry) => entry.definition.id === 'veilleur')
    expect(veilleur?.runtime).toMatchObject({ value: { state: { value: 'unavailable' } } })
  })
})
