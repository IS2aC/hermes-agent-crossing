import { z } from 'zod'
import type { HermesProfileConfig } from './adapters/hermes/platform'

const profileSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
  name: z.string().min(1).max(80).optional(),
  baseUrl: z.string().url(),
  /** Nom de la variable d'environnement contenant la clé, jamais la clé elle-même. */
  keyEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
})

export interface AppConfig {
  production: boolean
  host: string
  port: number
  mode: 'live' | 'mock'
  profiles: HermesProfileConfig[]
  databaseUrl: string | null
  passwordHash: string | null
  allowedOrigins: string[]
  secureCookies: boolean
  sessionTtlMs: number
}

/** Refuse une configuration incomplète ou dangereuse, sans jamais citer de valeur secrète. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const production = env.NODE_ENV === 'production'
  const mode = env.HERMES_MODE === 'live' ? 'live' : env.HERMES_MODE === 'mock' ? 'mock' : null
  if (!mode) throw new Error('HERMES_MODE doit valoir live ou mock')
  if (production && mode === 'mock') throw new Error('Le mode mock est interdit en production')

  let profiles: HermesProfileConfig[] = []
  if (mode === 'live') {
    let raw: unknown
    try {
      raw = JSON.parse(env.HERMES_PROFILES ?? '')
    } catch {
      throw new Error('HERMES_PROFILES doit être un tableau JSON')
    }
    const parsed = z.array(profileSchema).min(1).safeParse(raw)
    if (!parsed.success) throw new Error('HERMES_PROFILES invalide : id, baseUrl et keyEnv sont requis')
    profiles = parsed.data.map((profile) => {
      const apiKey = env[profile.keyEnv]
      if (!apiKey) throw new Error(`Variable manquante pour le profil ${profile.id} : ${profile.keyEnv}`)
      return { id: profile.id, name: profile.name ?? profile.id, baseUrl: profile.baseUrl, apiKey }
    })
    if (new Set(profiles.map((profile) => profile.id)).size !== profiles.length) {
      throw new Error('HERMES_PROFILES contient deux fois le même id')
    }
  }

  const passwordHash = env.OPERATOR_PASSWORD_HASH || null
  if ((production || mode === 'live') && !passwordHash) {
    throw new Error('OPERATOR_PASSWORD_HASH est requis en production et en mode live')
  }
  const databaseUrl = env.DATABASE_URL || null
  if (production && !databaseUrl) throw new Error('DATABASE_URL est requis en production')
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)
  if (production && allowedOrigins.length === 0) throw new Error('ALLOWED_ORIGINS est requis en production')

  const port = Number(env.PORT ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT invalide')

  return {
    production,
    host: env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1'),
    port,
    mode,
    profiles,
    databaseUrl,
    passwordHash,
    allowedOrigins,
    secureCookies: production,
    sessionTtlMs: 12 * 60 * 60_000,
  }
}
