import type { ActivityEvent } from '../domain/activity'
import type { AgentRuntime, ObservedAgentState } from '../domain/agents'
import type { Capability, Provenance } from '../domain/provenance'
import type { LinkState } from '../domain/registry'
import type { VisualState } from './animation'

/** Durée minimale d'une animation d'activité, pour éviter le clignotement. */
export const MIN_HOLD_MS = 1_500
/** Sans nouvelle d'un run en cours, on cesse d'affirmer ce qu'il fait. */
export const RUN_SILENCE_MS = 10 * 60_000

export type EvidenceLevel = 'confirmed' | 'inferred' | 'unknown'

export interface VisualDecision {
  state: VisualState
  level: EvidenceLevel
  /** Donnée à l'origine de la décision. */
  source: string
  /** Règle appliquée, affichée dans le panneau de debug. */
  rule: string
  provenance: Provenance | null
}

/** Table de correspondance : chaque ligne s'appuie sur un événement réel de Hermes. */
export const RUN_EVENT_MAPPING: Readonly<Record<string, { state: VisualState; observed: ObservedAgentState }>> = {
  'reasoning.available': { state: 'think', observed: 'thinking' },
  'tool.started': { state: 'work', observed: 'working' },
  'tool.completed': { state: 'work', observed: 'working' },
  'approval.request': { state: 'waiting', observed: 'waiting' },
  'approval.responded': { state: 'work', observed: 'working' },
}

const TERMINAL_RUN_EVENTS = new Set(['run.completed', 'run.failed', 'run.cancelled'])

export const RUNTIME_MAPPING: Readonly<Record<ObservedAgentState, VisualState>> = {
  idle: 'idle',
  working: 'work',
  thinking: 'think',
  waiting: 'waiting',
  error: 'unavailable',
  unavailable: 'unavailable',
  unknown: 'unknown',
}

/** Ce qu'on sait d'un agent d'après ses événements de run. */
export interface AgentRunTrack {
  runId: string | null
  lastEventType: string | null
  lastEventAt: number
  provenance: Provenance | null
  /** Runs terminés : un événement tardif ne les rouvre pas. */
  finishedRuns: ReadonlySet<string>
}

export function emptyTrack(): AgentRunTrack {
  return { runId: null, lastEventType: null, lastEventAt: 0, provenance: null, finishedRuns: new Set() }
}

/** Applique un événement. Un événement tardif ou sans rapport ne change rien. */
export function trackRunEvent(track: AgentRunTrack, event: ActivityEvent): AgentRunTrack {
  if (!event.runId || !event.agentId) return track
  const isRunEvent = event.type in RUN_EVENT_MAPPING || TERMINAL_RUN_EVENTS.has(event.type)
  if (!isRunEvent) return track
  if (track.finishedRuns.has(event.runId)) return track
  const at = Date.parse(event.occurredAt)

  if (TERMINAL_RUN_EVENTS.has(event.type)) {
    const finishedRuns = new Set(track.finishedRuns).add(event.runId)
    if (track.runId !== null && track.runId !== event.runId) return { ...track, finishedRuns }
    return { runId: null, lastEventType: event.type, lastEventAt: at, provenance: event.provenance, finishedRuns }
  }
  if (track.runId === event.runId && at < track.lastEventAt) return track
  if (track.runId !== null && track.runId !== event.runId && at < track.lastEventAt) return track
  return { ...track, runId: event.runId, lastEventType: event.type, lastEventAt: at, provenance: event.provenance }
}

export interface VisualInputs {
  /** Connexion au serveur de l'application. */
  connected: boolean
  link: LinkState
  runtime: Capability<AgentRuntime> | null
  track: AgentRunTrack
  now: number
}

/**
 * Décide ce qu'un personnage montre. Du plus sûr au moins sûr : perte de connexion,
 * lien, événements du run, puis état général. Un délai seul ne produit jamais d'activité.
 */
export function decideVisual({ connected, link, runtime, track, now }: VisualInputs): VisualDecision {
  if (!connected) {
    return { state: 'unknown', level: 'unknown', source: 'Connexion au serveur perdue', rule: 'sans connexion, aucun état n\'est garanti', provenance: null }
  }
  if (link === 'none') {
    return { state: 'unbound', level: 'confirmed', source: 'Aucun agent associé', rule: 'personnage seul : aucune activité à montrer', provenance: 'application' }
  }
  if (link === 'unknown') {
    return { state: 'unknown', level: 'unknown', source: 'Découverte impossible', rule: 'état du lien inconnu', provenance: null }
  }
  if (link === 'unreachable' || link === 'missing') {
    return { state: 'unavailable', level: 'confirmed', source: link === 'missing' ? 'Agent introuvable' : 'Agent injoignable', rule: 'l\'agent ne répond pas', provenance: 'application' }
  }
  if (track.runId && track.lastEventType) {
    if (now - track.lastEventAt > RUN_SILENCE_MS) {
      return { state: 'unknown', level: 'unknown', source: `Run ${track.runId} silencieux`, rule: 'aucune nouvelle depuis 10 minutes', provenance: track.provenance }
    }
    const mapped = RUN_EVENT_MAPPING[track.lastEventType]
    if (mapped) {
      return { state: mapped.state, level: 'confirmed', source: `Événement ${track.lastEventType}`, rule: `${track.lastEventType} → ${mapped.state}`, provenance: track.provenance }
    }
  }
  if (!runtime || runtime.status === 'unavailable') {
    return { state: 'unknown', level: 'unknown', source: runtime ? `État indisponible : ${runtime.reason}` : 'État non lu', rule: 'pas de donnée', provenance: null }
  }
  const { value, confidence, provenance } = runtime.value.state
  return {
    state: RUNTIME_MAPPING[value],
    level: confidence.level,
    source: `État général : ${value}`,
    rule: confidence.level === 'inferred' ? confidence.rule : `${value} → ${RUNTIME_MAPPING[value]}`,
    provenance,
  }
}

/** États à montrer sans attendre : cacher un problème ou une demande serait trompeur. */
const URGENT_STATES: ReadonlySet<VisualState> = new Set(['unknown', 'unavailable', 'waiting', 'unbound'])

export interface HeldState {
  decision: VisualDecision
  since: number
}

/** Stabilité : une animation d'activité reste affichée un minimum, sauf état urgent. */
export function applyHold(previous: HeldState | null, next: VisualDecision, now: number, minHoldMs = MIN_HOLD_MS): HeldState {
  if (!previous) return { decision: next, since: now }
  if (previous.decision.state === next.state) return { decision: next, since: previous.since }
  if (URGENT_STATES.has(next.state) || now - previous.since >= minHoldMs) return { decision: next, since: now }
  return previous
}
