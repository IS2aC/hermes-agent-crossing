import type { Sourced } from './provenance'

export type CharacterId = string & { readonly __brand: 'CharacterId' }
export type AgentId = string & { readonly __brand: 'AgentId' }
export type SessionId = string & { readonly __brand: 'SessionId' }

/** Identité visuelle locale. Peut exister sans agent associé. */
export interface CharacterProfile {
  id: CharacterId
  /** Identifiant stable du catalogue d'assets, par exemple `character.jarvis`. */
  spriteId: string
  displayName: string
  placement: { tileX: number; tileY: number } | null
}

/** Agent réellement identifié dans Hermes. Sa forme sera confirmée à l'étape 07. */
export interface AgentDefinition {
  id: AgentId
  name: string
  description: string | null
  model: string | null
  provider: string | null
}

/** Ce que l'on sait de l'agent, sans aucune mise en scène. */
export type ObservedAgentState =
  | 'idle'
  | 'working'
  | 'thinking'
  | 'waiting'
  | 'error'
  | 'unavailable'
  | 'unknown'

/** État observé d'une instance ou d'une session. */
export interface AgentRuntime {
  agentId: AgentId
  sessionId: SessionId | null
  state: Sourced<ObservedAgentState>
  lastActivityAt: string | null
}

/** Lien explicite entre un personnage et un agent, conservé si l'agent disparaît. */
export interface AgentBinding {
  characterId: CharacterId
  agentId: AgentId
  createdAt: string
}
