import type { AgentId, AgentRuntime, ObservedAgentState, SessionId } from '../../../src/domain/agents'
import type {
  AgentPlatform,
  ApprovalChoice,
  DiscoveredAgent,
  RunEvent,
  RunSnapshot,
  ScheduledJob,
  SessionMessage,
  SessionSummary,
  StartRunRequest,
} from '../../../src/domain/platform'
import type { Capability } from '../../../src/domain/provenance'

const AGENTS: readonly { id: string; name: string; reachable: boolean; state: ObservedAgentState }[] = [
  { id: 'demo-jarvis', name: 'Démo JARVIS', reachable: true, state: 'idle' },
  { id: 'demo-veilleur', name: 'Démo VEILLEUR', reachable: true, state: 'idle' },
  { id: 'demo-hors-ligne', name: 'Démo hors ligne', reachable: false, state: 'unavailable' },
]

interface MockRun {
  agentId: string
  sessionId: string
  input: string
  status: RunSnapshot['status']
  output: string | null
  awaitingApproval: boolean
  resolve: ((choice: ApprovalChoice | 'stop') => void) | null
}

const available = <T>(value: T): Capability<T> => ({ status: 'available', value })
const unavailable = <T>(reason: string): Capability<T> => ({ status: 'unavailable', reason })

/**
 * Mode développement, toujours identifié comme simulé. Écrire « danger » déclenche
 * une demande d'approbation, « erreur » un échec : les parcours se testent sans Hermes.
 */
export class MockPlatform implements AgentPlatform {
  readonly mode = 'mock' as const
  private readonly sessions = new Map<string, SessionSummary>()
  private readonly messages = new Map<string, SessionMessage[]>()
  private readonly runs = new Map<string, MockRun>()
  private readonly states = new Map<string, ObservedAgentState>(AGENTS.map((agent) => [agent.id, agent.state]))
  private sequence = 0

  constructor(private readonly stepMs = 60) {
    const telegram: SessionSummary = {
      id: 'demo-telegram-1' as SessionId,
      source: 'telegram',
      title: 'Conversation Telegram simulée',
      model: 'demo',
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      endedAt: null,
      messageCount: 2,
      toolCallCount: 0,
      preview: 'Exemple simulé',
    }
    this.sessions.set(`demo-jarvis/${telegram.id}`, telegram)
    this.messages.set(`demo-jarvis/${telegram.id}`, [
      { id: 'm1', role: 'user', content: 'Message simulé venu de Telegram', toolName: null, at: telegram.startedAt },
      { id: 'm2', role: 'assistant', content: 'Réponse simulée', toolName: null, at: telegram.startedAt },
    ])
  }

  async listAgents(): Promise<Capability<DiscoveredAgent[]>> {
    return available(AGENTS.map((agent) => ({
      definition: { id: agent.id as AgentId, name: agent.name, description: 'Agent simulé', model: 'demo', provider: null },
      reachable: agent.reachable,
      version: agent.reachable ? 'mock' : null,
      detail: agent.reachable ? null : 'Agent simulé hors ligne',
    })))
  }

  async getRuntime(agentId: AgentId): Promise<Capability<AgentRuntime>> {
    const state = this.states.get(agentId)
    if (!state) return unavailable('Agent simulé inconnu')
    return available({
      agentId,
      sessionId: null,
      lastActivityAt: null,
      state: { value: state, provenance: 'simulation', confidence: { level: 'confirmed' }, observedAt: new Date().toISOString() },
    })
  }

  private agentSessions(agentId: string): SessionSummary[] {
    return [...this.sessions.entries()].filter(([key]) => key.startsWith(`${agentId}/`)).map(([, session]) => session)
  }

  async listSessions(agentId: AgentId): Promise<Capability<SessionSummary[]>> {
    return available(this.agentSessions(agentId))
  }

  async getSession(agentId: AgentId, sessionId: SessionId): Promise<Capability<SessionSummary>> {
    const session = this.sessions.get(`${agentId}/${sessionId}`)
    return session ? available(session) : unavailable('Session simulée introuvable')
  }

  async listMessages(agentId: AgentId, sessionId: SessionId): Promise<Capability<SessionMessage[]>> {
    return available(this.messages.get(`${agentId}/${sessionId}`) ?? [])
  }

