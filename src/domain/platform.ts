import type { AgentDefinition, AgentId, AgentRuntime } from './agents'
import type { ActivityEvent } from './activity'
import type { Capability } from './provenance'

/**
 * Ce que le domaine attend d'un fournisseur d'agents. Hypothèse de travail,
 * à ajuster à l'étape 07 selon les capacités vérifiées sur l'instance réelle.
 */
export interface AgentPlatform {
  readonly mode: 'live' | 'mock'
  listAgents(): Promise<Capability<AgentDefinition[]>>
  getRuntime(agentId: AgentId): Promise<Capability<AgentRuntime>>
  subscribeActivity(onEvent: (event: ActivityEvent) => void): Capability<() => void>
}
