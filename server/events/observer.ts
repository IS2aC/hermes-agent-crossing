import type { ActivityEvent } from '../../src/domain/activity'
import type { AgentId, SessionId } from '../../src/domain/agents'
import { WRITABLE_SOURCE } from '../../src/domain/chat'
import type { AgentPlatform, RunEvent, ScheduledJob, SessionSummary } from '../../src/domain/platform'
import type { Provenance } from '../../src/domain/provenance'
import type { EventBus } from './bus'

const CHANGE_RULE = 'les compteurs de cette session ont changé entre deux lectures'

function sessionFingerprint(session: SessionSummary): string {
  return `${session.messageCount ?? '?'}:${session.toolCallCount ?? '?'}:${session.lastActiveAt ?? '?'}`
}

function jobFingerprint(job: ScheduledJob): string {
  return `${job.lastRunAt ?? '?'}:${job.lastStatus ?? '?'}`
}

/** Un événement de run devient une ligne de journal. Le texte de la réponse n'y est pas copié. */
export function runEventToActivity(
  agentId: AgentId,
  sessionId: SessionId,
  runId: string,
  seq: number,
  event: RunEvent,
  provenance: Provenance,
  occurredAt: string,
): ActivityEvent | null {
  const base = {
    id: `run:${runId}:${seq}`,
    provenance,
    confidence: { level: 'confirmed' } as const,
    occurredAt,
    type: event.type,
    agentId,
    sessionId,
    runId,
  }
  switch (event.type) {
    case 'message.delta':
      return null
    case 'reasoning.available':
      return { ...base, summary: 'Réflexion signalée' }
    case 'tool.started':
      return { ...base, summary: `Outil lancé : ${event.tool ?? 'inconnu'}` }
    case 'tool.completed':
      return { ...base, summary: `Outil ${event.failed ? 'en échec' : 'terminé'} : ${event.tool ?? 'inconnu'}` }
    case 'approval.request':
      return { ...base, summary: 'Autorisation demandée' }
    case 'approval.responded':
      return { ...base, summary: `Réponse à l'autorisation : ${event.choice}` }
    case 'run.completed':
      return { ...base, summary: 'Run terminé' }
    case 'run.failed':
      return { ...base, summary: 'Run en échec' }
    case 'run.cancelled':
      return { ...base, summary: 'Run annulé' }
    default:
      return null
  }
}

/**
 * Hermes n'a pas de flux global d'activité. En relisant régulièrement ses sessions et
 * ses tâches planifiées, on voit que Telegram, le CLI ou le cron ont avancé : avec du
 * retard, et sans savoir ce que l'agent fait à cet instant.
 */
export class ActivityObserver {
  private readonly sessions = new Map<string, Map<string, string>>()
  private readonly jobs = new Map<string, Map<string, string>>()
  private readonly interrupted = new Set<string>()
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly platform: AgentPlatform,
    private readonly bus: EventBus,
    private readonly options: { intervalMs?: number; now?: () => number } = {},
  ) {}

  private get provenance(): Provenance {
    return this.platform.mode === 'mock' ? 'simulation' : 'hermes'
  }

  private nowIso(): string {
    return new Date((this.options.now ?? Date.now)()).toISOString()
  }

  start(): void {
    const tick = () => {
      void this.poll().catch(() => undefined)
    }
    tick()
    this.timer = setInterval(tick, this.options.intervalMs ?? 15_000)
    this.timer.unref()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async poll(): Promise<void> {
    const agents = await this.platform.listAgents()
    if (agents.status === 'unavailable') return
    await Promise.all(agents.value.map((agent) => this.pollAgent(agent.definition.id)))
  }

  private async pollAgent(agentId: AgentId): Promise<void> {
    const sessions = await this.platform.listSessions(agentId, { limit: 50 })
    await this.reportGap(agentId, sessions.status === 'unavailable')
    if (sessions.status === 'available') await this.diffSessions(agentId, sessions.value)
    const jobs = await this.platform.listJobs(agentId)
    if (jobs.status === 'available') await this.diffJobs(agentId, jobs.value)
  }

  /** Signale un trou dans le journal, une fois au début et une fois à la fin. Rien n'est comblé. */
  private async reportGap(agentId: AgentId, failing: boolean): Promise<void> {
    if (failing === this.interrupted.has(agentId)) return
    const at = this.nowIso()
    if (failing) this.interrupted.add(agentId)
    else this.interrupted.delete(agentId)
    await this.bus.publish({
      id: `observer:${agentId}:${failing ? 'lost' : 'back'}:${at}`,
      provenance: 'application',
      confidence: { level: 'confirmed' },
      occurredAt: at,
      type: failing ? 'observer.interrupted' : 'observer.resumed',
      agentId,
      sessionId: null,
      runId: null,
      summary: failing
        ? 'Observation interrompue : une activité pendant cette période ne sera pas visible'
        : 'Observation reprise',
    })
  }

  private async diffSessions(agentId: AgentId, sessions: readonly SessionSummary[]): Promise<void> {
    const known = this.sessions.get(agentId)
    const next = new Map(sessions.map((session) => [session.id as string, sessionFingerprint(session)]))
    this.sessions.set(agentId, next)
    // La première lecture sert de référence : l'historique n'est pas présenté comme une activité récente.
    if (!known) return
    for (const session of sessions) {
      const fingerprint = next.get(session.id)!
      if (known.get(session.id) === fingerprint) continue
      // Les sessions de l'application sont déjà suivies, en détail, par leur run.
      if (session.source === WRITABLE_SOURCE) continue
      await this.bus.publish({
        id: `session:${agentId}:${session.id}:${fingerprint}`,
        provenance: this.provenance,
        confidence: { level: 'inferred', rule: CHANGE_RULE },
        occurredAt: session.lastActiveAt ?? this.nowIso(),
        type: 'session.activity',
        agentId,
        sessionId: session.id,
        runId: null,
        summary: `Activité ${session.source} : ${session.messageCount ?? '?'} messages, ${session.toolCallCount ?? '?'} appels d'outils`,
      })
    }
  }

  private async diffJobs(agentId: AgentId, jobs: readonly ScheduledJob[]): Promise<void> {
    const known = this.jobs.get(agentId)
    const next = new Map(jobs.map((job) => [job.id, jobFingerprint(job)]))
    this.jobs.set(agentId, next)
    if (!known) return
    for (const job of jobs) {
      const fingerprint = next.get(job.id)!
      if (known.get(job.id) === fingerprint || !job.lastRunAt) continue
      await this.bus.publish({
        id: `job:${agentId}:${job.id}:${fingerprint}`,
        provenance: this.provenance,
        confidence: { level: 'confirmed' },
        occurredAt: job.lastRunAt,
        type: 'job.run',
        agentId,
        sessionId: null,
        runId: null,
        summary: `Tâche planifiée ${job.name ?? job.id} : ${job.lastStatus ?? 'statut inconnu'}`,
      })
    }
  }
}
