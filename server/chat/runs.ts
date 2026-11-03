import type { AgentId, SessionId } from '../../src/domain/agents'
import type { SequencedRunEvent } from '../../src/domain/chat'
import type { AgentPlatform, RunEvent } from '../../src/domain/platform'

const TERMINAL = new Set<RunEvent['type']>(['run.completed', 'run.failed', 'run.cancelled'])
const MAX_FINISHED_RUNS = 100

export interface TrackedRun {
  runId: string
  agentId: AgentId
  sessionId: SessionId
  events: SequencedRunEvent[]
  finished: boolean
  /** Vrai si la fin du run n'a pas pu être établie. */
  outcomeUnknown: boolean
  listeners: Set<(event: SequencedRunEvent) => void>
  controller: AbortController
}

export interface RunTrackerOptions {
  pollMs?: number
  maxPolls?: number
  onEvent?(run: TrackedRun, event: RunEvent): void
  onEnd?(run: TrackedRun): void
}

/**
 * Suit les runs lancés depuis l'application et garde leurs événements, pour qu'un
 * navigateur puisse se reconnecter. Hermes ne propose qu'une lecture par run.
 */
export class RunTracker {
  private readonly runs = new Map<string, TrackedRun>()
  private readonly pollMs: number
  private readonly maxPolls: number

  constructor(private readonly platform: AgentPlatform, private readonly options: RunTrackerOptions = {}) {
    this.pollMs = options.pollMs ?? 2_000
    this.maxPolls = options.maxPolls ?? 300
  }

  get(runId: string): TrackedRun | undefined {
    return this.runs.get(runId)
  }

  track(agentId: AgentId, sessionId: SessionId, runId: string): TrackedRun {
    const run: TrackedRun = {
      runId,
      agentId,
      sessionId,
      events: [],
      finished: false,
      outcomeUnknown: false,
      listeners: new Set(),
      controller: new AbortController(),
    }
    this.runs.set(runId, run)
    void this.follow(run)
    this.evictFinished()
    return run
  }

  /** Attend la fin de tous les suivis : utile aux tests et à l'arrêt du serveur. */
  async finished(run: TrackedRun): Promise<void> {
    if (run.finished) return
    await new Promise<void>((resolve) => {
      const listener = () => {
        if (run.finished) {
          run.listeners.delete(listener)
          resolve()
        }
      }
      run.listeners.add(listener)
    })
  }

  stopAll(): void {
    for (const run of this.runs.values()) run.controller.abort()
  }

  private emit(run: TrackedRun, event: RunEvent): void {
    if (run.finished) return
    if (TERMINAL.has(event.type)) run.finished = true
    const sequenced = { seq: run.events.length + 1, event }
    run.events.push(sequenced)
    this.options.onEvent?.(run, event)
    for (const listener of [...run.listeners]) listener(sequenced)
    if (run.finished) this.options.onEnd?.(run)
  }

  private async follow(run: TrackedRun): Promise<void> {
    await this.platform.streamRun(run.agentId, run.runId, (event) => this.emit(run, event), run.controller.signal)
    if (!run.finished && !run.controller.signal.aborted) await this.pollUntilEnd(run)
  }

  /** Le flux s'est coupé sans fin annoncée : seul l'état final de Hermes fait foi. */
  private async pollUntilEnd(run: TrackedRun): Promise<void> {
    for (let attempt = 0; attempt < this.maxPolls && !run.controller.signal.aborted; attempt++) {
      const snapshot = await this.platform.getRun(run.agentId, run.runId)
      if (snapshot.status === 'unavailable') break
      const { status, output, error } = snapshot.value
      if (status === 'completed') return this.emit(run, { type: 'run.completed', output: output ?? '' })
      if (status === 'failed') return this.emit(run, { type: 'run.failed', error: error ?? 'Échec sans détail' })
      if (status === 'cancelled') return this.emit(run, { type: 'run.cancelled' })
      if (status === 'unknown') break
      await new Promise((resolve) => setTimeout(resolve, this.pollMs))
    }
    run.outcomeUnknown = true
    this.emit(run, { type: 'run.failed', error: 'Résultat inconnu : le suivi de ce run a été perdu. L\'agent a peut-être terminé.' })
  }

  private evictFinished(): void {
    const finished = [...this.runs.values()].filter((run) => run.finished)
    for (const run of finished.slice(0, Math.max(0, finished.length - MAX_FINISHED_RUNS))) this.runs.delete(run.runId)
  }
}
