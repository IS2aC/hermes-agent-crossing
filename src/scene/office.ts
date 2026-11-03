import type { AssetManifest } from '../assets/manifest'
import type { VisualState } from '../characters/animation'
import { createActor, type Actor, type Facing } from '../engine/actor'
import type { Point } from '../engine/grid'
import { parseTileMap, setSolid, type TileMap } from '../engine/tilemap'

const ROWS = [
  'TTTTTTTTTTTTTTTTTTTT',
  'TFFFFFFFFFFFFFFFFFFT',
  'T..................T',
  'T..................T',
  'T..................T',
  'T..................T',
  'T..................T',
  'T..................T',
  'T............ccccccT',
  'T............ccccccT',
  'T............ccccccT',
  'T............ccccccT',
  'T............ccccccT',
  'BBBBBBBBBBBBBBBBBBBB',
]

export const TILE_LEGEND = {
  T: { tile: 'tile.wall-top', solid: true },
  B: { tile: 'tile.wall-base', solid: true },
  F: { tile: 'tile.wall-face', solid: true },
  '.': { tile: 'tile.floor-wood', solid: false },
  c: { tile: 'tile.floor-carpet', solid: false },
}

export interface PropPlacement {
  id: string
  tile: Point
}

export const PROP_PLACEMENTS: readonly PropPlacement[] = [
  { id: 'prop.whiteboard', tile: { x: 3, y: 1 } },
  { id: 'prop.window', tile: { x: 7, y: 1 } },
  { id: 'prop.window', tile: { x: 10, y: 1 } },
  { id: 'prop.door', tile: { x: 9, y: 13 } },
  { id: 'prop.desk', tile: { x: 3, y: 3 } },
  { id: 'prop.desk', tile: { x: 7, y: 3 } },
  { id: 'prop.desk', tile: { x: 11, y: 3 } },
  { id: 'prop.desk', tile: { x: 3, y: 7 } },
  { id: 'prop.desk', tile: { x: 7, y: 7 } },
  { id: 'prop.desk', tile: { x: 11, y: 7 } },
  { id: 'prop.desk', tile: { x: 7, y: 11 } },
  { id: 'prop.water-cooler', tile: { x: 13, y: 2 } },
  { id: 'prop.bookshelf', tile: { x: 14, y: 2 } },
  { id: 'prop.coffee-counter', tile: { x: 16, y: 2 } },
  { id: 'prop.plant', tile: { x: 18, y: 2 } },
  { id: 'prop.plant', tile: { x: 1, y: 2 } },
  { id: 'prop.plant', tile: { x: 1, y: 12 } },
  { id: 'prop.printer', tile: { x: 1, y: 6 } },
  { id: 'prop.meeting-table', tile: { x: 14, y: 9 } },
  { id: 'prop.sofa', tile: { x: 14, y: 12 } },
]

export interface CastMember {
  id: string
  spriteId: string
  actor: Actor
  initialState: VisualState
}

interface CastSpot {
  spriteId: string
  deskTile: Point
  initialState: VisualState
}

/** Démonstration seulement : ces états sont des exemples, jamais l'état d'un vrai agent. */
const CAST: readonly CastSpot[] = [
  { spriteId: 'character.jarvis', deskTile: { x: 3, y: 3 }, initialState: 'work' },
  { spriteId: 'character.veilleur', deskTile: { x: 7, y: 3 }, initialState: 'think' },
  { spriteId: 'character.data-analyst', deskTile: { x: 11, y: 3 }, initialState: 'idle' },
  { spriteId: 'character.devops', deskTile: { x: 3, y: 7 }, initialState: 'unknown' },
  { spriteId: 'character.developer', deskTile: { x: 7, y: 7 }, initialState: 'work' },
  { spriteId: 'character.researcher', deskTile: { x: 11, y: 7 }, initialState: 'idle' },
  { spriteId: 'character.security', deskTile: { x: 7, y: 11 }, initialState: 'unavailable' },
]

export const PLAYER_START: Point = { x: 9, y: 6 }

export function initialCastStates(): Record<string, VisualState> {
  return Object.fromEntries(CAST.map((spot) => [spot.spriteId, spot.initialState]))
}

export interface OfficeScene {
  map: TileMap
  player: Actor
  cast: CastMember[]
}

export function createOfficeScene(manifest: AssetManifest): OfficeScene {
  const map = parseTileMap(ROWS, TILE_LEGEND)
  for (const placement of PROP_PLACEMENTS) {
    const footprint = manifest.props.ids[placement.id]?.footprint
    if (!footprint) continue
    for (let y = 0; y < footprint[1]; y++) {
      for (let x = 0; x < footprint[0]; x++) {
        setSolid(map, { x: placement.tile.x + x, y: placement.tile.y + y })
      }
    }
  }
  const facing: Facing = 'up'
  const cast = CAST.map((spot) => {
    const actor = createActor({ x: spot.deskTile.x, y: spot.deskTile.y + 1 }, 48, facing)
    // Centré sur le bureau, qui occupe deux tuiles.
    actor.x += 8
    return { id: spot.spriteId, spriteId: spot.spriteId, actor, initialState: spot.initialState }
  })
  return { map, player: createActor(PLAYER_START), cast }
}
