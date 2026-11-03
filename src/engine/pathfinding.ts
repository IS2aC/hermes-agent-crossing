import type { Point } from './grid'
import { isSolid, type TileMap } from './tilemap'

const NEIGHBORS: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/** A* en 4 directions, déterministe. Renvoie le chemin avec départ et arrivée, ou null. */
export function findPath(map: TileMap, start: Point, goal: Point): Point[] | null {
  if (isSolid(map, start) || isSolid(map, goal)) return null
  const key = (p: Point) => p.y * map.width + p.x
  const open: { point: Point; score: number; order: number }[] = [
    { point: start, score: manhattan(start, goal), order: 0 },
  ]
  const cameFrom = new Map<number, Point>()
  const cost = new Map<number, number>([[key(start), 0]])
  let order = 0

  while (open.length > 0) {
    open.sort((a, b) => a.score - b.score || a.order - b.order)
    const current = open.shift()!.point
    if (current.x === goal.x && current.y === goal.y) {
      const path = [current]
      let cursor = cameFrom.get(key(current))
      while (cursor) {
        path.unshift(cursor)
        cursor = cameFrom.get(key(cursor))
      }
      return path
    }
    for (const offset of NEIGHBORS) {
      const next = { x: current.x + offset.x, y: current.y + offset.y }
      if (isSolid(map, next)) continue
      const nextCost = cost.get(key(current))! + 1
      if (nextCost >= (cost.get(key(next)) ?? Infinity)) continue
      cost.set(key(next), nextCost)
      cameFrom.set(key(next), current)
      open.push({ point: next, score: nextCost + manhattan(next, goal), order: ++order })
    }
  }
  return null
}
