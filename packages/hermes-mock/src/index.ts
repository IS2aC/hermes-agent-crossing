import Fastify from 'fastify';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = Fastify({ logger: true });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const fixtures = path.join(root, 'packages/hermes-mock/fixtures');
const scenario = process.env.MOCK_SCENARIO ?? 'nominal';
const readFixture = async (name: string): Promise<unknown> => { const fixture = JSON.parse(await readFile(path.join(fixtures, name), 'utf8')) as { body?: unknown }; return fixture.body ?? fixture; };
const apiRoutes: Record<string, string> = {
  '/health': 'api_health_noauth.json', '/health/detailed': 'api_health_detailed.json', '/v1/capabilities': 'api_capabilities.json',
  '/v1/models': 'api_models.json', '/v1/skills': 'api_skills.json', '/v1/toolsets': 'api_toolsets.json'
};
const dashboardRoutes: Record<string, string> = {
  '/api/profiles': 'dash_profiles.json', '/api/auth/me': 'dash_auth_me.json', '/api/status': 'dash_status.json',
  '/api/analytics/usage': 'dash_analytics_usage.json', '/api/plugins/kanban/boards': 'dash_kanban_board.json',
  '/api/plugins/kanban/config': 'dash_kanban_config.json', '/api/plugins/kanban/workers/active': 'dash_kanban_workers_active.json'
};
function registerRoutes(server: typeof app, routes: Record<string, string>): void {
  server.get('/healthz', async () => ({ status: 'ok', service: 'hermes-mock', scenario }));
  for (const [route, fixture] of Object.entries(routes)) server.get(route, async (_request, reply) => {
    if (scenario === 'hermes_down') return reply.code(503).send({ error: 'mock Hermes unavailable' });
    if (scenario === 'rate_limited') return reply.header('retry-after', '2').code(429).send({ error: 'rate limited' });
    if (scenario === 'agent_down' && fixture === 'api_health_detailed.json') return { ...(await readFixture(fixture) as Record<string, unknown>), gateway_running: false };
    return readFixture(fixture);
  });
}
registerRoutes(app, apiRoutes);
app.get('/api/plugins/kanban/events', async (_request, reply) => reply.type('text/event-stream').send('event: connected\ndata: {}\n\n'));
await app.listen({ port: Number(process.env.PORT ?? 8642), host: '0.0.0.0' });
if (process.env.MOCK_SECONDARY_PORT) {
  const secondary = Fastify({ logger: true });
  registerRoutes(secondary, apiRoutes);
  await secondary.listen({ port: Number(process.env.MOCK_SECONDARY_PORT), host: '0.0.0.0' });
}
const dashboard = Fastify({ logger: true });
registerRoutes(dashboard, dashboardRoutes);
await dashboard.listen({ port: Number(process.env.DASHBOARD_PORT ?? 9119), host: '0.0.0.0' });
