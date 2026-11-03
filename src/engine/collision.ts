import { worldToTile, type Point } from './grid'
import { isSolid, type TileMap } from './tilemap'

/** Boîte de collision aux pieds, relative à la position de l'acteur. */
export interface FootBox {
  left: number
  right: number
  top: number
  bottom: number
}

export const DEFAULT_FOOT_BOX: FootBox = { left: 5, right: 5, top: 4, bottom: 2 }

export function canOccupy(map: TileMap, position: Point, box: FootBox = DEFAULT_FOOT_BOX): boolean {
  const start = worldToTile({ x: position.x - box.left, y: position.y - box.top })
  const end = worldToTile({ x: position.x + box.right - 0.001, y: position.y + box.bottom - 0.001 })
  for (let y = start.y; y <= end.y; y++) {
    for (let x = start.x; x <= end.x; x++) {
      if (isSolid(map, { x, y })) return false
    }
  }
  return true
}

function moveAxis(map: TileMap, position: Point, axis: 'x' | 'y', distance: number, box: FootBox): void {
  let remaining = Math.abs(distance)
  const sign = Math.sign(distance)
  while (remaining > 0) {
    const step = Math.min(1, remaining)
    const next = { ...position, [axis]: position[axis] + sign * step }
    if (!canOccupy(map, next, box)) return
    position[axis] = next[axis]
    remaining -= step
  }
}

/** Avance axe par axe : l'acteur glisse le long d'un mur et ne le traverse jamais. */
export function moveWithCollision(map: TileMap, position: Point, delta: Point, box: FootBox = DEFAULT_FOOT_BOX): Point {
  const result = { ...position }
  moveAxis(map, result, 'x', delta.x, box)
  moveAxis(map, result, 'y', delta.y, box)
  return result
}
