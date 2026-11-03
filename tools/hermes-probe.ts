// Contrôle en lecture seule d'un profil Hermes, à lancer sur le VPS.
// Usage : HERMES_URL=http://... HERMES_KEY=... npx tsx tools/hermes-probe.ts
// Aucune action n'est déclenchée, et ni la clé ni le contenu des conversations ne sont affichés.

export {}

const baseUrl = (process.env.HERMES_URL ?? '').replace(/\/+$/, '')
const apiKey = process.env.HERMES_KEY ?? ''
if (!baseUrl || !apiKey) {
  console.error('HERMES_URL et HERMES_KEY sont requis.')
  process.exit(2)
}

const EXPECTED_VERSION = '0.17.0'

interface Check {
  label: string
  path: string
  auth: boolean
  summarize(payload: Record<string, unknown>): string
}

const CHECKS: Check[] = [
  {
    label: 'Santé',
    path: '/health',
    auth: false,
    summarize: (p) => `version=${String(p.version)}${p.version === EXPECTED_VERSION ? '' : ` (attendu ${EXPECTED_VERSION})`}`,
  },
  {
    label: 'Santé détaillée',
    path: '/health/detailed',
    auth: false,
    summarize: (p) => `gateway_state=${String(p.gateway_state)} active_agents=${String(p.active_agents)} updated_at=${String(p.updated_at)}`,
  },
  {
    label: 'Capacités',
    path: '/v1/capabilities',
    auth: true,
    summarize: (p) => {
      const features = (p.features ?? {}) as Record<string, unknown>
      return `model=${String(p.model)} ${['run_submission', 'run_events_sse', 'run_stop', 'run_approval_response', 'session_resources']
        .map((name) => `${name}=${String(features[name])}`).join(' ')}`
    },
  },
  {
    label: 'Sessions',
    path: '/api/sessions?limit=20',
    auth: true,
    summarize: (p) => {
      const sessions = Array.isArray(p.data) ? (p.data as Record<string, unknown>[]) : []
      const sources = [...new Set(sessions.map((session) => String(session.source)))]
      return `${sessions.length} session(s), sources : ${sources.join(', ') || 'aucune'}`
    },
  },
  {
    label: 'Tâches planifiées',
    path: '/api/jobs',
    auth: true,
    summarize: (p) => `${Array.isArray(p.jobs) ? p.jobs.length : '?'} tâche(s)`,
  },
]

let failed = false
for (const check of CHECKS) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      headers: check.auth ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      failed = true
      console.log(`ÉCHEC ${check.label} (${check.path}) : HTTP ${response.status}`)
      continue
    }
    console.log(`OK    ${check.label} : ${check.summarize((await response.json()) as Record<string, unknown>)}`)
  } catch (error) {
    failed = true
    console.log(`ÉCHEC ${check.label} (${check.path}) : ${error instanceof Error ? error.name : 'erreur'}`)
  }
}
process.exit(failed ? 1 : 0)
