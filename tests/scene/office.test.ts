import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { AssetManifest } from '../../src/assets/manifest'
import { canOccupy } from '../../src/engine/collision'
import { worldToTile } from '../../src/engine/grid'
import { findPath } from '../../src/engine/pathfinding'
import { isSolid, tileAt } from '../../src/engine/tilemap'
import { INITIAL_CHARACTERS, OFFICE_SPOTS } from '../../src/domain/spots'
import { createOfficeScene, createSpotActor, PLAYER_START, PROP_PLACEMENTS } from '../../src/scene/office'

const manifest: AssetManifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8'))

describe('bureau', () => {
  const scene = createOfficeScene(manifest)

  it('n\'utilise que des tuiles et objets du catalogue', () => {
    for (let y = 0; y < scene.map.height; y++) {
      for (let x = 0; x < scene.map.width; x++) {
        expect(manifest.tiles.ids).toHaveProperty([tileAt(scene.map, { x, y })!])
      }
    }
    for (const placement of PROP_PLACEMENTS) expect(manifest.props.ids).toHaveProperty([placement.id])
  })

  it('n\'utilise que des personnages du catalogue, chacun sur un emplacement connu', () => {
    for (const character of INITIAL_CHARACTERS) {
      expect(manifest.characters).toHaveProperty([character.spriteId])
      expect(OFFICE_SPOTS.map((spot) => spot.id)).toContain(character.spotId)
    }
    expect(new Set(INITIAL_CHARACTERS.map((character) => character.spotId)).size).toBe(INITIAL_CHARACTERS.length)
    expect(INITIAL_CHARACTERS).toHaveLength(7)
  })

  it('garde les meubles dans la carte, sans se superposer ni bloquer un mur', () => {
    const occupied = new Set<string>()
    for (const placement of PROP_PLACEMENTS) {
      const footprint = manifest.props.ids[placement.id]!.footprint
      if (!footprint) continue
      for (let y = 0; y < footprint[1]; y++) {
        for (let x = 0; x < footprint[0]; x++) {
          const key = `${placement.tile.x + x},${placement.tile.y + y}`
          expect(occupied.has(key), `chevauchement en ${key}`).toBe(false)
          occupied.add(key)
          expect(tileAt(scene.map, { x: placement.tile.x + x, y: placement.tile.y + y })).toMatch(/floor/)
        }
      }
    }
  })

  it('place chaque emplacement sur une position libre', () => {
    expect(canOccupy(scene.map, scene.player)).toBe(true)
    for (const spot of OFFICE_SPOTS) {
      expect(canOccupy(scene.map, createSpotActor({ x: spot.tileX, y: spot.tileY })), spot.id).toBe(true)
    }
  })

  it('laisse chaque poste accessible depuis le départ', () => {
    for (const spot of OFFICE_SPOTS) {
      expect(findPath(scene.map, PLAYER_START, worldToTile(createSpotActor({ x: spot.tileX, y: spot.tileY }))), spot.id).not.toBeNull()
    }
  })

  it('bloque les emprises de meubles', () => {
    expect(isSolid(scene.map, { x: 3, y: 3 })).toBe(true)
    expect(isSolid(scene.map, { x: 4, y: 3 })).toBe(true)
    expect(isSolid(scene.map, { x: 3, y: 4 })).toBe(false)
  })

  it('n\'affiche pas d\'objet mural comme obstacle au sol', () => {
    expect(isSolid(scene.map, { x: 9, y: 12 })).toBe(false)
  })
})
