import type { AgentId, CharacterId, SessionId } from './agents'
import type { Confidence, Provenance } from './provenance'

/** Événement normalisé. `id` sert de clé d'idempotence. */
export interface ActivityEvent {
  id: string
  provenance: Provenance
  confidence: Confidence
  occurredAt: string
  /** Type venant de la source, jamais réinterprété en succès. */
  type: string
  agentId: AgentId | null
  sessionId: SessionId | null
  summary: string | null
}

export type LocalTaskStatus = 'todo' | 'in-progress' | 'done'

/** Tâche de l'application, jamais présentée comme venant de Hermes. */
export interface LocalTask {
  id: string
  provenance: 'application'
  title: string
  status: LocalTaskStatus
  assigneeId: CharacterId | null
  createdAt: string
  updatedAt: string
}
