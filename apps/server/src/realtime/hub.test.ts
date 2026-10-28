import { describe, expect, it, vi } from 'vitest';
import { RealtimeHub } from './hub.js';

describe('RealtimeHub', () => {
  it('sends the current snapshot and publishes updates to connected clients', () => {
    const send = vi.fn(); let closed: (() => void) | undefined;
    const client = { readyState: 1, send, on: (_event: 'close', listener: () => void) => { closed = listener; } };
    const hub = new RealtimeHub(); hub.setSnapshot({ agents: [{ id: 'a' }] }); hub.add(client);
    expect(JSON.parse(send.mock.calls[0]?.[0] as string).type).toBe('snapshot');
    hub.publish('world.diff', { changed: true });
    expect(JSON.parse(send.mock.calls[1]?.[0] as string).type).toBe('world.diff');
    closed?.(); expect(hub.size).toBe(0);
  });
  it('does not send updates to a non-open socket', () => {
    const send = vi.fn(); const hub = new RealtimeHub(); hub.add({ readyState: 0, send, on: () => undefined });
    hub.publish('world.diff', {}); expect(send).toHaveBeenCalledTimes(1);
  });
});
