import * as F from './furniture';
import { PixelCanvas } from './pixels';
import { MAP_H, MAP_W, TILE, WALL_ROWS, WINDOWS } from '../office';

/**
 * Placeholder art registry. Every key below is the contract a real atlas must honour later:
 * swapping placeholders for final art means loading textures under the same keys.
 */
export const PROP_TEXTURES: Record<string, () => PixelCanvas> = {
  desk: () => F.desk(false),
  'desk-mug': () => F.desk(true),
  'monitor-code-1': () => F.monitor('code', 1),
  'monitor-code-2': () => F.monitor('code', 2),
  'monitor-code-3': () => F.monitor('code', 3),
  'monitor-chart': () => F.monitor('chart', 4),
  'monitor-off': () => F.monitor('off'),
  'monitor-alert': () => F.monitor('alert'),
  chair: F.chair,
  whiteboard: () => F.whiteboard('ROADMAP'),
  banner: F.wallBanner,
  plantwall: () => F.plantWall(96),
  mascot: F.mascot,
  counter: F.receptionCounter,
  sofa: F.sofa,
  'coffee-table': F.coffeeTable,
  rug: () => F.rug(124, 72),
  cat: F.cat,
  bookshelf: F.bookshelf,
  'coffee-counter': F.coffeeCounter,
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].flatMap((n) => [[`plant-small-${n}`, () => F.plant('small', n)], [`plant-tall-${n}`, () => F.plant('tall', n * 7)]])),
};

/** Floor and back wall baked into one texture. */
export function officeBase(): PixelCanvas {
  const base = new PixelCanvas(MAP_W * TILE, MAP_H * TILE);
  const tiles = [0, 1, 2, 3].map(F.floorTile);
  for (let y = WALL_ROWS; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) base.blit(tiles[(x * 7 + y * 13) % 4]!, x * TILE, y * TILE);
  base.blit(F.wallStrip(MAP_W, WINDOWS), 0, 0);
  base.rect(0, WALL_ROWS * TILE, MAP_W * TILE, 2, '#b9927f');
  return base;
}
