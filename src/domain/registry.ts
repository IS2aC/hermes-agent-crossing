import type { AgentId, AgentRuntime, CharacterProfile } from './agents'
import type { DiscoveredAgent } from './platform'
import type { Capability } from './provenance'

/** État du lien vu depuis un personnage. Rien n'est « connecté » sans preuve. */
export type LinkState =
  | 'none' // Personnage sans agent associé.
  | 'connected' // L'agent associé a répondu à la dernière vérification.
  | 'unreachable' // L'agent associé est configuré, mais ne répond pas.
  | 'missing' // L'agent associé n'existe plus ; le lien est conservé.
  | 'unknown' // La découverte elle-même a échoué.

export interface CharacterEntry {
  profile: CharacterProfile
  agentId: AgentId | null
  link: LinkState
}

export interface AgentEntry extends DiscoveredAgent {
  runtime: Capability<AgentRuntime>
  characterId: string | null
}

export interface RegistryView {
  mode: 'live' | 'mock'
  agents: Capability<AgentEntry[]>
  characters: CharacterEntry[]
  spots: { id: string; tileX: number; tileY: number }[]
}

export function linkState(agentId: AgentId | null, agents: Capability<DiscoveredAgent[]>): LinkState {
  if (agentId === null) return 'none'
  if (agents.status === 'unavailable') return 'unknown'
  const agent = agents.value.find((candidate) => candidate.definition.id === agentId)
  if (!agent) return 'missing'
  return agent.reachable ? 'connected' : 'unreachable'
}
