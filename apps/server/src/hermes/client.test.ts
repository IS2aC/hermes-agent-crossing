import { describe, expect, it, vi } from 'vitest';
import { CircuitOpenError, HermesClient, buildAgents, detectCapabilities } from './client.js';
import { createSession, readSession } from '../auth/session.js';
import { resolveStatus, StatusEngine } from '../status/engine.js';

describe('Hermes client', () => {
  it('sends the bearer and validates the payload', async () => {
    const fetcher = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'x-auth': String(new Headers(init?.headers).get('authorization')) } }));
    const client = new HermesClient({ url: 'http://localhost:8642', key: 'test' }, 200, 0, 3, 1000, fetcher as typeof fetch);
    expect(await client.get('/health', (await import('zod')).z.object({ status: (await import('zod')).z.string() }))).toEqual({ status: 'ok' });
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get('authorization')).toBe('Bearer test');
  });
  it('opens the breaker after repeated upstream failure', async () => {
    const client = new HermesClient({ url: 'http://localhost', key: 'x' }, 100, 0, 2, 60_000, async () => new Response('', { status: 503 }));
    const schema = (await import('zod')).z.unknown();
    await expect(client.get('/health', schema)).rejects.toThrow('HTTP 503');
    await expect(client.get('/health', schema)).rejects.toThrow('HTTP 503');
    await expect(client.get('/health', schema)).rejects.toBeInstanceOf(CircuitOpenError);
  });
  it('does not enable chat for a profile without a configured endpoint and key', () => {
    const [agent] = buildAgents({}, [{ name: 'no-api', is_default: false }]);
    expect(agent?.interactive).toBe(false);
    expect(agent?.reason).toContain('lecture seule');
  });
  it('turns off interaction when API health is unavailable', async () => {
    const [agent] = buildAgents({ HERMES_API_URL_DEFAULT: 'http://localhost', HERMES_KEY_DEFAULT: 'x' }, [{ name: 'default', is_default: true }]);
    const result = await detectCapabilities({ ...agent!, client: new HermesClient({ url: 'http://localhost', key: 'x' }, 100, 0, 3, 100, async () => new Response('', { status: 401 })) });
    expect(result.interactive).toBe(false);
  });
});
describe('status engine', () => {
  it('applies failure and approval priority', () => { expect(resolveStatus({ authError: true, active: true })).toBe('down'); expect(resolveStatus({ waitingApproval: true, blocked: true })).toBe('waiting_approval'); });
  it('smooths transient state changes', () => { const engine = new StatusEngine(3000); expect(engine.update('a', { active: true }, 1)).toBe('working'); expect(engine.update('a', {}, 100)).toBe('working'); expect(engine.update('a', {}, 4001)).toBe('idle'); });
});
describe('session cookie signing', () => {
  it('validates signature and expires', () => { const token = createSession('s'.repeat(32), 'csrf'); expect(readSession(token, 's'.repeat(32))?.csrf).toBe('csrf'); expect(readSession(token, 'x'.repeat(32))).toBeUndefined(); expect(readSession(`${token}x`, 's'.repeat(32))).toBeUndefined(); });
});
