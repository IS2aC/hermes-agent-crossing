import { hash, verify } from 'argon2';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { z } from 'zod';
import { AgentRegistry } from './hermes/registry.js';
import { detectCapabilities } from './hermes/client.js';
import { setSessionCookie, sessionFromRequest, createSession } from './auth/session.js';
import { StatusEngine } from './status/engine.js';
import { RealtimeHub } from './realtime/hub.js';

if (process.argv[2] === 'hash-password') {
  const password = process.argv[3];
  if (!password) throw new Error("Usage: node dist/index.js hash-password '<password>'");
  process.stdout.write(`${await hash(password)}\n`); process.exit(0);
}
const EnvSchema = z.object({ PORT: z.coerce.number().int().positive().default(8080), CROSSING_ADMIN_USER: z.string().default('admin'), CROSSING_ADMIN_PASSWORD_HASH: z.string().min(1), CROSSING_SESSION_SECRET: z.string().min(32), CROSSING_CONFIG_PATH: z.string().default('/data/crossing.config.yaml'), LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace','silent']).default('info') });
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) throw new Error(`Configuration invalide: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
const config = parsed.data;
if (process.env.NODE_ENV !== 'development') { try { await verify(config.CROSSING_ADMIN_PASSWORD_HASH, 'configuration-validation-probe'); } catch { throw new Error('CROSSING_ADMIN_PASSWORD_HASH must be a valid Argon2 hash outside development'); } }
try { parse(await readFile(config.CROSSING_CONFIG_PATH, 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error(`crossing.config.yaml invalide: ${(error as Error).message}`); }
const app = Fastify({ logger: { level: config.LOG_LEVEL, redact: ['*.password', '*.secret', '*.apiKey', 'req.headers.authorization', 'req.headers.cookie'] } });
await app.register(websocket);
app.addHook('onRequest', async (_request, reply) => {
  reply.header('x-content-type-options', 'nosniff').header('x-frame-options', 'DENY').header('referrer-policy', 'no-referrer').header('permissions-policy', 'camera=(), microphone=(), geolocation=()').header('content-security-policy', "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
});
app.get('/healthz', async () => ({ status: 'ok', service: 'crossing', timestamp: new Date().toISOString() }));
const registry = new AgentRegistry(process.env);
const status = new StatusEngine();
const realtime = new RealtimeHub();
app.get('/ws', { websocket: true }, (socket, request) => {
  if (!sessionFromRequest(request, config.CROSSING_SESSION_SECRET)) return socket.close(1008, 'auth required');
  realtime.add(socket);
});
const dashboardHeaders = (): Record<string, string> => process.env.HERMES_DASHBOARD_SESSION_TOKEN ? { 'x-hermes-session-token': process.env.HERMES_DASHBOARD_SESSION_TOKEN } : {};
async function dashboard(pathname: string, init: RequestInit = {}): Promise<unknown> {
  const base = process.env.HERMES_DASHBOARD_URL;
  if (!base) throw new Error('Dashboard Hermes non configuré');
  const response = await fetch(new URL(pathname, base), { ...init, headers: { ...dashboardHeaders(), ...init.headers }, signal: AbortSignal.timeout(Number(process.env.HERMES_TIMEOUT_MS ?? 3000)) });
  if (!response.ok) throw new Error(`Hermes dashboard HTTP ${response.status}`);
  return response.json();
}
app.post('/api/auth/login', async (request, reply) => {
  const body = z.object({ username: z.string(), password: z.string() }).safeParse(request.body);
  if (!body.success || body.data.username !== config.CROSSING_ADMIN_USER || !(await verify(config.CROSSING_ADMIN_PASSWORD_HASH, body.data.password))) return reply.code(401).send({ error: 'Identifiants invalides' });
  const csrf = randomBytes(32).toString('base64url'); setSessionCookie(reply, createSession(config.CROSSING_SESSION_SECRET, csrf), process.env.NODE_ENV === 'production');
  return { csrfToken: csrf };
});
app.post('/api/auth/logout', async (request, reply) => { reply.header('set-cookie', 'crossing_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return { ok: true }; });
app.addHook('preHandler', async (request, reply) => {
  if (request.url === '/healthz' || request.url === '/api/auth/login' || request.url.startsWith('/assets/') || request.url === '/') return;
  const session = sessionFromRequest(request, config.CROSSING_SESSION_SECRET);
  if (!session) return reply.code(401).send({ error: 'Authentification requise' });
  if (!['GET','HEAD','OPTIONS'].includes(request.method) && request.headers['x-csrf-token'] !== session.csrf) return reply.code(403).send({ error: 'Jeton CSRF invalide' });
});
app.get('/api/auth/me', async (request) => ({ authenticated: Boolean(sessionFromRequest(request, config.CROSSING_SESSION_SECRET)) }));
app.get('/api/profiles', async (_request, reply) => {
  try { const profiles = await registry.refresh(); return profiles.map(({ id, name, profile, interactive, reason, profileInfo }) => ({ id, name, profile, interactive, ...(reason ? { reason } : {}), ...profileInfo })); }
  catch (error) { return reply.code(503).send({ error: (error as Error).message, profiles: [] }); }
});
app.get('/api/agents', async (_request, reply) => {
  try { const agents = await registry.refresh(); const checked = await Promise.all(agents.map(detectCapabilities));
    return checked.map((agent) => ({ id: agent.id, name: agent.name, profile: agent.profile, interactive: agent.interactive, ...(agent.reason ? { reason: agent.reason } : {}), ...(agent.profileInfo ? { model: agent.profileInfo.model, provider: agent.profileInfo.provider, gateway_running: agent.profileInfo.gateway_running } : {}), capabilities: agent.capabilities, state: status.update(agent.id, { ...(agent.profileInfo?.gateway_running !== undefined ? { gateway: agent.profileInfo.gateway_running } : {}), ...(agent.client ? { reachable: agent.interactive } : {}) }) }));
  } catch (error) { return reply.code(503).send({ error: (error as Error).message }); }
});
app.get('/api/world', async (_request, reply) => {
  try { const agents = await registry.refresh(); const world = { agents: agents.map((agent) => ({ id: agent.id, profile: agent.profile, interactive: agent.interactive, state: status.update(agent.id, { ...(agent.profileInfo?.gateway_running !== undefined ? { gateway: agent.profileInfo.gateway_running } : {}) }) })), status: status.snapshot() }; realtime.setSnapshot(world); realtime.publish('world.diff', world); return world; }
  catch (error) { return reply.code(503).send({ error: (error as Error).message }); }
});
app.get('/api/sessions', async (request, reply) => {
  const query = z.object({ agent: z.string() }).safeParse(request.query); if (!query.success) return reply.code(400).send({ error: 'agent requis' });
  const agent = registry.get(query.data.agent); if (!agent?.client) return reply.code(403).send({ error: agent?.reason ?? 'Profil inconnu' });
  try { return await agent.client.get('/api/sessions', z.unknown()); } catch (error) { return reply.code(502).send({ error: (error as Error).message }); }
});
app.post('/api/sessions', async (request, reply) => {
  const body = z.object({ agent: z.string(), session: z.record(z.string(), z.unknown()).optional() }).safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: 'agent et session valide requis' });
  const agent = registry.get(body.data.agent); if (!agent?.client) return reply.code(403).send({ error: agent?.reason ?? 'Profil inconnu' });
  try { return await agent.client.request('/api/sessions', z.unknown(), { method: 'POST', body: body.data.session ?? {} }); } catch (error) { return reply.code(502).send({ error: (error as Error).message }); }
});
app.get<{ Params: { sessionId: string }; Querystring: { agent: string } }>('/api/sessions/:sessionId/messages', async (request, reply) => {
  const agent = registry.get(request.query.agent); if (!agent?.client) return reply.code(403).send({ error: agent?.reason ?? 'Profil inconnu' });
  try { return await agent.client.get(`/api/sessions/${encodeURIComponent(request.params.sessionId)}/messages`, z.unknown()); } catch (error) { return reply.code(502).send({ error: (error as Error).message }); }
});
app.post<{ Params: { sessionId: string }; Querystring: { agent: string } }>('/api/sessions/:sessionId/chat/stream', async (request, reply) => {
  const agent = registry.get(request.query.agent); if (!agent?.client) return reply.code(403).send({ error: agent?.reason ?? 'Profil inconnu' });
  const body = z.record(z.string(), z.unknown()).safeParse(request.body); if (!body.success) return reply.code(400).send({ error: 'Corps chat invalide' });
  const controller = new AbortController(); reply.raw.on('close', () => controller.abort());
  try {
    const upstream = await fetch(new URL(`/api/sessions/${encodeURIComponent(request.params.sessionId)}/chat/stream`, agent.client.endpoint.url), { method: 'POST', headers: { authorization: `Bearer ${agent.client.endpoint.key}`, 'content-type': 'application/json', accept: 'text/event-stream' }, body: JSON.stringify(body.data), signal: controller.signal });
    if (!upstream.ok || !upstream.body) return reply.code(502).send({ error: `Hermes chat stream HTTP ${upstream.status}` });
    reply.hijack(); reply.raw.writeHead(200, { 'content-type': upstream.headers.get('content-type') ?? 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    const reader = upstream.body.getReader();
    try { while (true) { const { done, value } = await reader.read(); if (done) break; if (!reply.raw.write(value)) await new Promise<void>(resolve => reply.raw.once('drain', resolve)); } } finally { reader.releaseLock(); }
    reply.raw.end();
  } catch (error) { if (!controller.signal.aborted) { if (!reply.raw.headersSent) return reply.code(502).send({ error: (error as Error).message }); reply.raw.end(); } }
});
app.post<{ Params: { sessionId: string }; Querystring: { agent: string } }>('/api/sessions/:sessionId/chat', async (request, reply) => {
  const agent = registry.get(request.query.agent); if (!agent?.client) return reply.code(403).send({ error: agent?.reason ?? 'Profil inconnu' });
  const body = z.record(z.string(), z.unknown()).safeParse(request.body); if (!body.success) return reply.code(400).send({ error: 'Corps chat invalide' });
  try { return await agent.client.request(`/api/sessions/${encodeURIComponent(request.params.sessionId)}/chat`, z.unknown(), { method: 'POST', body: body.data }); } catch (error) { return reply.code(502).send({ error: (error as Error).message }); }
});
app.get('/api/kanban', async (_request, reply) => { try { return await dashboard('/api/plugins/kanban/boards'); } catch (error) { return reply.code(503).send({ error: (error as Error).message }); } });
app.post('/api/kanban/tasks', async (request, reply) => {
  const body = z.record(z.string(), z.unknown()).safeParse(request.body); if (!body.success) return reply.code(400).send({ error: 'Corps de tâche invalide' });
  try { return await dashboard('/api/plugins/kanban/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body.data) }); } catch (error) { return reply.code(502).send({ error: (error as Error).message }); }
});
const here = path.dirname(fileURLToPath(import.meta.url)); const staticDir = path.resolve(here, '../../web/dist');
try { await app.register(fastifyStatic, { root: staticDir, wildcard: false }); } catch { app.log.warn({ staticDir }, 'web build not found; serving health endpoint only'); }
app.setNotFoundHandler(async (_request, reply) => { try { return await reply.type('text/html').send(await readFile(path.join(staticDir, 'index.html'))); } catch { return reply.code(404).send({ error: 'Not Found' }); } });
await app.listen({ port: config.PORT, host: '0.0.0.0' });
