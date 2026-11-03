import { TILE_SIZE, type Point } from './grid'

export interface TileMap {
  readonly width: number
  readonly height: number
  /** Identifiant de tuile par case, ligne par ligne. */
  readonly tiles: readonly string[]
  readonly solid: Uint8Array
}

export interface TileLegendEntry {
  tile: string
  solid: boolean
}

/** Construit une carte à partir de lignes de texte, un caractère par tuile. */
export function parseTileMap(rows: readonly string[], legend: Record<string, TileLegendEntry>): TileMap {
  const width = rows[0]?.length ?? 0
  const height = rows.length
  const tiles: string[] = []
  const solid = new Uint8Array(width * height)
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`Ligne ${y} : largeur ${row.length}, attendu ${width}`)
    for (let x = 0; x < width; x++) {
      const entry = legend[row.charAt(x)]
      if (!entry) throw new Error(`Caractère inconnu « ${row.charAt(x)} » en ${x},${y}`)
      tiles.push(entry.tile)
      solid[y * width + x] = entry.solid ? 1 : 0
    }
  })
  return { width, height, tiles, solid }
}

export function isInside(map: TileMap, tile: Point): boolean {
  return tile.x >= 0 && tile.y >= 0 && tile.x < map.width && tile.y < map.height
}

/** Hors de la carte compte comme bloqué. */
export function isSolid(map: TileMap, tile: Point): boolean {
  return !isInside(map, tile) || map.solid[tile.y * map.width + tile.x] === 1
}

export function setSolid(map: TileMap, tile: Point, solid = true): void {
  if (isInside(map, tile)) map.solid[tile.y * map.width + tile.x] = solid ? 1 : 0
}

export function tileAt(map: TileMap, tile: Point): string | undefined {
  return map.tiles[tile.y * map.width + tile.x]
}

export function worldSize(map: TileMap): { width: number; height: number } {
  return { width: map.width * TILE_SIZE, height: map.height * TILE_SIZE }
}
