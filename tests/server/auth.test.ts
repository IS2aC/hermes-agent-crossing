import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { MockPlatform } from '../../server/adapters/mock/platform'
import type { AppConfig } from '../../server/config'
import { createApp } from '../../server/http/app'
import { hashPassword, isOriginAllowed, RateLimiter, SESSION_COOKIE, SessionStore, verifyPassword } from '../../server/http/auth'

const ORIGIN = 'http://office.test'
const HASH = hashPassword('mot-de-passe-solide')

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    production: false,
    host: '127.0.0.1',
    port: 0,
    mode: 'mock',
    profiles: [],
    databaseUrl: null,
    passwordHash: HASH,
    allowedOrigins: [ORIGIN],
    secureCookies: false,
    sessionTtlMs: 60_000,
    ...overrides,
  }
}

function build(overrides: Partial<AppConfig> = {}) {
  const resolved = config(overrides)
  return createApp({ config: resolved, platform: new MockPlatform(1), sessions: new SessionStore(resolved.sessionTtlMs) })
}

async function login(app: ReturnType<typeof build>) {
  const response = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ password: 'mot-de-passe-solide' })
  return response.headers['set-cookie']![0]!.split(';')[0]!
}

describe('mots de passe', () => {
  it('vérifie un mot de passe, et rejette un mauvais', () => {
    expect(verifyPassword('mot-de-passe-solide', HASH)).toBe(true)
    expect(verifyPassword('autre', HASH)).toBe(false)
  })

  it('sale chaque empreinte', () => {
    expect(hashPassword('x')).not.toBe(hashPassword('x'))
  })

  it('rejette une empreinte mal formée', () => {
    expect(verifyPassword('x', 'n-importe-quoi')).toBe(false)
  })
})

describe('sessions', () => {
  it('expire après la durée prévue', () => {
    let now = 0
    const store = new SessionStore(100, () => now)
    const token = store.create()
    expect(store.isValid(token)).toBe(true)
    now = 100
    expect(store.isValid(token)).toBe(false)
  })

  it('révoque un jeton', () => {
    const store = new SessionStore(100)
    const token = store.create()
    store.revoke(token)
    expect(store.isValid(token)).toBe(false)
    expect(store.isValid(undefined)).toBe(false)
  })
})

describe('limiteur', () => {
  it('bloque après la limite, puis libère', () => {
    let now = 0
    const limiter = new RateLimiter(2, 100, () => now)
    expect([limiter.allow('a'), limiter.allow('a'), limiter.allow('a')]).toEqual([true, true, false])
    expect(limiter.allow('b')).toBe(true)
    now = 101
    expect(limiter.allow('a')).toBe(true)
  })
})

describe('origine', () => {
  it('compare à la liste, ou à l\'hôte si la liste est vide', () => {
    expect(isOriginAllowed(ORIGIN, 'autre', [ORIGIN])).toBe(true)
    expect(isOriginAllowed('http://evil.test', 'office.test', [ORIGIN])).toBe(false)
    expect(isOriginAllowed('http://office.test', 'office.test', [])).toBe(true)
    expect(isOriginAllowed(undefined, 'office.test', [])).toBe(false)
    expect(isOriginAllowed('pas une url', 'office.test', [])).toBe(false)
  })
})

describe('accès HTTP', () => {
  it('garde la santé publique, sans détail', async () => {
    const response = await request(build()).get('/healthz').expect(200)
    expect(response.body).toEqual({ status: 'ok' })
  })

  it('signale que l\'application n\'est pas prête, sans détail', async () => {
    const resolved = config()
    const failing = createApp({
      config: resolved,
      platform: new MockPlatform(1),
      sessions: new SessionStore(60_000),
      ready: () => Promise.reject(new Error('mot de passe de base visible')),
    })
    const response = await request(failing).get('/readyz').expect(503)
    expect(JSON.stringify(response.body)).not.toContain('mot de passe')
    await request(build()).get('/readyz').expect(200)
  })

  it('refuse les routes sans connexion', async () => {
    await request(build()).get('/api/status').expect(401)
  })

  it('refuse les routes inconnues sans connexion, sans révéler leur existence', async () => {
    await request(build()).get('/api/nimporte-quoi').expect(401)
  })

  it('refuse un mauvais mot de passe', async () => {
    await request(build()).post('/api/auth/login').set('Origin', ORIGIN).send({ password: 'faux' }).expect(401)
    await request(build()).post('/api/auth/login').set('Origin', ORIGIN).send({ password: 123 }).expect(401)
  })

  it('limite les tentatives de connexion', async () => {
    const app = build()
    for (let i = 0; i < 5; i++) await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ password: 'faux' }).expect(401)
    await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ password: 'mot-de-passe-solide' }).expect(429)
  })

  it('ne compte pas les connexions réussies', async () => {
    const app = build()
    for (let i = 0; i < 7; i++) {
      await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ password: 'mot-de-passe-solide' }).expect(204)
    }
  })

  it('pose un cookie protégé après connexion', async () => {
    const response = await request(build({ secureCookies: true })).post('/api/auth/login').set('Origin', ORIGIN).send({ password: 'mot-de-passe-solide' }).expect(204)
    const cookie = response.headers['set-cookie']![0]!
    expect(cookie).toContain(`${SESSION_COOKIE}=`)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Strict/)
    expect(cookie).toMatch(/Secure/)
  })

  it('autorise l\'accès une fois connecté, puis plus après déconnexion', async () => {
    const app = build()
    const cookie = await login(app)
    const status = await request(app).get('/api/status').set('Cookie', cookie).expect(200)
    expect(status.body).toEqual({ mode: 'mock' })
    await request(app).post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', cookie).expect(204)
    await request(app).get('/api/status').set('Cookie', cookie).expect(401)
  })

  it('refuse une écriture venant d\'une autre origine, même connecté', async () => {
    const app = build()
    const cookie = await login(app)
    await request(app).post('/api/auth/logout').set('Origin', 'http://evil.test').set('Cookie', cookie).expect(403)
    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(403)
  })

  it('n\'ouvre l\'accès libre qu\'en développement, en mode mock', async () => {
    await request(build({ passwordHash: null })).get('/api/status').expect(200)
    await request(build({ passwordHash: null, mode: 'live' })).get('/api/status').expect(401)
    await request(build({ passwordHash: null, production: true })).get('/api/status').expect(401)
  })

  it('pose les en-têtes de sécurité', async () => {
    const response = await request(build()).get('/healthz')
    expect(response.headers['content-security-policy']).toContain("default-src 'self'")
    expect(response.headers['content-security-policy']).not.toContain('unsafe')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('DENY')
    expect(response.headers['x-powered-by']).toBeUndefined()
  })

  it('rejette un corps trop volumineux ou invalide, sans détail', async () => {
    const app = build()
    const tooBig = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ password: 'x'.repeat(300_000) })
    expect(tooBig.status).toBe(413)
    expect(tooBig.body).toEqual({ error: 'Requête invalide' })
    const invalid = await request(app).post('/api/auth/login').set('Origin', ORIGIN).set('Content-Type', 'application/json').send('{cassé')
    expect(invalid.status).toBe(400)
  })
})
