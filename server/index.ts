import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { HermesPlatform } from './adapters/hermes/platform'
import { MockPlatform } from './adapters/mock/platform'
import { loadConfig } from './config'
import { EventBus } from './events/bus'
import { ActivityObserver, runEventToActivity } from './events/observer'
import { eventRoutes } from './events/routes'
import { createApp } from './http/app'
import { SessionStore } from './http/auth'
import { chatRoutes } from './chat/routes'
import { RunTracker } from './chat/runs'
import { registryRoutes } from './registry/routes'
import { PostgresStore } from './storage/postgres'
import { MemoryStore, type Store } from './storage/store'

const here = dirname(fileURLToPath(import.meta.url))
const EVENT_RETENTION_MS = 30 * 24 * 60 * 60_000

async function main() {
  const config = loadConfig()
  const platform = config.mode === 'live' ? new HermesPlatform(config.profiles) : new MockPlatform()
  // Le mode mock n'écrit jamais dans la vraie base : démonstration et production restent séparées.
  const store: Store = config.mode === 'live' && config.databaseUrl
    ? new PostgresStore(new pg.Pool({ connectionString: config.databaseUrl }))
    : new MemoryStore()
  await store.migrate()

  const bus = new EventBus(store)
  const provenance = platform.mode === 'mock' ? 'simulation' : 'hermes'
  const tracker = new RunTracker(platform, {
    onEvent(run, event) {
      const activity = runEventToActivity(run.agentId, run.sessionId, run.runId, run.events.length, event, provenance, new Date().toISOString())
      if (activity) void bus.publish(activity).catch(() => console.error('Journal : écriture impossible'))
    },
  })
  const observer = new ActivityObserver(platform, bus)
  observer.start()
  const retention = setInterval(() => {
    void store.purgeEventsBefore(new Date(Date.now() - EVENT_RETENTION_MS).toISOString()).catch(() => console.error('Journal : purge impossible'))
  }, 6 * 60 * 60_000)
  retention.unref()
  const app = createApp({
    config,
    platform,
    sessions: new SessionStore(config.sessionTtlMs),
    staticDir: process.env.STATIC_DIR ?? join(here, '..', 'dist'),
    routes: [registryRoutes(platform, store), chatRoutes(platform, tracker), eventRoutes(store, bus)],
  })
  const server = app.listen(config.port, config.host, () => {
    console.log(`Hermes-Agent-Crossing écoute sur ${config.host}:${config.port} (mode ${config.mode})`)
  })

  const shutdown = () => {
    tracker.stopAll()
    observer.stop()
    clearInterval(retention)
    server.close(() => {
      void store.close().finally(() => process.exit(0))
    })
    server.closeAllConnections()
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((error: unknown) => {
  console.error('Démarrage impossible :', error instanceof Error ? error.message : 'erreur inconnue')
  process.exit(1)
})
