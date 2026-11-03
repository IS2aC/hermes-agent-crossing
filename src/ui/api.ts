export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body), headers: { 'Content-Type': 'application/json' } }
      : {}),
  })
  if (!response.ok) {
    let message = `Erreur ${response.status}`
    try {
      const payload = (await response.json()) as { error?: unknown }
      if (typeof payload.error === 'string') message = payload.error
    } catch {
      // Corps absent : le statut suffit.
    }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
