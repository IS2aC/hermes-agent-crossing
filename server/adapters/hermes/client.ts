import { z } from 'zod'
import { parseSse, type SseMessage } from './sse'

export type HermesErrorKind =
  | 'unreachable'
  | 'timeout'
  | 'unauthorized'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'bad_request'
  | 'server'
  | 'invalid_response'

/** Le message reste sans secret : ni clé, ni en-tête. */
export class HermesError extends Error {
  constructor(
    readonly kind: HermesErrorKind,
    message: string,
    readonly status: number | null = null,
    readonly code: string | null = null,
  ) {
    super(message)
    this.name = 'HermesError'
  }
}

export interface HermesClientOptions {
  baseUrl: string
  apiKey: string
  fetch?: typeof fetch
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
}

const healthSchema = z.object({ status: z.string(), version: z.string().nullish() }).passthrough()
const healthDetailedSchema = z.object({
  status: z.string(),
  version: z.string().nullish(),
  gateway_state: z.string().nullish(),
  active_agents: z.number().nullish(),
  updated_at: z.union([z.number(), z.string()]).nullish(),
}).passthrough()
const capabilitiesSchema = z.object({
  model: z.string().nullish(),
  features: z.record(z.unknown()).default({}),
}).passthrough()
export const sessionSchema = z.object({
  id: z.string(),
  source: z.string().nullish(),
  title: z.string().nullish(),
  model: z.string().nullish(),
  started_at: z.number().nullish(),
  ended_at: z.number().nullish(),
  last_active: z.number().nullish(),
  message_count: z.number().nullish(),
  tool_call_count: z.number().nullish(),
  preview: z.string().nullish(),
}).passthrough()
const sessionListSchema = z.object({ data: z.array(sessionSchema), has_more: z.boolean().optional() }).passthrough()
const sessionEnvelopeSchema = z.object({ session: sessionSchema }).passthrough()
const messageSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  role: z.string(),
  content: z.unknown(),
  tool_name: z.string().nullish(),
  timestamp: z.number().nullish(),
}).passthrough()
const messageListSchema = z.object({ data: z.array(messageSchema) }).passthrough()
const runStartedSchema = z.object({ run_id: z.string() }).passthrough()
const runStatusSchema = z.object({
  run_id: z.string(),
  status: z.string(),
  output: z.string().nullish(),
  error: z.string().nullish(),
}).passthrough()
const jobSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  enabled: z.boolean().nullish(),
  next_run_at: z.string().nullish(),
  last_run_at: z.string().nullish(),
  last_status: z.string().nullish(),
}).passthrough()
const jobListSchema = z.object({ jobs: z.array(jobSchema) }).passthrough()

export type HermesSession = z.infer<typeof sessionSchema>
export type HermesMessage = z.infer<typeof messageSchema>
export type HermesJob = z.infer<typeof jobSchema>
export type HermesRunStatus = z.infer<typeof runStatusSchema>
export type HermesHealthDetailed = z.infer<typeof healthDetailedSchema>

const RETRYABLE_STATUS = new Set([502, 503, 504])

function errorKindForStatus(status: number): HermesErrorKind {
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 429) return 'rate_limited'
  if (status >= 400 && status < 500) return 'bad_request'
  return 'server'
}

/**
 * Seul point de contact avec le serveur API de Hermes v0.17. Chaque méthode
 * correspond à une route vérifiée dans le code source du commit 2bd1977d.
 */
