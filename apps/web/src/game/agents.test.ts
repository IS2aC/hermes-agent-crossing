import { describe, expect, it } from 'vitest';
import { AGENT_STATES, idleDestination, parseAgentSnapshot, WALK_SPEED } from './agents';

describe('agent runtime contracts', () => {
  it('recognizes exactly the eight public world states', () => {
    expect(AGENT_STATES).toHaveLength(8);
    expect(AGENT_STATES).toContain('waiting_approval');
    expect(AGENT_STATES).toContain('down');
  });
  it('accepts world snapshots and compact status maps, ignoring invalid rows', () => {
    expect(parseAgentSnapshot({ agents: [{ id: 'a', profile: 'Atlas', state: 'working' }, { id: 'x', state: 'missing' }] })).toEqual([{ id: 'a', name: 'Atlas', profile: 'Atlas', state: 'working' }]);
    expect(parseAgentSnapshot({ status: { a: 'down' } })[0]).toMatchObject({ id: 'a', state: 'down' });
  });
  it('uses weighted idle destinations and a speed of two tiles per second', () => {
    const points = Array.from({ length: 4 }, () => ({ x: 0, y: 0 }));
    expect(idleDestination(() => 0, points)).toBe(0);
    expect(idleDestination(() => .999, points)).toBe(3);
    expect(WALK_SPEED).toBe(32);
  });
});
