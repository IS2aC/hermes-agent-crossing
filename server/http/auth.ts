import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, RequestHandler, Response } from 'express'

export const SESSION_COOKIE = 'hac_session'
const SCRYPT_LENGTH = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `scrypt$${salt}$${scryptSync(password, salt, SCRYPT_LENGTH).toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !expected) return false
  const actual = scryptSync(password, salt, SCRYPT_LENGTH)
  const reference = Buffer.from(expected, 'hex')
  return reference.length === actual.length && timingSafeEqual(actual, reference)
}

/** Sessions en mémoire : un redémarrage demande une reconnexion, ce qui convient à un seul opérateur. */
export class SessionStore {
  private readonly sessions = new Map<string, number>()

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  create(): string {
    const token = randomBytes(32).toString('hex')
    this.sessions.set(token, this.now() + this.ttlMs)
    return token
  }

  isValid(token: string | undefined): boolean {
    if (!token) return false
    const expiresAt = this.sessions.get(token)
    if (expiresAt === undefined) return false
    if (expiresAt <= this.now()) {
      this.sessions.delete(token)
      return false
    }
    return true
  }

  revoke(token: string | undefined): void {
    if (token) this.sessions.delete(token)
  }
}

/** Fenêtre glissante simple. Suffisant pour une seule instance derrière Traefik. */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  allow(key: string): boolean {
    const threshold = this.now() - this.windowMs
    const recent = (this.hits.get(key) ?? []).filter((time) => time > threshold)
    if (recent.length >= this.limit) {
      this.hits.set(key, recent)
      return false
    }
    recent.push(this.now())
    this.hits.set(key, recent)
    return true
  }
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return value.join('=')
  }
  return undefined
}

export function isOriginAllowed(origin: string | undefined, host: string | undefined, allowed: readonly string[]): boolean {
  if (!origin) return false
  if (allowed.includes(origin)) return true
  if (allowed.length > 0) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Protège contre la falsification de requête : une écriture doit venir d'une origine connue. */
export function originGuard(allowed: readonly string[]): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    if (UNSAFE_METHODS.has(request.method) && !isOriginAllowed(request.headers.origin, request.headers.host, allowed)) {
      response.status(403).json({ error: 'Origine refusée' })
      return
    }
    next()
  }
}

export function securityHeaders(): RequestHandler {
  return (_request, response, next) => {
    response.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' ws: wss:",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join('; '))
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('X-Frame-Options', 'DENY')
    response.setHeader('Referrer-Policy', 'no-referrer')
    next()
  }
}