export class HermesClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly fetcher: typeof fetch
  private readonly timeoutMs: number
  private readonly retries: number
  private readonly retryDelayMs: number

  constructor(options: HermesClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.apiKey = options.apiKey
    this.fetcher = options.fetch ?? fetch
    this.timeoutMs = options.timeoutMs ?? 10_000
    this.retries = options.retries ?? 2
    this.retryDelayMs = options.retryDelayMs ?? 300
  }

  private headers(json: boolean): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    }
  }

  private async send(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<Response> {
    const timeout = AbortSignal.timeout(this.timeoutMs)
    let response: Response
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method,
        headers: this.headers(body !== undefined),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
      })
    } catch (error) {
      if (timeout.aborted) throw new HermesError('timeout', `Hermes n'a pas répondu à ${method} ${path} à temps`)
      if (signal?.aborted) throw error
      throw new HermesError('unreachable', `Hermes injoignable pour ${method} ${path}`)
    }
    if (!response.ok) throw await this.toError(response, method, path)
    return response
  }

  private async toError(response: Response, method: string, path: string): Promise<HermesError> {
    let code: string | null = null
    let message = `Hermes a répondu ${response.status} à ${method} ${path}`
    try {
      const payload = (await response.json()) as { error?: { code?: unknown; message?: unknown } | string }
      if (typeof payload.error === 'object' && payload.error) {
        if (typeof payload.error.code === 'string') code = payload.error.code
        if (typeof payload.error.message === 'string') message = payload.error.message
      } else if (typeof payload.error === 'string') {
        message = payload.error
      }
    } catch {
      // Corps absent ou non JSON : le statut suffit.
    }
    return new HermesError(errorKindForStatus(response.status), message, response.status, code)
  }

  /** Seules les lectures sont retentées : une écriture pourrait agir deux fois. */
  private async read<T>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
    let attempt = 0
    for (;;) {
      try {
        return await this.parse(await this.send('GET', path), schema, path)
      } catch (error) {
        const retryable = error instanceof HermesError
          && (error.kind === 'unreachable' || error.kind === 'timeout' || (error.status !== null && RETRYABLE_STATUS.has(error.status)))
        if (!retryable || attempt >= this.retries) throw error
        attempt++
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs * 2 ** (attempt - 1)))
      }
    }
  }

  private async write<T>(method: string, path: string, body: unknown, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
    return this.parse(await this.send(method, path, body), schema, path)
  }

  private async parse<T>(response: Response, schema: z.ZodType<T, z.ZodTypeDef, unknown>, path: string): Promise<T> {
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new HermesError('invalid_response', `Réponse non JSON pour ${path}`, response.status)
    }
    const parsed = schema.safeParse(payload)
    if (!parsed.success) throw new HermesError('invalid_response', `Format inattendu pour ${path}`, response.status)
    return parsed.data
  }

  health() {
    return this.read('/health', healthSchema)
  }

  healthDetailed() {
    return this.read('/health/detailed', healthDetailedSchema)
  }

  capabilities() {
    return this.read('/v1/capabilities', capabilitiesSchema)
  }

  async listSessions(limit = 50, offset = 0): Promise<HermesSession[]> {
    const result = await this.read(`/api/sessions?limit=${limit}&offset=${offset}`, sessionListSchema)
    return result.data
  }

  async getSession(sessionId: string): Promise<HermesSession> {
    return (await this.read(`/api/sessions/${encodeURIComponent(sessionId)}`, sessionEnvelopeSchema)).session
  }

  async listMessages(sessionId: string): Promise<HermesMessage[]> {
    return (await this.read(`/api/sessions/${encodeURIComponent(sessionId)}/messages`, messageListSchema)).data
  }

  /** Action réelle : crée une ligne de session dans Hermes. */
  async createSession(title: string | null): Promise<HermesSession> {
    const body = title ? { title } : {}
    return (await this.write('POST', '/api/sessions', body, sessionEnvelopeSchema)).session
  }

  /** Action réelle : lance l'agent, qui peut exécuter de vrais outils. */
  async startRun(input: string, sessionId: string, history: { role: string; content: string }[]): Promise<string> {
    const body = { input, session_id: sessionId, ...(history.length > 0 ? { conversation_history: history } : {}) }
    return (await this.write('POST', '/v1/runs', body, runStartedSchema)).run_id
  }

  getRun(runId: string) {
    return this.read(`/v1/runs/${encodeURIComponent(runId)}`, runStatusSchema)
  }

  /** Action réelle : interrompt un agent. */
  async stopRun(runId: string): Promise<void> {
    await this.send('POST', `/v1/runs/${encodeURIComponent(runId)}/stop`, {})
  }

  /** Action réelle : autorise ou refuse une commande dangereuse. */
  async respondApproval(runId: string, choice: 'once' | 'deny'): Promise<void> {
    await this.send('POST', `/v1/runs/${encodeURIComponent(runId)}/approval`, { choice })
  }

  async listJobs(): Promise<HermesJob[]> {
    return (await this.read('/api/jobs?include_disabled=true', jobListSchema)).jobs
  }

  /** Flux d'un run. Hermes n'a qu'une file par run : une reconnexion peut perdre des événements. */
  async *runEvents(runId: string, signal: AbortSignal): AsyncGenerator<SseMessage> {
    let response: Response
    try {
      response = await this.fetcher(`${this.baseUrl}/v1/runs/${encodeURIComponent(runId)}/events`, {
        headers: this.headers(false),
        signal,
      })
    } catch (error) {
      if (signal.aborted) return
      throw error instanceof HermesError ? error : new HermesError('unreachable', 'Flux du run injoignable')
    }
    if (!response.ok) throw await this.toError(response, 'GET', `/v1/runs/${runId}/events`)
    if (!response.body) throw new HermesError('invalid_response', 'Flux du run vide')
    yield* parseSse(response.body as unknown as AsyncIterable<Uint8Array>)
  }
}
