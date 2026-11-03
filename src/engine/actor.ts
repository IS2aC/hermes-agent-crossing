import { moveWithCollision } from './collision'
import { tileCenter, worldToTile, type Point } from './grid'
import { findPath } from './pathfinding'
import type { TileMap } from './tilemap'

export type Facing = 'down' | 'left' | 'right' | 'up'

export interface Actor {
  /** Position des pieds, en pixels du monde. */
  x: number
  y: number
  facing: Facing
  /** Vitesse en pixels du monde par seconde. */
  speed: number
  path: Point[]
  moving: boolean
}

export function createActor(tile: Point, speed = 48, facing: Facing = 'down'): Actor {
  const { x, y } = tileCenter(tile)
  return { x, y, facing, speed, path: [], moving: false }
}

export function facingFromDelta(delta: Point, fallback: Facing): Facing {
  if (delta.x === 0 && delta.y === 0) return fallback
  if (Math.abs(delta.x) > Math.abs(delta.y)) return delta.x > 0 ? 'right' : 'left'
  return delta.y > 0 ? 'down' : 'up'
}

/** Demande un trajet ; renvoie false si la case est inaccessible. */
export function navigateTo(actor: Actor, map: TileMap, goal: Point): boolean {
  const path = findPath(map, worldToTile(actor), goal)
  if (!path) return false
  actor.path = path
  return true
}

function followPath(actor: Actor, seconds: number): void {
  let budget = actor.speed * seconds
  while (budget > 0 && actor.path.length > 0) {
    const target = tileCenter(actor.path[0]!)
    const dx = target.x - actor.x
    const dy = target.y - actor.y
    const distance = Math.hypot(dx, dy)
    if (distance > 0) actor.facing = facingFromDelta({ x: dx, y: dy }, actor.facing)
    if (distance <= budget) {
      actor.x = target.x
      actor.y = target.y
      budget -= distance
      actor.path.shift()
    } else {
      actor.x += (dx / distance) * budget
      actor.y += (dy / distance) * budget
      budget = 0
    }
    actor.moving = true
  }
}

/** Le contrôle direct a priorité sur un trajet en cours et l'annule. */
export function updateActor(actor: Actor, map: TileMap, seconds: number, input: Point = { x: 0, y: 0 }): void {
  actor.moving = false
  if (input.x !== 0 || input.y !== 0) {
    actor.path = []
    const length = Math.hypot(input.x, input.y)
    const distance = actor.speed * seconds
    const next = moveWithCollision(map, actor, {
      x: (input.x / length) * distance,
      y: (input.y / length) * distance,
    })
    actor.moving = next.x !== actor.x || next.y !== actor.y
    actor.x = next.x
    actor.y = next.y
    actor.facing = facingFromDelta(input, actor.facing)
    return
  }
  followPath(actor, seconds)
}