  async createSession(agentId: AgentId, title: string | null): Promise<Capability<SessionSummary>> {
    const now = new Date().toISOString()
    const session: SessionSummary = {
      id: `demo-session-${++this.sequence}` as SessionId,
      source: 'api_server',
      title,
      model: 'demo',
      startedAt: now,
      lastActiveAt: now,
      endedAt: null,
      messageCount: 0,
      toolCallCount: 0,
      preview: null,
    }
    this.sessions.set(`${agentId}/${session.id}`, session)
    this.messages.set(`${agentId}/${session.id}`, [])
    return available(session)
  }

  async startRun(agentId: AgentId, request: StartRunRequest): Promise<Capability<{ runId: string }>> {
    if (agentId === 'demo-hors-ligne') return unavailable('Agent simulé hors ligne')
    const runId = `demo-run-${++this.sequence}`
    this.runs.set(runId, {
      agentId,
      sessionId: request.sessionId,
      input: request.input,
      status: 'queued',
      output: null,
      awaitingApproval: false,
      resolve: null,
    })
    return available({ runId })
  }

  async streamRun(agentId: AgentId, runId: string, onEvent: (event: RunEvent) => void, signal: AbortSignal): Promise<Capability<void>> {
    const run = this.runs.get(runId)
    if (!run) return unavailable('Run simulé introuvable')
    const pause = () => new Promise((resolve) => setTimeout(resolve, this.stepMs))
    const finish = (status: RunSnapshot['status']) => {
      run.status = status
      this.states.set(agentId, 'idle')
    }
    const key = `${agentId}/${run.sessionId}`
    const history = this.messages.get(key) ?? []
    history.push({ id: `u-${++this.sequence}`, role: 'user', content: run.input, toolName: null, at: new Date().toISOString() })
    run.status = 'running'
    this.states.set(agentId, 'thinking')
    onEvent({ type: 'reasoning.available' })
    await pause()

    if (run.input.toLowerCase().includes('erreur')) {
      finish('failed')
      onEvent({ type: 'run.failed', error: 'Échec simulé' })
      return available(undefined)
    }

    this.states.set(agentId, 'working')
    onEvent({ type: 'tool.started', tool: 'outil_simulé', preview: 'Action simulée' })
    await pause()
    onEvent({ type: 'tool.completed', tool: 'outil_simulé', failed: false })

    if (run.input.toLowerCase().includes('danger')) {
      run.status = 'waiting_for_approval'
      run.awaitingApproval = true
      this.states.set(agentId, 'waiting')
      onEvent({ type: 'approval.request', command: 'commande simulée', description: 'Demande simulée, rien ne sera exécuté' })
      const decision = await new Promise<ApprovalChoice | 'stop'>((resolve) => {
        run.resolve = resolve
        signal.addEventListener('abort', () => resolve('stop'), { once: true })
      })
      run.awaitingApproval = false
      if (decision === 'stop') {
        finish('cancelled')
        onEvent({ type: 'run.cancelled' })
        return available(undefined)
      }
      onEvent({ type: 'approval.responded', choice: decision })
      run.status = 'running'
      this.states.set(agentId, 'working')
    }

    const reply = `Réponse simulée à : ${run.input}`
    for (const part of reply.match(/.{1,12}/gs) ?? []) {
      if (signal.aborted || (run.status as RunSnapshot['status']) === 'stopping') {
        finish('cancelled')
        onEvent({ type: 'run.cancelled' })
        return available(undefined)
      }
      onEvent({ type: 'message.delta', delta: part })
      await pause()
    }
    run.output = reply
    finish('completed')
    history.push({ id: `a-${++this.sequence}`, role: 'assistant', content: reply, toolName: null, at: new Date().toISOString() })
    onEvent({ type: 'run.completed', output: reply })
    return available(undefined)
  }

  async getRun(_agentId: AgentId, runId: string): Promise<Capability<RunSnapshot>> {
    const run = this.runs.get(runId)
    return run
      ? available({ runId, status: run.status, output: run.output, error: run.status === 'failed' ? 'Échec simulé' : null })
      : unavailable('Run simulé introuvable')
  }

  async stopRun(_agentId: AgentId, runId: string): Promise<Capability<void>> {
    const run = this.runs.get(runId)
    if (!run) return unavailable('Run simulé introuvable')
    if (run.awaitingApproval) run.resolve?.('stop')
    run.status = 'stopping'
    return available(undefined)
  }

  async respondApproval(_agentId: AgentId, runId: string, choice: ApprovalChoice): Promise<Capability<void>> {
    const run = this.runs.get(runId)
    if (!run?.awaitingApproval) return unavailable('Aucune approbation en attente')
    run.resolve?.(choice)
    return available(undefined)
  }

  async listJobs(): Promise<Capability<ScheduledJob[]>> {
    return available([])
  }
}
