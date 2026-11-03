/** Taille d'une tuile, en pixels du monde. */
export const TILE_SIZE = 16

export interface Point {
  x: number
  y: number
}

/** Origine en haut à gauche, x vers la droite, y vers le bas. */
export function worldToTile(world: Point): Point {
  return { x: Math.floor(world.x / TILE_SIZE), y: Math.floor(world.y / TILE_SIZE) }
}

export function tileToWorld(tile: Point): Point {
  return { x: tile.x * TILE_SIZE, y: tile.y * TILE_SIZE }
}

export function tileCenter(tile: Point): Point {
  return { x: tile.x * TILE_SIZE + TILE_SIZE / 2, y: tile.y * TILE_SIZE + TILE_SIZE / 2 }
}
