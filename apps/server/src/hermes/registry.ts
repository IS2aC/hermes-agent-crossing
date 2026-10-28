import { z } from 'zod';
import { ProfilesSchema, buildAgents, type AgentTarget } from './client.js';
const DashboardProfileSchema = ProfilesSchema.shape.profiles;
export class AgentRegistry {
  #agents: AgentTarget[] = [];
  constructor(readonly env: NodeJS.ProcessEnv, readonly fetcher: typeof fetch = fetch) {}
  async refresh(): Promise<AgentTarget[]> {
    const base = this.env.HERMES_DASHBOARD_URL;
    if (!base) { this.#agents = buildAgents(this.env, []); return this.#agents; }
    const headers: Record<string, string> = {};
    if (this.env.HERMES_DASHBOARD_SESSION_TOKEN) headers['x-hermes-session-token'] = this.env.HERMES_DASHBOARD_SESSION_TOKEN;
    const response = await this.fetcher(new URL('/api/profiles', base), { headers, signal: AbortSignal.timeout(Number(this.env.HERMES_TIMEOUT_MS ?? 3000)) });
    if (!response.ok) throw new Error(`Hermes dashboard returned HTTP ${response.status}`);
    const json = await response.json();
    const profiles = z.object({ profiles: DashboardProfileSchema }).parse(json).profiles;
    this.#agents = buildAgents(this.env, profiles);
    return this.#agents;
  }
  get agents(): readonly AgentTarget[] { return this.#agents; }
  get(id: string): AgentTarget | undefined { return this.#agents.find((agent) => agent.id === id); }
}
