// Salle et sprites de Claude-Office (W17ANT, MIT, voir public/assets/skin-source/LICENSE.txt).
// Les positions, les hauteurs et la zone de marche viennent de son src/rooms.ts et de son src/assets.ts.
// La plaque de la porte est retouchée par tools/art/retouch-room.mjs.
import type { VisualState } from '../characters/animation'
import type { Facing } from '../engine/actor'
import { TILE_SIZE, type Point } from '../engine/grid'
import { parseTileMap, type TileMap } from '../engine/tilemap'

export const WORLD = { width: 800, height: 600 }
export const ROOM_FILE = 'rooms/office-day.png'
export const CHARACTER_HEIGHT = 78
export const VISITOR_SPRITE = 'character.master'

export type Pose = 'front-left' | 'front-right' | 'rear-left' | 'rear-right'
export const POSES: readonly Pose[] = ['front-left', 'front-right', 'rear-left', 'rear-right']

const SPRITES = {
  'desk-left-front': { file: 'furniture/standing-desk-left-front.png', height: 106 },
  'desk-left-rear': { file: 'furniture/standing-desk-left-rear.png', height: 102 },
  'desk-right-front': { file: 'furniture/standing-desk-right-front.png', height: 106 },
  'desk-right-rear': { file: 'furniture/standing-desk-right-rear.png', height: 102 },
  filing: { file: 'furniture/filling-closed.png', height: 56 },
  coffee: { file: 'appliances/coffee-off.png', height: 51 },
  monstera: { file: 'decoration/monstera-plant.png', height: 71 },
  snake: { file: 'decoration/snake-plant.png', height: 63 },
  money: { file: 'decoration/money-tree.png', height: 63 },
  printer: { file: 'decoration/printer-working.png', height: 69 },
} as const

export type FurnitureSprite = keyof typeof SPRITES

export interface FurnitureItem {
  sprite: FurnitureSprite
  /** Pied de l'objet, en pourcentage de la salle. */
  x: number
  y: number
}

export const FURNITURE: readonly FurnitureItem[] = [
  { sprite: 'desk-left-rear', x: 42.4, y: 50.4 },
  { sprite: 'desk-left-front', x: 46.7, y: 53 },
  { sprite: 'desk-right-front', x: 39.9, y: 55.2 },
  { sprite: 'desk-left-rear', x: 31.4, y: 64.8 },
  { sprite: 'desk-left-front', x: 35.4, y: 67.5 },
  { sprite: 'desk-right-front', x: 27.9, y: 70 },
  { sprite: 'desk-left-rear', x: 59, y: 73.7 },
  { sprite: 'desk-left-front', x: 62.6, y: 76 },
  { sprite: 'desk-right-front', x: 55.4, y: 78.7 },
  { sprite: 'desk-right-rear', x: 66.6, y: 71.1 },
  { sprite: 'coffee', x: 78.5, y: 50.2 },
  { sprite: 'filing', x: 45, y: 56.5 },
  { sprite: 'monstera', x: 91.9, y: 64.7 },
  { sprite: 'snake', x: 43.2, y: 37.9 },
  { sprite: 'money', x: 32, y: 71.2 },
  { sprite: 'money', x: 89.2, y: 65.7 },
  { sprite: 'monstera', x: 60.2, y: 80.4 },
  { sprite: 'printer', x: 85.4, y: 56.8 },
]

export function furnitureSprite(sprite: FurnitureSprite) {
  return SPRITES[sprite]
}

export interface DeskSpot {
  x: number
  y: number
  pose: Pose
  /** Profondeur, pour passer devant ou derrière le bureau. */
  depth: number
}

/** Les 7 postes du registre, posés sur les emplacements de bureau de la salle source. */
const DESK_SPOTS: Readonly<Record<string, DeskSpot>> = {
  '3,4': { x: 25.8, y: 71, pose: 'rear-left', depth: 85 },
  '7,4': { x: 37.9, y: 68.2, pose: 'rear-right', depth: 85 },
  '11,4': { x: 26.9, y: 59.2, pose: 'front-left', depth: 40 },
  '3,8': { x: 38.5, y: 55.2, pose: 'rear-left', depth: 58 },
  '7,8': { x: 48.9, y: 52.9, pose: 'rear-right', depth: 70 },
  '11,8': { x: 52.7, y: 78.8, pose: 'rear-left', depth: 95 },
  '7,12': { x: 65.9, y: 75.8, pose: 'rear-right', depth: 95 },
}

export function deskSpotForTile(tile: Point): DeskSpot | null {
  return DESK_SPOTS[`${tile.x},${tile.y}`] ?? null
}

/** Aucun fichier `Me-*`, `Helper` ou `TEMPLATE` : ils pourraient représenter de vraies personnes. */
const CHARACTER_FILES: Readonly<Record<string, string>> = {
  'character.master': 'employee-1',
  'character.jarvis': 'dev-1',
  'character.veilleur': 'explore-1',
  'character.data-analyst': 'employee-2',
  'character.devops': 'dev-2',
  'character.developer': 'Frontend-dev-1',
  'character.researcher': 'employee-3',
  'character.security': 'security-audit-1',
}

