import { existsSync } from 'node:fs'
import { join } from 'node:path'
import express, { type Express, type Router } from 'express'
import type { AgentPlatform } from '../../src/domain/platform'
import type { AppConfig } from '../config'
import {
  originGuard,
  RateLimiter,
  readCookie,
  securityHeaders,
  SESSION_COOKIE,
  SessionStore,
  verifyPassword,
} from './auth'

export interface AppDependencies {
  config: AppConfig
  platform: AgentPlatform
  sessions: SessionStore
  /** Routes métier, toutes placées derrière l'authentification. */
  routes?: Router[]
  staticDir?: string
  loginLimiter?: RateLimiter
}

/** Sans mot de passe, l'accès n'est libre qu'en développement, en mode mock. */
export function isAuthDisabled(config: AppConfig): boolean {
  return config.passwordHash === null && !config.production && config.mode === 'mock'
}

export function createApp(dependencies: AppDependencies): Express {
  const { config, platform, sessions } = dependencies
  const loginLimiter = dependencies.loginLimiter ?? new RateLimiter(5, 60_000)
  const app = express()
  app.disable('x-powered-by')
  if (config.production) app.set('trust proxy', 1)
  app.use(securityHeaders())

  // Santé publique, volontairement sans aucun détail.
  app.get('/healthz', (_request, response) => {
    response.json({ status: 'ok' })
  })

  const api = express.Router()
  api.use(express.json({ limit: '256kb' }))
  api.use(originGuard(config.allowedOrigins))

  api.post('/auth/login', (request, response) => {
    if (!loginLimiter.allow(request.ip ?? 'inconnu')) {
      response.status(429).json({ error: 'Trop de tentatives, réessaie dans une minute' })
      return
    }
    const password: unknown = (request.body as { password?: unknown } | undefined)?.password
    if (typeof password !== 'string' || !config.passwordHash || !verifyPassword(password, config.passwordHash)) {
      response.status(401).json({ error: 'Mot de passe incorrect' })
      return
    }
    response.cookie(SESSION_COOKIE, sessions.create(), {
      httpOnly: true,
      sameSite: 'strict',
      secure: config.secureCookies,
      maxAge: config.sessionTtlMs,
      path: '/',
    })
    response.status(204).end()
  })

  api.post('/auth/logout', (request, response) => {
    sessions.revoke(readCookie(request.headers.cookie, SESSION_COOKIE))
    response.clearCookie(SESSION_COOKIE, { path: '/' })
    response.status(204).end()
  })

  api.get('/auth/session', (request, response) => {
    response.json({
      authenticated: isAuthDisabled(config) || sessions.isValid(readCookie(request.headers.cookie, SESSION_COOKIE)),
      authRequired: !isAuthDisabled(config),
    })
  })

  api.use((request, response, next) => {
    if (isAuthDisabled(config) || sessions.isValid(readCookie(request.headers.cookie, SESSION_COOKIE))) {
      next()
      return
    }
    response.status(401).json({ error: 'Connexion requise' })
  })

  api.get('/status', (_request, response) => {
    response.json({ mode: platform.mode })
  })

  for (const router of dependencies.routes ?? []) api.use(router)

  api.use((_request, response) => {
    response.status(404).json({ error: 'Route inconnue' })
  })

  app.use('/api', api)

  if (dependencies.staticDir && existsSync(dependencies.staticDir)) {
    const staticDir = dependencies.staticDir
    app.use(express.static(staticDir))
    app.get('*', (_request, response) => {
      response.sendFile(join(staticDir, 'index.html'))
    })
  }

  // Une erreur interne reste dans le serveur : aucun détail n'est envoyé au navigateur.
  app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (response.headersSent) {
      next(error)
      return
    }
    const status = (error as { status?: unknown }).status
    if (status === 400 || status === 413) {
      response.status(status).json({ error: 'Requête invalide' })
      return
    }
    console.error('Erreur interne :', error instanceof Error ? error.name : 'inconnue')
    response.status(500).json({ error: 'Erreur interne' })
  })

  return app
}
