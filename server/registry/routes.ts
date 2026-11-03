import { Router, type Response } from 'express'
import { z } from 'zod'
import type { AgentId, CharacterId } from '../../src/domain/agents'
import type { AgentPlatform } from '../../src/domain/platform'
import type { Capability } from '../../src/domain/provenance'
import { linkState, type AgentEntry, type CharacterEntry, type RegistryView } from '../../src/domain/registry'
import { OFFICE_SPOTS } from '../../src/domain/spots'
import { ConflictError, NotFoundError, type Store } from '../storage/store'

export async function buildRegistryView(platform: AgentPlatform, store: Store): Promise<RegistryView> {
  const [discovered, characters, bindings] = await Promise.all([
    platform.listAgents(),
    store.listCharacters(),
    store.listBindings(),
  ])
  const agentOf = new Map(bindings.map((binding) => [binding.characterId as string, binding.agentId]))
  const characterOf = new Map(bindings.map((binding) => [binding.agentId as string, binding.characterId as string]))

  const characterEntries: CharacterEntry[] = characters.map((profile) => {
    const agentId = agentOf.get(profile.id) ?? null
    return { profile, agentId, link: linkState(agentId, discovered) }
  })

  let agents: Capability<AgentEntry[]>
  if (discovered.status === 'unavailable') {
    agents = discovered
  } else {
    agents = {
      status: 'available',
      value: await Promise.all(discovered.value.map(async (agent) => ({
        ...agent,
        runtime: await platform.getRuntime(agent.definition.id),
        characterId: characterOf.get(agent.definition.id) ?? null,
      }))),
    }
  }

  return {
    mode: platform.mode,
    agents,
    characters: characterEntries,
    spots: OFFICE_SPOTS.map(({ id, tileX, tileY }) => ({ id, tileX, tileY })),
  }
}

export function sendStoreError(error: unknown, response: Response): void {
  if (error instanceof NotFoundError) {
    response.status(404).json({ error: error.message })
    return
  }
  if (error instanceof ConflictError) {
    response.status(409).json({ error: error.message })
    return
  }
  throw error
}

const bindingBody = z.object({ characterId: z.string().min(1).max(64), agentId: z.string().min(1).max(64) })
const characterBody = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  spotId: z.string().max(32).nullable().optional(),
})

export function registryRoutes(platform: AgentPlatform, store: Store, onChange: () => void = () => {}): Router {
  const router = Router()

  router.get('/registry', async (_request, response, next) => {
    try {
      response.json(await buildRegistryView(platform, store))
    } catch (error) {
      next(error)
    }
  })

  router.put('/bindings', async (request, response, next) => {
    const parsed = bindingBody.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: 'Personnage et agent requis' })
      return
    }
    try {
      const agents = await platform.listAgents()
      if (agents.status === 'unavailable') {
        response.status(503).json({ error: `Découverte impossible : ${agents.reason}` })
        return
      }
      if (!agents.value.some((agent) => agent.definition.id === parsed.data.agentId)) {
        response.status(404).json({ error: 'Agent inconnu' })
        return
      }
      const binding = await store.setBinding(parsed.data.characterId as CharacterId, parsed.data.agentId as AgentId)
      onChange()
      response.json(binding)
    } catch (error) {
      try {
        sendStoreError(error, response)
      } catch (other) {
        next(other)
      }
    }
  })

  router.delete('/bindings/:characterId', async (request, response, next) => {
    try {
      await store.removeBinding(request.params.characterId as CharacterId)
      onChange()
      response.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  router.patch('/characters/:id', async (request, response, next) => {
    const parsed = characterBody.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ error: 'Modification invalide' })
      return
    }
    const { displayName, spotId } = parsed.data
    const update: Parameters<Store['updateCharacter']>[1] = {}
    if (displayName !== undefined) update.displayName = displayName
    if (spotId !== undefined) {
      const spot = spotId === null ? null : OFFICE_SPOTS.find((candidate) => candidate.id === spotId)
      if (spot === undefined) {
        response.status(400).json({ error: 'Emplacement inconnu' })
        return
      }
      update.placement = spot ? { tileX: spot.tileX, tileY: spot.tileY } : null
    }
    try {
      const profile = await store.updateCharacter(request.params.id as CharacterId, update)
      onChange()
      response.json(profile)
    } catch (error) {
      try {
        sendStoreError(error, response)
      } catch (other) {
        next(other)
      }
    }
  })

  return router
}
