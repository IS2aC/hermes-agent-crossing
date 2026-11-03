import type { RunEvent, SessionMessage, SessionSummary } from './platform'

/** Seules les sessions créées par l'API sont modifiables : Hermes v0.17 ne protège pas les autres. */
export const WRITABLE_SOURCE = 'api_server'

export interface SessionView extends SessionSummary {
  writable: boolean
}

export interface SequencedRunEvent {
  seq: number
  event: RunEvent
}

export type TurnStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled' | 'unknown'

/** État d'un tour de conversation côté interface. Seul un événement peut le faire avancer. */
export interface TurnState {
  runId: string
  status: TurnStatus
  text: string
  tools: { name: string; state: 'running' | 'done' | 'failed' }[]
  approval: { command: string | null; description: string | null } | null
  error: string | null
  lastSeq: number
}

export function createTurn(runId: string): TurnState {
  return { runId, status: 'running', text: '', tools: [], approval: null, error: null, lastSeq: 0 }
}

/** Un événement rejoué après une reconnexion est ignoré, grâce à son numéro. */
export function applyRunEvent(turn: TurnState, { seq, event }: SequencedRunEvent): TurnState {
  if (seq <= turn.lastSeq) return turn
  const next: TurnState = { ...turn, lastSeq: seq }
  switch (event.type) {
    case 'message.delta':
      return { ...next, text: next.text + event.delta }
    case 'tool.started':
      return { ...next, tools: [...next.tools, { name: event.tool ?? 'Outil', state: 'running' }] }
    case 'tool.completed': {
      const tools = [...next.tools]
      const index = tools.map((tool) => tool.state === 'running' && tool.name === (event.tool ?? 'Outil')).lastIndexOf(true)
      if (index >= 0) tools[index] = { ...tools[index]!, state: event.failed ? 'failed' : 'done' }
      return { ...next, tools }
    }
    case 'reasoning.available':
      return next
    case 'approval.request':
      return { ...next, status: 'waiting', approval: { command: event.command, description: event.description } }
    case 'approval.responded':
      return { ...next, status: 'running', approval: null }
    case 'run.completed':
      // Sans flux, le texte n'arrive que dans le résultat final.
      return { ...next, status: 'completed', text: event.output || next.text, approval: null }
    case 'run.failed':
      return { ...next, status: 'failed', error: event.error, approval: null }
    case 'run.cancelled':
      return { ...next, status: 'cancelled', approval: null }
    default:
      return next
  }
}

export function isTerminal(status: TurnStatus): boolean {
  return status !== 'running' && status !== 'waiting'
}

/** Ce qu'un run transmet à Hermes : les échanges visibles, sans le système ni les outils. */
export function toRunHistory(messages: readonly SessionMessage[]): { role: string; content: string }[] {
  return messages
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && message.content.trim() !== '')
    .map((message) => ({ role: message.role, content: message.content }))
}
