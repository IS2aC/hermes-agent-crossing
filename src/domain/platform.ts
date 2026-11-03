import type { ActivityEvent } from './activity'
import type { AgentDefinition, AgentId, AgentRuntime, SessionId } from './agents'
import type { Capability } from './provenance'

export interface DiscoveredAgent {
  definition: AgentDefinition
  /** Vrai seulement si l'agent a répondu à la dernière vérification. */
  reachable: boolean
  version: string | null
  detail: string | null
}

export interface SessionSummary {
  id: SessionId
  /** Surface d'origine : api_server, telegram, cli, cron… */
  source: string
  title: string | null
  model: string | null
  startedAt: string | null
  lastActiveAt: string | null
  endedAt: string | null
  messageCount: number | null
  toolCallCount: number | null
  preview: string | null
}

export interface SessionMessage {
  id: string
  role: string
  content: string
  toolName: string | null
  at: string | null
}

export type ApprovalChoice = 'once' | 'deny'

export type RunEvent =
  | { type: 'message.delta'; delta: string }
  | { type: 'tool.started'; tool: string | null; preview: string | null }
  | { type: 'tool.completed'; tool: string | null; failed: boolean }
  | { type: 'reasoning.available' }
  | { type: 'approval.request'; command: string | null; description: string | null }
  | { type: 'approval.responded'; choice: string }
  | { type: 'run.completed'; output: string }
  | { type: 'run.failed'; error: string }
  | { type: 'run.cancelled' }

export type RunStatus = 'queued' | 'running' | 'waiting_for_approval' | 'stopping' | 'completed' | 'failed' | 'cancelled' | 'unknown'

export interface RunSnapshot {
  runId: string
  status: RunStatus
  output: string | null
  error: string | null
}

export interface StartRunRequest {
  sessionId: SessionId
  input: string
  /** Hermes v0.17 ne recharge pas l'historique d'un run : il doit être fourni. */
  history: { role: string; content: string }[]
}

export interface ScheduledJob {
  id: string
  name: string | null
  enabled: boolean | null
  nextRunAt: string | null
  lastRunAt: string | null
  lastStatus: string | null
}

/**
 * Ce que le domaine attend d'un fournisseur d'agents. Une capacité absente ou un
 * échec se traduit par `unavailable` et sa raison, jamais par une valeur plausible.
 */
export interface AgentPlatform {
  readonly mode: 'live' | 'mock'
  listAgents(): Promise<Capability<DiscoveredAgent[]>>
  getRuntime(agentId: AgentId): Promise<Capability<AgentRuntime>>
  listSessions(agentId: AgentId, options?: { limit?: number }): Promise<Capability<SessionSummary[]>>
  getSession(agentId: AgentId, sessionId: SessionId): Promise<Capability<SessionSummary>>
  listMessages(agentId: AgentId, sessionId: SessionId): Promise<Capability<SessionMessage[]>>
  createSession(agentId: AgentId, title: string | null): Promise<Capability<SessionSummary>>
  startRun(agentId: AgentId, request: StartRunRequest): Promise<Capability<{ runId: string }>>
  streamRun(agentId: AgentId, runId: string, onEvent: (event: RunEvent) => void, signal: AbortSignal): Promise<Capability<void>>
  getRun(agentId: AgentId, runId: string): Promise<Capability<RunSnapshot>>
  stopRun(agentId: AgentId, runId: string): Promise<Capability<void>>
  respondApproval(agentId: AgentId, runId: string, choice: ApprovalChoice): Promise<Capability<void>>
  listJobs(agentId: AgentId): Promise<Capability<ScheduledJob[]>>
}

export type { ActivityEvent }
