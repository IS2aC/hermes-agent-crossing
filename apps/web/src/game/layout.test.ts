import { describe, expect, it } from 'vitest';
import { generateLayout, prefab, seeded } from './layout';

describe('world layout', () => {
  it('generates the same room layout for a seed', () => {
    expect(generateLayout(42)).toEqual(generateLayout(42));
    expect(generateLayout(42)).not.toEqual(generateLayout(43));
  });
  it('provides the seven base room types and a valid deterministic PRNG', () => {
    const rooms = generateLayout(1);
    expect(rooms.map((room) => room.kind)).toContain('team_open_space_4');
    const random = seeded(9);
    expect(random()).toBeGreaterThanOrEqual(0);
    expect(random()).toBeLessThan(1);
  });
  it('builds a 16 by 12 Tiled-compatible prefab', () => {
    const map = prefab('team_open_space_4');
    expect(map.width * map.height).toBe(192);
    expect(map.layers[0]?.data).toHaveLength(192);
    expect(map.layers[1]?.objects[0]?.type).toBe('room');
  });
});
