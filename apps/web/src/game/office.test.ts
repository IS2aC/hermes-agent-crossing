import { describe, expect, it } from 'vitest';
import { characterSheet, CHAR_H, CHAR_W, FRAME_COUNT } from './art/characters';
import { drawText, textWidth } from './art/font';
import { PROP_TEXTURES, officeBase } from './art/manifest';
import { PixelCanvas } from './art/pixels';
import { DEMO_CREW } from './crew';
import { MAP_H, MAP_W, TILE, buildOffice } from './office';
import { findPath, walkable, type Grid } from './pathfinding';

describe('pathfinding', () => {
  const grid: Grid = [
    [true, true, true],
    [false, false, true],
    [true, true, true],
  ];
  it('routes around obstacles', () => {
    expect(findPath(grid, { x: 0, y: 0 }, { x: 0, y: 2 })).toEqual([
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 },
    ]);
  });
  it('refuses blocked or unreachable targets', () => {
    expect(findPath(grid, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeNull();
    expect(findPath([[true, false, true]], { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });
});

describe('office map', () => {
  const office = buildOffice();

  it('only references registered textures and stays inside the map', () => {
    for (const prop of office.props) {
      expect(PROP_TEXTURES[prop.texture], prop.texture).toBeDefined();
      expect(prop.x).toBeGreaterThanOrEqual(0);
      expect(prop.x).toBeLessThan(MAP_W * TILE);
      expect(prop.y).toBeLessThan(MAP_H * TILE);
    }
  });

  it('keeps every seat and waypoint reachable from the reception', () => {
    const reception = office.waypoints[1]!;
    const targets = [...office.waypoints, ...office.seats.map((s) => s.tile)];
    for (const t of targets) {
      expect(walkable(office.grid, t), `${t.x},${t.y}`).toBe(true);
      expect(findPath(office.grid, reception, t), `${t.x},${t.y}`).not.toBeNull();
    }
  });

  it('gives every demo crew seat a matching seat', () => {
    const ids = new Set(office.seats.map((s) => s.id));
    expect(ids.size).toBe(office.seats.length);
    for (const member of DEMO_CREW) if (member.seat) expect(ids.has(member.seat), member.seat).toBe(true);
  });
});

describe('placeholder art', () => {
  it('builds a full character sheet', () => {
    const sheet = characterSheet(DEMO_CREW[0]!.look);
    expect(sheet.width).toBe(CHAR_W * FRAME_COUNT);
    expect(sheet.height).toBe(CHAR_H);
    for (let f = 0; f < FRAME_COUNT; f++) {
      let opaque = 0;
      for (let y = 0; y < CHAR_H; y++) for (let x = 0; x < CHAR_W; x++) if (sheet.get(f * CHAR_W + x, y)) opaque++;
      expect(opaque, `frame ${f}`).toBeGreaterThan(60);
    }
  });

  it('renders every prop and the office base deterministically', () => {
    for (const make of Object.values(PROP_TEXTURES)) expect(make().data.some(Boolean)).toBe(true);
    expect(officeBase().data).toEqual(officeBase().data);
  });

  it('measures text exactly as drawn', () => {
    const canvas = new PixelCanvas(64, 5);
    drawText(canvas, 'MW-1', 0, 0, '#ffffff');
    let right = -1;
    for (let x = 0; x < 64; x++) for (let y = 0; y < 5; y++) if (canvas.get(x, y)) right = Math.max(right, x);
    expect(right + 1).toBe(textWidth('MW-1'));
  });
});
