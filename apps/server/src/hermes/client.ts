import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';

export interface Endpoint { url: string; key?: string }
export class CircuitOpenError extends Error { constructor() { super('Hermes circuit breaker is open'); this.name = 'CircuitOpenError'; } }
export class HermesClient {
  #failures = 0;
  #openedAt = 0;
  constructor(readonly endpoint: Endpoint, readonly timeoutMs = 3000, readonly retries = 2, readonly threshold = 3, readonly resetMs = 10_000, readonly fetcher: typeof fetch = fetch) {}
  get<T>(path: string, schema: z.ZodType<T>): Promise<T> { return this.request(path, schema); }
  async request<T>(path: string, schema: z.ZodType<T>, init: { method?: string; body?: unknown } = {}): Promise<T> {
    if (this.#failures >= this.threshold && Date.now() - this.#openedAt < this.resetMs) throw new CircuitOpenError();
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetcher(new URL(path, this.endpoint.url), { method: init.method ?? 'GET', ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}), headers: { ...(this.endpoint.key ? { authorization: `Bearer ${this.endpoint.key}` } : {}), ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}) }, signal: controller.signal });
        if (!response.ok) throw new Error(`Hermes returned HTTP ${response.status}`);
        const result = schema.parse(await response.json());
        this.#failures = 0;
        return result;
      } catch (error) {
        this.#failures++;
        if (this.#failures >= this.threshold) this.#openedAt = Date.now();
        if (attempt >= (init.method && init.method !== 'GET' ? 0 : this.retries) || error instanceof z.ZodError) throw error;
        await delay(Math.min(100 * 2 ** attempt, 1000));
      } finally { clearTimeout(timer); }
    }
  }
  get available(): boolean { return Boolean(this.endpoint.key); }
  get circuitOpen(): boolean { return this.#failures >= this.threshold && Date.now() - this.#openedAt < this.resetMs; }
}

const ProfileSchema = z.object({ name: z.string(), model: z.string().optional().nullable(), provider: z.string().optional().nullable(), gateway_running: z.boolean().optional(), description: z.string().optional().nullable(), skill_count: z.number().optional(), is_default: z.boolean().optional() }).passthrough();
export const ProfilesSchema = z.object({ profiles: z.array(ProfileSchema) }).passthrough();
export const CapabilitiesSchema = z.record(z.string(), z.unknown()).or(z.array(z.unknown())).or(z.object({}).passthrough());
const HealthSchema = z.object({ status: z.string().optional(), gateway_running: z.boolean().optional() }).passthrough();
export interface AgentTarget { id: string; name: string; profile: string; client?: HermesClient; interactive: boolean; reason?: string; capabilities?: unknown; profileInfo?: z.infer<typeof ProfileSchema> }

export function profileKey(profile: string): string { return profile.toUpperCase().replace(/-/g, '_').replace(/[^A-Z0-9_]/g, '_'); }
export function buildAgents(env: NodeJS.ProcessEnv, profiles: Array<z.infer<typeof ProfileSchema>>): AgentTarget[] {
  return profiles.map((profile) => {
    const suffix = profileKey(profile.name);
    const url = env[`HERMES_API_URL_${suffix}`] ?? (profile.is_default ? env.HERMES_API_URL : undefined);
    const key = env[`HERMES_KEY_${suffix}`] ?? (profile.is_default ? env.HERMES_API_KEY : undefined);
    const client = url && key ? new HermesClient({ url, key }, Number(env.HERMES_TIMEOUT_MS ?? 3000), Number(env.HERMES_RETRY_MAX ?? 2)) : undefined;
    return { id: profile.name, name: profile.name, profile: profile.name, ...(client ? { client } : {}), interactive: Boolean(client), ...(client ? {} : { reason: `Profil ${profile.name} en lecture seule : endpoint API et clé valides non configurés.` }), profileInfo: profile };
  });
}
export async function detectCapabilities(agent: AgentTarget): Promise<AgentTarget> {
  if (!agent.client) return agent;
  const [health, capabilities] = await Promise.allSettled([agent.client.get('/health', HealthSchema), agent.client.get('/v1/capabilities', CapabilitiesSchema)]);
  if (health.status === 'rejected') return { ...agent, interactive: false, reason: 'API Hermes indisponible ou authentification invalide.' };
  return { ...agent, capabilities: capabilities.status === 'fulfilled' ? capabilities.value : undefined, interactive: true };
}
