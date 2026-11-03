import { describe, expect, it } from 'vitest'
import { createActor, facingFromDelta, navigateTo, updateActor } from '../../src/engine/actor'
import { canOccupy, moveWithCollision } from '../../src/engine/collision'
import { tileCenter, worldToTile } from '../../src/engine/grid'
import { findPath } from '../../src/engine/pathfinding'
import { isSolid, parseTileMap, setSolid } from '../../src/engine/tilemap'

const legend = {
  '#': { tile: 'wall', solid: true },
  '.': { tile: 'floor', solid: false },
}

const room = () =>
  parseTileMap(
    [
      '#######',
      '#.....#',
      '#.###.#',
      '#.....#',
      '#######',
    ],
    legend,
  )

describe('carte', () => {
  it('rejette une ligne de mauvaise largeur et un caractère inconnu', () => {
    expect(() => parseTileMap(['..', '.'], legend)).toThrow(/largeur/)
    expect(() => parseTileMap(['?'], legend)).toThrow(/inconnu/)
  })

  it('considère le hors-carte comme bloqué', () => {
    expect(isSolid(room(), { x: -1, y: 0 })).toBe(true)
    expect(isSolid(room(), { x: 99, y: 1 })).toBe(true)
  })
})

describe('collisions', () => {
  it('ne traverse pas un mur, même avec un grand déplacement', () => {
    const map = room()
    const start = tileCenter({ x: 1, y: 1 })
    const end = moveWithCollision(map, start, { x: -500, y: 0 })
    expect(end.y).toBe(start.y)
    expect(worldToTile(end).x).toBe(1)
    expect(canOccupy(map, end)).toBe(true)
  })

  it('glisse le long du mur quand le déplacement est en diagonale', () => {
    const map = room()
    const start = tileCenter({ x: 2, y: 1 })
    const end = moveWithCollision(map, start, { x: 8, y: 30 })
    expect(end.x).toBe(start.x + 8)
    expect(worldToTile(end).y).toBe(1)
  })

  it('refuse une position dont la boîte chevauche un mur', () => {
    const map = room()
    const center = tileCenter({ x: 1, y: 1 })
    expect(canOccupy(map, center)).toBe(true)
    expect(canOccupy(map, { x: center.x - 8, y: center.y })).toBe(false)
  })
})

describe('recherche de chemin', () => {
  it('contourne un obstacle par le plus court chemin', () => {
    const path = findPath(room(), { x: 1, y: 1 }, { x: 5, y: 3 })
    expect(path?.[0]).toEqual({ x: 1, y: 1 })
    expect(path?.at(-1)).toEqual({ x: 5, y: 3 })
    expect(path).toHaveLength(7)
  })

  it('ne propose que des pas orthogonaux sur des cases libres', () => {
    const map = room()
    const path = findPath(map, { x: 1, y: 3 }, { x: 5, y: 1 })!
    for (let i = 1; i < path.length; i++) {
      const previous = path[i - 1]!
      const current = path[i]!
      expect(Math.abs(previous.x - current.x) + Math.abs(previous.y - current.y)).toBe(1)
      expect(isSolid(map, current)).toBe(false)
    }
  })

  it('renvoie null pour une case bloquée ou inaccessible', () => {
    const map = room()
    expect(findPath(map, { x: 1, y: 1 }, { x: 3, y: 2 })).toBeNull()
    setSolid(map, { x: 1, y: 2 })
    setSolid(map, { x: 5, y: 2 })
    expect(findPath(map, { x: 1, y: 1 }, { x: 3, y: 3 })).toBeNull()
  })

  it('accepte un départ égal à l\'arrivée', () => {
    expect(findPath(room(), { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([{ x: 1, y: 1 }])
  })
})

describe('acteur', () => {
  it('oriente le regard selon l\'axe dominant, et conserve le regard à l\'arrêt', () => {
    expect(facingFromDelta({ x: 2, y: 1 }, 'up')).toBe('right')
    expect(facingFromDelta({ x: -2, y: 1 }, 'up')).toBe('left')
    expect(facingFromDelta({ x: 1, y: -2 }, 'down')).toBe('up')
    expect(facingFromDelta({ x: 0, y: 0 }, 'left')).toBe('left')
  })

  it('suit un trajet jusqu\'au centre de la case, puis s\'arrête', () => {
    const map = room()
    const actor = createActor({ x: 1, y: 1 })
    expect(navigateTo(actor, map, { x: 5, y: 3 })).toBe(true)
    for (let i = 0; i < 600 && actor.path.length > 0; i++) {
      updateActor(actor, map, 1 / 60)
      expect(isSolid(map, worldToTile(actor))).toBe(false)
    }
    expect({ x: actor.x, y: actor.y }).toEqual(tileCenter({ x: 5, y: 3 }))
    updateActor(actor, map, 1 / 60)
    expect(actor.moving).toBe(false)
  })

  it('refuse une destination inaccessible sans changer de trajet', () => {
    const actor = createActor({ x: 1, y: 1 })
    expect(navigateTo(actor, room(), { x: 3, y: 2 })).toBe(false)
    expect(actor.path).toEqual([])
  })

  it('va à la même vitesse en diagonale qu\'en ligne droite', () => {
    const map = parseTileMap(Array(20).fill('.'.repeat(20)), legend)
    const actor = createActor({ x: 5, y: 5 }, 60)
    const start = { x: actor.x, y: actor.y }
    updateActor(actor, map, 1, { x: 1, y: 1 })
    expect(Math.hypot(actor.x - start.x, actor.y - start.y)).toBeCloseTo(60, 5)
  })

  it('annule le trajet si le contrôle direct reprend la main', () => {
    const map = room()
    const actor = createActor({ x: 1, y: 1 })
    navigateTo(actor, map, { x: 5, y: 1 })
    updateActor(actor, map, 1 / 60, { x: 1, y: 0 })
    expect(actor.path).toEqual([])
  })

  it('ne signale pas de mouvement quand il pousse contre un mur', () => {
    const map = room()
    const actor = createActor({ x: 1, y: 1 })
    for (let i = 0; i < 60; i++) updateActor(actor, map, 1 / 60, { x: -1, y: 0 })
    expect(actor.moving).toBe(false)
    expect(actor.facing).toBe('left')
  })
})
