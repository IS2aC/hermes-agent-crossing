import { parseTileMap, type TileMap } from '../engine/tilemap'
import { createActor, type Actor } from '../engine/actor'

const ROWS = [
  '####################',
  '#..................#',
  '#..................#',
  '#...oo.........o...#',
  '#...oo.........o...#',
  '#..................#',
  '#........oo........#',
  '#........oo........#',
  '#..................#',
  '#...o..........oo..#',
  '#...o..........oo..#',
  '#..................#',
  '#..................#',
  '####################',
]

export interface DemoScene {
  map: TileMap
  player: Actor
}

export function createDemoScene(): DemoScene {
  const map = parseTileMap(ROWS, {
    '#': { tile: 'wall', solid: true },
    o: { tile: 'obstacle', solid: true },
    '.': { tile: 'floor', solid: false },
  })
  return { map, player: createActor({ x: 2, y: 2 }) }
}
