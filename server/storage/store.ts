import type { AgentBinding, AgentId, CharacterId, CharacterProfile } from '../../src/domain/agents'
import { INITIAL_CHARACTERS, OFFICE_SPOTS } from '../../src/domain/spots'

export class ConflictError extends Error {}
export class NotFoundError extends Error {}

export interface CharacterUpdate {
  displayName?: string
  placement?: { tileX: number; tileY: number } | null
}

/** Données propres à l'application. Rien de ce qui appartient à Hermes n'y est copié. */
export interface Store {
  migrate(): Promise<void>
  listCharacters(): Promise<CharacterProfile[]>
  updateCharacter(id: CharacterId, update: CharacterUpdate): Promise<CharacterProfile>
  listBindings(): Promise<AgentBinding[]>
  /** Un personnage a au plus un agent, et un agent au plus un personnage. */
  setBinding(characterId: CharacterId, agentId: AgentId): Promise<AgentBinding>
  removeBinding(characterId: CharacterId): Promise<void>
  ping(): Promise<void>
  close(): Promise<void>
}

export function initialProfiles(): CharacterProfile[] {
  return INITIAL_CHARACTERS.map((character) => {
    const spot = OFFICE_SPOTS.find((candidate) => candidate.id === character.spotId)!
    return {
      id: character.id as CharacterId,
      spriteId: character.spriteId,
      displayName: character.displayName,
      placement: { tileX: spot.tileX, tileY: spot.tileY },
    }
  })
}

export class MemoryStore implements Store {
  private readonly characters = new Map<string, CharacterProfile>()
  private readonly bindings = new Map<string, AgentBinding>()

  async migrate(): Promise<void> {
    if (this.characters.size > 0) return
    for (const profile of initialProfiles()) this.characters.set(profile.id, profile)
  }

  async listCharacters(): Promise<CharacterProfile[]> {
    return [...this.characters.values()]
  }

  async updateCharacter(id: CharacterId, update: CharacterUpdate): Promise<CharacterProfile> {
    const current = this.characters.get(id)
    if (!current) throw new NotFoundError('Personnage introuvable')
    if (update.placement) {
      const taken = [...this.characters.values()].some((other) => other.id !== id
        && other.placement?.tileX === update.placement?.tileX && other.placement?.tileY === update.placement?.tileY)
      if (taken) throw new ConflictError('Cet emplacement est déjà occupé')
    }
    const next = { ...current, ...update }
    this.characters.set(id, next)
    return next
  }

  async listBindings(): Promise<AgentBinding[]> {
    return [...this.bindings.values()]
  }

  async setBinding(characterId: CharacterId, agentId: AgentId): Promise<AgentBinding> {
    if (!this.characters.has(characterId)) throw new NotFoundError('Personnage introuvable')
    for (const binding of this.bindings.values()) {
      if (binding.agentId === agentId && binding.characterId !== characterId) {
        throw new ConflictError('Cet agent est déjà associé à un autre personnage')
      }
    }
    const binding: AgentBinding = { characterId, agentId, createdAt: new Date().toISOString() }
    this.bindings.set(characterId, binding)
    return binding
  }

  async removeBinding(characterId: CharacterId): Promise<void> {
    this.bindings.delete(characterId)
  }

  async ping(): Promise<void> {}

  async close(): Promise<void> {}
}
