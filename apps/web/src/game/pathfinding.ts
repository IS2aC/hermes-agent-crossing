export interface Tile { x: number; y: number; }

/** Walkability grid indexed [y][x]; true means an agent may stand on the tile. */
export type Grid = boolean[][];

const key = (t: Tile) => `${t.x},${t.y}`;

export function walkable(grid: Grid, t: Tile): boolean {
  return grid[t.y]?.[t.x] === true;
}

/** 4-directional A* with a Manhattan heuristic. Returns the tiles after `from`, ending on `to`, or null. */
export function findPath(grid: Grid, from: Tile, to: Tile): Tile[] | null {
  if (!walkable(grid, to)) return null;
  const open: Tile[] = [from];
  const came = new Map<string, Tile>();
  const g = new Map<string, number>([[key(from), 0]]);
  const f = new Map<string, number>([[key(from), Math.abs(from.x - to.x) + Math.abs(from.y - to.y)]]);
  while (open.length > 0) {
    open.sort((a, b) => (f.get(key(a)) ?? Infinity) - (f.get(key(b)) ?? Infinity));
    const current = open.shift()!;
    if (current.x === to.x && current.y === to.y) {
      const path: Tile[] = [current];
      let k = key(current);
      while (came.has(k)) {
        const prev = came.get(k)!;
        if (prev.x === from.x && prev.y === from.y) break;
        path.unshift(prev);
        k = key(prev);
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (!walkable(grid, next)) continue;
      const tentative = (g.get(key(current)) ?? Infinity) + 1;
      if (tentative >= (g.get(key(next)) ?? Infinity)) continue;
      came.set(key(next), current);
      g.set(key(next), tentative);
      f.set(key(next), tentative + Math.abs(next.x - to.x) + Math.abs(next.y - to.y));
      if (!open.some((t) => t.x === next.x && t.y === next.y)) open.push(next);
    }
  }
  return null;
}
