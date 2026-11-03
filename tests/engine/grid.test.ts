import { describe, expect, it } from 'vitest'
import { TILE_SIZE, tileCenter, tileToWorld, worldToTile } from '../../src/engine/grid'

describe('grille', () => {
  it('convertit un point du monde en tuile, y compris aux frontières', () => {
    expect(worldToTile({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(worldToTile({ x: TILE_SIZE - 0.01, y: TILE_SIZE })).toEqual({ x: 0, y: 1 })
  })

  it('arrondit vers le bas pour les coordonnées négatives', () => {
    expect(worldToTile({ x: -1, y: -17 })).toEqual({ x: -1, y: -2 })
  })

  it('fait revenir une tuile à elle-même depuis son origine et son centre', () => {
    const tile = { x: 3, y: 7 }
    expect(worldToTile(tileToWorld(tile))).toEqual(tile)
    expect(worldToTile(tileCenter(tile))).toEqual(tile)
  })
})