export function characterFile(spriteId: string, pose: Pose): string {
  return `characters/${CHARACTER_FILES[spriteId] ?? CHARACTER_FILES[VISITOR_SPRITE]}-${pose}.png`
}

export function allFiles(): string[] {
  return [
    ROOM_FILE,
    ...Object.values(SPRITES).map((sprite) => sprite.file),
    ...Object.keys(CHARACTER_FILES).flatMap((id) => POSES.map((pose) => characterFile(id, pose))),
  ]
}

/** La source n'a que des poses diagonales : chaque direction prend la plus proche. */
const POSE_BY_FACING: Readonly<Record<Facing, Pose>> = {
  right: 'front-left',
  down: 'front-right',
  left: 'rear-left',
  up: 'rear-right',
}

export function poseForFacing(facing: Facing): Pose {
  return POSE_BY_FACING[facing]
}

const WALKABLE_AREA: readonly Point[] = [
  { x: 28.2, y: 46 }, { x: 33, y: 50.2 }, { x: 20.6, y: 60.9 }, { x: 21.8, y: 65.5 }, { x: 32, y: 71.4 },
  { x: 41.6, y: 62.7 }, { x: 40.8, y: 58.1 }, { x: 45.5, y: 56.3 }, { x: 49.3, y: 54.5 }, { x: 51.3, y: 52.2 },
  { x: 51.9, y: 49.3 }, { x: 51.5, y: 46.7 }, { x: 57.9, y: 47.3 }, { x: 64.2, y: 47.4 }, { x: 70, y: 49.9 },
  { x: 71.2, y: 55.4 }, { x: 78.8, y: 60.7 }, { x: 86.7, y: 65.6 }, { x: 82.6, y: 72.8 }, { x: 71.5, y: 68.4 },
  { x: 59.5, y: 57.1 }, { x: 54.7, y: 61.9 }, { x: 51.4, y: 65.9 }, { x: 49.8, y: 70.1 }, { x: 50, y: 75.3 },
  { x: 54.3, y: 78.2 }, { x: 58.1, y: 80 }, { x: 62.5, y: 78.9 }, { x: 64.9, y: 76 }, { x: 68.4, y: 73.3 },
  { x: 70.4, y: 71.1 }, { x: 71.7, y: 69.3 }, { x: 82.7, y: 73.4 }, { x: 54.3, y: 93.6 }, { x: 37.6, y: 84 },
  { x: 23.5, y: 75.6 }, { x: 12.6, y: 68.8 }, { x: 3.9, y: 62.9 }, { x: 33.7, y: 42.4 }, { x: 35.5, y: 48.6 },
  { x: 33, y: 50.2 }, { x: 28.7, y: 46.3 },
]

export function isWalkable(percent: Point): boolean {
  let inside = false
  for (let i = 0, j = WALKABLE_AREA.length - 1; i < WALKABLE_AREA.length; j = i++) {
    const a = WALKABLE_AREA[i]!
    const b = WALKABLE_AREA[j]!
    if (a.y > percent.y !== b.y > percent.y && percent.x < ((b.x - a.x) * (percent.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export function toPercent(world: Point): Point {
  return { x: (world.x / WORLD.width) * 100, y: (world.y / WORLD.height) * 100 }
}

export function toWorld(percent: Point): Point {
  return { x: (percent.x / 100) * WORLD.width, y: (percent.y / 100) * WORLD.height }
}

/** Une grille invisible sur la zone de marche : le moteur garde ses collisions et son A*. */
export function createWalkMap(): TileMap {
  const columns = Math.ceil(WORLD.width / TILE_SIZE)
  const rows = Math.ceil(WORLD.height / TILE_SIZE)
  const lines = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: columns }, (_, x) =>
      isWalkable(toPercent({ x: (x + 0.5) * TILE_SIZE, y: (y + 0.5) * TILE_SIZE })) ? '.' : '#').join(''))
  return parseTileMap(lines, {
    '.': { tile: 'floor', solid: false },
    '#': { tile: 'blocked', solid: true },
  })
}

const BOB: Partial<Record<VisualState, { amplitude: number; hertz: number }>> = {
  idle: { amplitude: 0.6, hertz: 0.5 },
  walk: { amplitude: 2, hertz: 4 },
  work: { amplitude: 1, hertz: 2 },
  think: { amplitude: 0.8, hertz: 1 },
}

/** La source n'a pas d'images d'animation : le corps oscille. Un état neutre reste immobile. */
export function bobFor(state: VisualState, seconds: number): number {
  const bob = BOB[state]
  return bob ? Math.abs(Math.sin(seconds * bob.hertz * Math.PI)) * bob.amplitude : 0
}
