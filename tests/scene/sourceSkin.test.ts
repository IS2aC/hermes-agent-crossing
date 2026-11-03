import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { findPath } from '../../src/engine/pathfinding'
import { worldToTile } from '../../src/engine/grid'
import { isSolid } from '../../src/engine/tilemap'
import { OFFICE_SPOTS } from '../../src/domain/spots'
import { allFiles, bobFor, createWalkMap, deskSpotForTile, isWalkable, poseForFacing, toWorld } from '../../src/scene/sourceSkin'

describe('essai des sprites de Claude-Office', () => {
  it('tous les fichiers déclarés existent, licence comprise', () => {
    for (const file of [...allFiles(), 'LICENSE.txt', 'NOTICE.md']) {
      expect(existsSync(`public/assets/skin-source/${file}`), file).toBe(true)
    }
  })

  it('aucun fichier exclu ou représentant peut-être une vraie personne', () => {
    for (const file of allFiles()) expect(file).not.toMatch(/office\/|-dm\.|\/Me-|Helper|TEMPLATE/)
  })

  it('chaque poste du registre a un emplacement dans la salle', () => {
    for (const spot of OFFICE_SPOTS) expect(deskSpotForTile({ x: spot.tileX, y: spot.tileY }), spot.id).not.toBeNull()
  })

  it('un emplacement inconnu reste inconnu', () => {
    expect(deskSpotForTile({ x: 99, y: 99 })).toBeNull()
  })

  it('les 4 directions donnent 4 poses différentes', () => {
    const poses = (['down', 'left', 'right', 'up'] as const).map(poseForFacing)
    expect(new Set(poses).size).toBe(4)
  })

  it('un état neutre reste parfaitement immobile', () => {
    for (const state of ['unknown', 'unavailable', 'unbound', 'waiting'] as const) {
      for (const seconds of [0.3, 1.1, 2.7]) expect(bobFor(state, seconds)).toBe(0)
    }
    expect(bobFor('work', 0.25)).toBeGreaterThan(0)
  })

  it('le visiteur part du sol et peut traverser la salle', () => {
    const map = createWalkMap()
    expect(isWalkable({ x: 30, y: 76 })).toBe(true)
    expect(isWalkable({ x: 2, y: 2 })).toBe(false)
    const start = worldToTile(toWorld({ x: 30, y: 76 }))
    const goal = worldToTile(toWorld({ x: 75, y: 66 }))
    expect(isSolid(map, start)).toBe(false)
    expect(findPath(map, start, goal)).not.toBeNull()
  })
})
