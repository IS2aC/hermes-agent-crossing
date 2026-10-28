import { describe, expect, it, vi } from 'vitest';
import { AgentRegistry } from './registry.js';

describe('AgentRegistry', () => {
  it('builds read-only agents when the dashboard is not configured', async () => {
    const registry = new AgentRegistry({});
    const agents = await registry.refresh();
    expect(agents).toEqual([]);
    expect(registry.agents).toEqual([]);
    expect(registry.get('missing')).toBeUndefined();
  });

  it('loads profiles with the dashboard session token and maps API config', async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      expect(String(input)).toBe('http://dashboard.local/api/profiles');
      expect(new Headers(init?.headers).get('x-hermes-session-token')).toBe('dashboard-secret');
      return Response.json({ profiles: [{ name: 'default', is_default: true }, { name: 'designer', is_default: false }] });
    });
    const registry = new AgentRegistry({
      HERMES_DASHBOARD_URL: 'http://dashboard.local',
      HERMES_DASHBOARD_SESSION_TOKEN: 'dashboard-secret',
      HERMES_API_URL: 'http://api.local',
      HERMES_API_KEY: 'default-key',
      HERMES_API_URL_DESIGNER: 'http://designer.local',
      HERMES_KEY_DESIGNER: 'designer-key',
    }, fetcher as typeof fetch);

    const agents = await registry.refresh();
    expect(agents.map(({ id, interactive }) => ({ id, interactive }))).toEqual([
      { id: 'default', interactive: true },
      { id: 'designer', interactive: true },
    ]);
    expect(registry.get('designer')).toBe(agents[1]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('rejects failed responses and invalid profile payloads', async () => {
    const unavailable = new AgentRegistry({ HERMES_DASHBOARD_URL: 'http://dashboard.local' }, async () => new Response('', { status: 503 }));
    await expect(unavailable.refresh()).rejects.toThrow('HTTP 503');

    const invalid = new AgentRegistry({ HERMES_DASHBOARD_URL: 'http://dashboard.local' }, async () => Response.json({ profiles: 'not-an-array' }));
    await expect(invalid.refresh()).rejects.toThrow();
  });
});
