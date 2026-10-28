import { describe, expect, it } from 'vitest';
import { AgentStateSchema } from './index.js';

describe('mock fixture contracts', () => {
  it('includes the known agent status values', () => {
    expect(AgentStateSchema.parse('working')).toBe('working');
    expect(AgentStateSchema.parse('down')).toBe('down');
    expect(AgentStateSchema.safeParse('unknown').success).toBe(false);
  });
});
