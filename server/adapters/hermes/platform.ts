import type { AgentId, AgentRuntime, ObservedAgentState, SessionId } from '../../../src/domain/agents'
import type {
  AgentPlatform,
  ApprovalChoice,
  DiscoveredAgent,
  RunEvent,
  RunSnapshot,
  RunStatus,
  ScheduledJob,
  SessionMessage,
  SessionSummary,
  StartRunRequest,
} from '../../../src/domain/platform'
import type { Capability, Confidence } from '../../../src/domain/provenance'
import { HermesClient, HermesError, type HermesHealthDetailed, type HermesMessage, type HermesSession } from './client'

export interface HermesProfileConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
}

const STALE_STATUS_MS = 5 * 60_000
const KNOWN_RUN_STATUSES = new Set<RunStatus>(['queued', 'running', 'waiting_for_approval', 'stopping', 'completed', 'failed', 'cancelled'])

function secondsToIso(value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : new Date(value * 1000).toISOString()
}

function isoFromUnknown(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') return value * 1000
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

/** Convertit un échec en raison affichable : une limite de Hermes devient « indisponible ». */
async function capability<T>(action: () => Promise<T>): Promise<Capability<T>> {
  try {
    return { status: 'available', value: await action() }
  } catch (error) {
    if (error instanceof HermesError) return { status: 'unavailable', reason: error.message }
    throw error
  }
}

export function toSessionSummary(session: HermesSession): SessionSummary {
  return {
    id: session.id as SessionId,
    source: session.source ?? 'inconnue',
    title: session.title ?? null,
    model: session.model ?? null,
    startedAt: secondsToIso(session.started_at),
    lastActiveAt: secondsToIso(session.last_active),
    endedAt: secondsToIso(session.ended_at),
    messageCount: session.message_count ?? null,
    toolCallCount: session.tool_call_count ?? null,
    preview: session.preview ?? null,
  }
}

export function toSessionMessage(message: HermesMessage, index: number): SessionMessage {
  return {
    id: message.id === null || message.id === undefined ? `index-${index}` : String(message.id),
    role: message.role,
    content: typeof message.content === 'string' ? message.content : message.content ? JSON.stringify(message.content) : '',
    toolName: message.tool_name ?? null,
    at: secondsToIso(message.timestamp),
  }
}

/** Traduit un événement de run. Un type inconnu est ignoré, jamais réinterprété. */
export function toRunEvent(payload: unknown): RunEvent | null {
  if (typeof payload !== 'object' || payload === null) return null
  const event = payload as Record<string, unknown>
  const text = (value: unknown) => (typeof value === 'string' ? value : null)
  switch (event.event) {
    case 'message.delta':
      return typeof event.delta === 'string' ? { type: 'message.delta', delta: event.delta } : null
    case 'tool.started':
      return { type: 'tool.started', tool: text(event.tool), preview: text(event.preview) }
    case 'tool.completed':
      return { type: 'tool.completed', tool: text(event.tool), failed: event.error === true }
    case 'reasoning.available':
      return { type: 'reasoning.available' }
    case 'approval.request':
      return { type: 'approval.request', command: text(event.command), description: text(event.description) }
    case 'approval.responded':
      return { type: 'approval.responded', choice: text(event.choice) ?? 'inconnu' }
    case 'run.completed':
      return { type: 'run.completed', output: text(event.output) ?? '' }
    case 'run.failed':
      return { type: 'run.failed', error: text(event.error) ?? 'Échec sans détail' }
    case 'run.cancelled':
      return { type: 'run.cancelled' }
    default:
      return null
  }
}

/**
 * `active_agents` vient du fichier d'état de la gateway : il couvre aussi Telegram
 * ou le CLI, mais il ne dit pas ce que fait l'agent. L'état reste donc « déduit ».
 */
export function deriveObservedState(
  health: HermesHealthDetailed,
  now: number,
): { state: ObservedAgentState; confidence: Confidence } {
  const updatedAt = isoFromUnknown(health.updated_at)
  if (health.gateway_state !== 'running' || typeof health.active_agents !== 'number') {
    return { state: 'unknown', confidence: { level: 'unknown' } }
  }
  if (updatedAt === null || now - updatedAt > STALE_STATUS_MS) {
    return { state: 'unknown', confidence: { level: 'unknown' } }
  }
  if (health.active_agents > 0) {
    return { state: 'working', confidence: { level: 'inferred', rule: 'active_agents > 0 sur /health/detailed' } }
  }
  return { state: 'idle', confidence: { level: 'inferred', rule: 'active_agents = 0 sur /health/detailed' } }
}

export class HermesPlatform implements AgentPlatform {
  readonly mode = 'live' as const
  private readonly clients = new Map<string, { profile: HermesProfileConfig; client: HermesClient }>()
  private readonly now: () => number

  constructor(
    profiles: readonly HermesProfileConfig[],
    options: { fetch?: typeof fetch; retryDelayMs?: number; now?: () => number } = {},
  ) {
    this.now = options.now ?? Date.now
    for (const profile of profiles) {
      this.clients.set(profile.id, {
        profile,
        client: new HermesClient({
          baseUrl: profile.baseUrl,
          apiKey: profile.apiKey,
          ...(options.fetch ? { fetch: options.fetch } : {}),
          ...(options.retryDelayMs !== undefined ? { retryDelayMs: options.retryDelayMs } : {}),
        }),
      })
    }
  }

  private client(agentId: AgentId): HermesClient {
    const entry = this.clients.get(agentId)
    if (!entry) throw new HermesError('not_found', `Profil non configuré : ${agentId}`)
    return entry.client
  }

  /**
   * Hermes n'expose pas la liste de ses profils par l'API : on interroge ceux que
   * l'opérateur a configurés, et on n'affirme leur présence que s'ils répondent.
   */
  async listAgents(): Promise<Capability<DiscoveredAgent[]>> {
    const entries = [...this.clients.values()]
    const agents = await Promise.all(entries.map(async ({ profile, client }): Promise<DiscoveredAgent> => {
      const base = { id: profile.id as AgentId, name: profile.name, description: null, provider: null }
      try {
        const [health, capabilities] = await Promise.all([client.health(), client.capabilities()])
        return {
          definition: { ...base, model: capabilities.model ?? null },
          reachable: true,
          version: health.version ?? null,
          detail: null,
        }
      } catch (error) {
        if (!(error instanceof HermesError)) throw error
        return { definition: { ...base, model: null }, reachable: false, version: null, detail: error.message }
      }
    }))
    return { status: 'available', value: agents }
  }

  async getRuntime(agentId: AgentId): Promise<Capability<AgentRuntime>> {
    return capability(async () => {
      const observedAt = new Date(this.now()).toISOString()
      let health: HermesHealthDetailed
      try {
        health = await this.client(agentId).healthDetailed()
      } catch (error) {
        if (!(error instanceof HermesError) || error.kind === 'not_found') throw error
        return {
          agentId,
          sessionId: null,
          lastActivityAt: null,
          state: { value: 'unavailable', provenance: 'hermes', confidence: { level: 'confirmed' }, observedAt },
        } satisfies AgentRuntime
      }
      const { state, confidence } = deriveObservedState(health, this.now())
      return {
        agentId,
        sessionId: null,
        lastActivityAt: null,
        state: { value: state, provenance: 'hermes', confidence, observedAt },
      } satisfies AgentRuntime
    })
  }

  listSessions(agentId: AgentId, options: { limit?: number } = {}): Promise<Capability<SessionSummary[]>> {
    return capability(async () => (await this.client(agentId).listSessions(options.limit ?? 50)).map(toSessionSummary))
  }

  getSession(agentId: AgentId, sessionId: SessionId): Promise<Capability<SessionSummary>> {
    return capability(async () => toSessionSummary(await this.client(agentId).getSession(sessionId)))
  }

  listMessages(agentId: AgentId, sessionId: SessionId): Promise<Capability<SessionMessage[]>> {
    return capability(async () => (await this.client(agentId).listMessages(sessionId)).map(toSessionMessage))
  }

  createSession(agentId: AgentId, title: string | null): Promise<Capability<SessionSummary>> {
    return capability(async () => toSessionSummary(await this.client(agentId).createSession(title)))
  }

  startRun(agentId: AgentId, request: StartRunRequest): Promise<Capability<{ runId: string }>> {
    return capability(async () => ({
      runId: await this.client(agentId).startRun(request.input, request.sessionId, request.history),
    }))
  }

  streamRun(agentId: AgentId, runId: string, onEvent: (event: RunEvent) => void, signal: AbortSignal): Promise<Capability<void>> {
    return capability(async () => {
      for await (const message of this.client(agentId).runEvents(runId, signal)) {
        let payload: unknown
        try {
          payload = JSON.parse(message.data)
        } catch {
          continue
        }
        const event = toRunEvent(payload)
        if (event) onEvent(event)
      }
    })
  }

  getRun(agentId: AgentId, runId: string): Promise<Capability<RunSnapshot>> {
    return capability(async () => {
      const run = await this.client(agentId).getRun(runId)
      const status = KNOWN_RUN_STATUSES.has(run.status as RunStatus) ? (run.status as RunStatus) : 'unknown'
      return { runId: run.run_id, status, output: run.output ?? null, error: run.error ?? null }
    })
  }

  stopRun(agentId: AgentId, runId: string): Promise<Capability<void>> {
    return capability(() => this.client(agentId).stopRun(runId))
  }

  respondApproval(agentId: AgentId, runId: string, choice: ApprovalChoice): Promise<Capability<void>> {
    return capability(() => this.client(agentId).respondApproval(runId, choice))
  }

  listJobs(agentId: AgentId): Promise<Capability<ScheduledJob[]>> {
    return capability(async () => (await this.client(agentId).listJobs()).map((job) => ({
      id: job.id,
      name: job.name ?? null,
      enabled: job.enabled ?? null,
      nextRunAt: job.next_run_at ?? null,
      lastRunAt: job.last_run_at ?? null,
      lastStatus: job.last_status ?? null,
    })))
  }
}
