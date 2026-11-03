import { describe, expect, it } from 'vitest'
import {
  applyHold,
  decideVisual,
  emptyTrack,
  MIN_HOLD_MS,
  RUN_EVENT_MAPPING,
  RUN_SILENCE_MS,
  RUNTIME_MAPPING,
  trackRunEvent,
  type AgentRunTrack,
  type VisualDecision,
  type VisualInputs,
} from '../../src/characters/visualState'
import type { ActivityEvent } from '../../src/domain/activity'
import type { AgentId, AgentRuntime, ObservedAgentState } from '../../src/domain/agents'
import type { Capability } from '../../src/domain/provenance'

const NOW = Date.parse('2026-11-03T10:00:00.000Z')
const AT = (offsetMs: number) => new Date(NOW + offsetMs).toISOString()

function runEvent(type: string, offsetMs = 0, runId = 'r1'): ActivityEvent {
  return {
    id: `${runId}:${type}:${offsetMs}`,
    provenance: 'hermes',
    confidence: { level: 'confirmed' },
    occurredAt: AT(offsetMs),
    type,
    agentId: 'a' as AgentId,
    sessionId: null,
    runId,
    summary: null,
  }
}

function runtime(value: ObservedAgentState, inferred = false): Capability<AgentRuntime> {
  return {
    status: 'available',
    value: {
      agentId: 'a' as AgentId,
      sessionId: null,
      lastActivityAt: null,
      state: { value, provenance: 'hermes', confidence: inferred ? { level: 'inferred', rule: 'ma règle' } : { level: 'confirmed' }, observedAt: AT(0) },
    },
  }
}

function inputs(overrides: Partial<VisualInputs> = {}): VisualInputs {
  return { connected: true, link: 'connected', runtime: runtime('idle'), track: emptyTrack(), now: NOW, ...overrides }
}

const apply = (...events: ActivityEvent[]) => events.reduce<AgentRunTrack>(trackRunEvent, emptyTrack())

describe('table de correspondance', () => {
  it('ne contient aucune mise en scène, seulement des événements de Hermes', () => {
    expect(Object.keys(RUN_EVENT_MAPPING).sort()).toEqual(['approval.request', 'approval.responded', 'reasoning.available', 'tool.completed', 'tool.started'])
  })

  it('n\'anime jamais un état inconnu ou indisponible', () => {
    expect(RUNTIME_MAPPING.unknown).toBe('unknown')
    expect(RUNTIME_MAPPING.unavailable).toBe('unavailable')
  })

  it.each([
    ['reasoning.available', 'think'],
    ['tool.started', 'work'],
    ['approval.request', 'waiting'],
  ])('%s donne %s, en confirmé', (type, state) => {
    expect(decideVisual(inputs({ track: apply(runEvent(type)) }))).toMatchObject({ state, level: 'confirmed', provenance: 'hermes' })
  })
})

describe('décision', () => {
  it('passe à inconnu à la perte de connexion, avant tout le reste', () => {
    const decision = decideVisual(inputs({ connected: false, track: apply(runEvent('tool.started')) }))
    expect(decision).toMatchObject({ state: 'unknown', level: 'unknown' })
  })

  it('ne donne aucune activité à un personnage sans agent', () => {
    expect(decideVisual(inputs({ link: 'none', runtime: null })).state).toBe('unbound')
  })

  it.each(['unreachable', 'missing'] as const)('montre un agent %s comme indisponible', (link) => {
    expect(decideVisual(inputs({ link })).state).toBe('unavailable')
  })

  it('reste inconnu si la découverte échoue', () => {
    expect(decideVisual(inputs({ link: 'unknown' })).state).toBe('unknown')
  })

  it('reste inconnu sans donnée, et le dit', () => {
    expect(decideVisual(inputs({ runtime: null }))).toMatchObject({ state: 'unknown', level: 'unknown' })
    const failed = decideVisual(inputs({ runtime: { status: 'unavailable', reason: 'panne' } }))
    expect(failed.state).toBe('unknown')
    expect(failed.source).toContain('panne')
  })

  it('distingue état confirmé et état déduit, et expose la règle', () => {
    expect(decideVisual(inputs({ runtime: runtime('working', true) }))).toMatchObject({ state: 'work', level: 'inferred', rule: 'ma règle' })
    expect(decideVisual(inputs({ runtime: runtime('idle') }))).toMatchObject({ state: 'idle', level: 'confirmed' })
  })

  it('préfère un événement de run à l\'état général', () => {
    expect(decideVisual(inputs({ runtime: runtime('idle'), track: apply(runEvent('tool.started')) })).state).toBe('work')
  })

  it('ne suppose pas qu\'un agent travaille encore après un long silence', () => {
    const track = apply(runEvent('tool.started', -RUN_SILENCE_MS - 1))
    expect(decideVisual(inputs({ track }))).toMatchObject({ state: 'unknown', level: 'unknown' })
  })

  it('n\'invente aucune activité avec le temps qui passe', () => {
    const later = decideVisual(inputs({ now: NOW + 86_400_000 }))
    expect(later).toEqual(decideVisual(inputs()))
  })
})

