import type { Grid, Tile } from './pathfinding';

export const TILE = 16;
export const MAP_W = 30;
export const MAP_H = 22;
/** Rows 0..WALL_ROWS-1 are the back wall. */
export const WALL_ROWS = 3;
export const WINDOWS: Array<[number, number]> = [[0, 3], [3, 7]];

export interface Prop {
  texture: string;
  /** Top-left corner, in pixels. */
  x: number;
  y: number;
  /** Blocked tiles [x, y, w, h]. */
  solid?: [number, number, number, number];
  /** Draw order; defaults to the bottom edge of the texture. */
  depth?: number;
}

export interface Seat {
  id: string;
  kind: 'desk' | 'sofa';
  /** Where the agent's feet go when seated, in pixels. */
  x: number;
  y: number;
  /** Walkable tile the agent reaches before sitting down. */
  tile: Tile;
  depth: number;
}

export interface Zone {
  id: string;
  label: string;
  accent: number;
  /** Area in tiles [x, y, w, h], outlined on the floor. */
  area: [number, number, number, number];
  sign: { x: number; y: number };
}

export interface Office {
  props: Prop[];
  seats: Seat[];
  zones: Zone[];
  waypoints: Tile[];
  grid: Grid;
}

const WALL_DEPTH = 1;

function deskCluster(prefix: string, positions: Array<[number, number]>, screens: string[], props: Prop[], seats: Seat[]): void {
  positions.forEach(([tx, ty], i) => {
    const x = tx * TILE;
    const y = ty * TILE;
    props.push({ texture: i % 3 === 1 ? 'desk-mug' : 'desk', x, y, solid: [tx, ty, 2, 2] });
    props.push({ texture: screens[i % screens.length]!, x: x + 9, y: y - 6, depth: y + 21 });
    props.push({ texture: 'chair', x: x + 9, y: y + 27, depth: y + 43 });
    seats.push({ id: `${prefix}-${i}`, kind: 'desk', x: x + 16, y: y + 30, tile: { x: tx + 1, y: ty + 2 }, depth: y + 31 });
  });
}

export function buildOffice(): Office {
  const props: Prop[] = [];
  const seats: Seat[] = [];

  // Back wall decorations.
  props.push({ texture: 'whiteboard', x: 128, y: 10, depth: WALL_DEPTH });
  props.push({ texture: 'banner', x: 190, y: 4, depth: WALL_DEPTH });
  props.push({ texture: 'plantwall', x: 360, y: 4, depth: WALL_DEPTH });

  // Agent Development open space.
  deskCluster('dev', [[2, 5], [4, 5], [8, 5], [10, 5], [2, 9], [4, 9], [8, 9], [10, 9]], ['monitor-code-1', 'monitor-code-2', 'monitor-chart', 'monitor-code-3'], props, seats);
  props.push({ texture: 'plant-tall-1', x: 2, y: 30, solid: [0, 3, 2, 1] });
  props.push({ texture: 'plant-small-2', x: 98, y: 56, solid: [6, 3, 1, 2] });
  props.push({ texture: 'plant-small-3', x: 98, y: 122, solid: [6, 7, 1, 2] });

  // Reception island.
  props.push({ texture: 'mascot', x: 247, y: 100 });
  props.push({ texture: 'counter', x: 214, y: 112, solid: [13, 7, 6, 2] });
  props.push({ texture: 'plant-tall-2', x: 192, y: 98, solid: [12, 7, 1, 2] });
  props.push({ texture: 'plant-tall-3', x: 304, y: 98, solid: [19, 7, 2, 2] });

  // Data & Knowledge corner.
  deskCluster('data', [[21, 8], [23, 8], [26, 8]], ['monitor-chart', 'monitor-code-2'], props, seats);

  // Coffee corner against the plant wall.
  props.push({ texture: 'coffee-counter', x: 376, y: 32, solid: [23, 3, 3, 2] });
  props.push({ texture: 'bookshelf', x: 444, y: 24, solid: [27, 3, 2, 2] });
  props.push({ texture: 'plant-tall-4', x: 420, y: 34, solid: [26, 3, 1, 2] });

  // Lounge.
  props.push({ texture: 'rug', x: 196, y: 246, depth: 0 });
  props.push({ texture: 'sofa', x: 224, y: 240, solid: [14, 15, 4, 2] });
  props.push({ texture: 'coffee-table', x: 238, y: 290, solid: [14, 18, 3, 2] });
  props.push({ texture: 'cat', x: 286, y: 300 });
  props.push({ texture: 'plant-small-4', x: 200, y: 232, solid: [12, 15, 1, 1] });
  props.push({ texture: 'plant-small-5', x: 292, y: 232, solid: [18, 15, 1, 1] });
  [236, 256, 276].forEach((x, i) => seats.push({ id: `sofa-${i}`, kind: 'sofa', x, y: 262, tile: { x: Math.floor(x / TILE), y: 17 }, depth: 267 }));

  // Greenery around the edges.
  props.push({ texture: 'plant-tall-5', x: 2, y: 300, solid: [0, 19, 2, 2] });
  props.push({ texture: 'plant-small-1', x: 452, y: 310, solid: [28, 20, 1, 1] });
  props.push({ texture: 'plant-tall-6', x: 456, y: 140, solid: [28, 9, 2, 2] });
  props.push({ texture: 'plant-small-6', x: 120, y: 300, solid: [7, 19, 1, 1] });

  const zones: Zone[] = [
    { id: 'dev', label: 'AGENT DEVELOPMENT', accent: 0x30f5ff, area: [1, 4, 12, 9], sign: { x: 18, y: 54 } },
    { id: 'data', label: 'DATA & KNOWLEDGE', accent: 0xa39cff, area: [20, 6, 9, 6], sign: { x: 330, y: 104 } },
  ];

  const grid: Grid = Array.from({ length: MAP_H }, (_, y) => Array.from({ length: MAP_W }, () => y >= WALL_ROWS));
  for (const p of props) {
    if (!p.solid) continue;
    const [sx, sy, sw, sh] = p.solid;
    for (let y = sy; y < sy + sh; y++) for (let x = sx; x < sx + sw; x++) if (grid[y]?.[x] !== undefined) grid[y]![x] = false;
  }

  const waypoints: Tile[] = [
    { x: 24, y: 5 }, { x: 16, y: 10 }, { x: 13, y: 17 }, { x: 7, y: 13 }, { x: 22, y: 14 }, { x: 27, y: 18 }, { x: 4, y: 16 },
  ];

  return { props, seats, zones, waypoints, grid };
}
