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
  runId: string | null
  summary: string | null
}

export type LocalTaskStatus = 'todo' | 'in-progress' | 'done'

/** Tâche de l'application, jamais présentée comme venant de Hermes. */
export interface LocalTask {
  id: string
  provenance: 'application'
  title: string
  details: string | null
  status: LocalTaskStatus
  assigneeId: CharacterId | null
  createdAt: string
  updatedAt: string
}

export interface EventFilter {
  agentId?: string
  provenance?: Provenance
  /** Pagination : événements strictement antérieurs à cet horodatage. */
  before?: string
  taskId?: string
  limit: number
}

/** Fusionne sans doublon, du plus récent au plus ancien. */
export function mergeEvents(current: readonly ActivityEvent[], incoming: readonly ActivityEvent[], max = 500): ActivityEvent[] {
  const byId = new Map(current.map((event) => [event.id, event]))
  for (const event of incoming) byId.set(event.id, event)
  return [...byId.values()]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id))
    .slice(0, max)
}