describe('suivi des événements de run', () => {
  it('revient à l\'état général à la fin du run', () => {
    for (const end of ['run.completed', 'run.failed', 'run.cancelled']) {
      const track = apply(runEvent('tool.started'), runEvent(end, 1))
      expect(track.runId).toBeNull()
      expect(decideVisual(inputs({ track })).state).toBe('idle')
    }
  })

  it('ignore un événement tardif après la fin : il ne rouvre pas le run', () => {
    const track = apply(runEvent('run.completed', 10), runEvent('tool.started', 5))
    expect(track.runId).toBeNull()
  })

  it('ignore un événement plus ancien que le dernier connu', () => {
    const track = apply(runEvent('approval.request', 10), runEvent('tool.started', 5))
    expect(track.lastEventType).toBe('approval.request')
  })

  it('ignore les événements sans rapport', () => {
    const track = apply(runEvent('session.activity'), { ...runEvent('task.created'), runId: 'tache' }, { ...runEvent('tool.started'), agentId: null })
    expect(track.runId).toBeNull()
  })

  it('la fin d\'un autre run n\'interrompt pas le run en cours', () => {
    const track = apply(runEvent('tool.started', 0, 'r1'), runEvent('run.completed', 1, 'r2'))
    expect(track.runId).toBe('r1')
    expect(track.finishedRuns.has('r2')).toBe(true)
  })

  it('n\'interprète pas une activité Telegram déduite comme un run', () => {
    const track = trackRunEvent(emptyTrack(), { ...runEvent('session.activity'), runId: null })
    expect(track).toEqual(emptyTrack())
  })
})

describe('stabilité', () => {
  const decision = (state: VisualDecision['state']): VisualDecision => ({ state, level: 'confirmed', source: 's', rule: 'r', provenance: 'hermes' })

  it('maintient une animation pendant la durée minimale, puis change', () => {
    const start = applyHold(null, decision('work'), 0)
    expect(applyHold(start, decision('think'), MIN_HOLD_MS - 1).decision.state).toBe('work')
    expect(applyHold(start, decision('think'), MIN_HOLD_MS).decision.state).toBe('think')
  })

  it('absorbe des transitions très rapides', () => {
    let held = applyHold(null, decision('work'), 0)
    for (const [state, at] of [['think', 100], ['work', 200], ['think', 300]] as const) {
      held = applyHold(held, decision(state), at)
    }
    expect(held).toMatchObject({ since: 0, decision: { state: 'work' } })
  })

  it.each(['unknown', 'unavailable', 'waiting', 'unbound'] as const)('montre %s immédiatement : pas de retard sur un problème', (state) => {
    const start = applyHold(null, decision('work'), 0)
    expect(applyHold(start, decision(state), 1).decision.state).toBe(state)
  })

  it('actualise la source sans relancer le délai si l\'animation ne change pas', () => {
    const start = applyHold(null, decision('work'), 0)
    const updated = applyHold(start, { ...decision('work'), source: 'autre' }, 500)
    expect(updated).toMatchObject({ since: 0, decision: { source: 'autre' } })
  })
})
