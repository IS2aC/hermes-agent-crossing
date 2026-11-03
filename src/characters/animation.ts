import type { SpriteLayout } from '../assets/manifest'
import type { Facing } from '../engine/actor'

/**
 * Ce qu'un personnage doit montrer. Le moteur ne décide jamais de cet état,
 * et ce module ne connaît pas Hermes.
 */
export type VisualState = 'idle' | 'walk' | 'work' | 'think' | 'unknown' | 'unavailable'

export const VISUAL_STATES: readonly VisualState[] = ['idle', 'walk', 'work', 'think', 'unknown', 'unavailable']

const BUBBLES: Partial<Record<VisualState, string>> = {
  think: 'bubble.thinking',
  unknown: 'bubble.unknown',
  unavailable: 'bubble.unavailable',
}

/** Ces états n'ont pas d'animation : ne pas donner l'impression d'une activité. */
const NEUTRAL_STATES: ReadonlySet<VisualState> = new Set(['unknown', 'unavailable'])

export interface ResolvedFrame {
  sourceX: number
  sourceY: number
  frame: number
  animation: string
  bubble: string | null
  /** Vrai si l'animation voulue manque : on affiche alors une pose neutre figée. */
  fallback: boolean
}

function cellFor(layout: SpriteLayout, animation: string, facing: Facing, frame: number) {
  const spec = layout.animations[animation]!
  const row = spec.firstRow + layout.directions.indexOf(facing)
  return { sourceX: frame * layout.cell.width, sourceY: row * layout.cell.height }
}

/** `elapsed` : secondes écoulées depuis l'entrée dans l'état. */
export function resolveFrame(layout: SpriteLayout, state: VisualState, facing: Facing, elapsed: number): ResolvedFrame {
  const bubble = BUBBLES[state] ?? null
  const spec = layout.animations[state]
  if (NEUTRAL_STATES.has(state) || !spec) {
    return {
      ...cellFor(layout, 'idle', facing, 0),
      frame: 0,
      animation: 'idle',
      bubble,
      fallback: !NEUTRAL_STATES.has(state),
    }
  }
  const frame = Math.floor(Math.max(0, elapsed) * spec.fps) % spec.frames
  return { ...cellFor(layout, state, facing, frame), frame, animation: state, bubble, fallback: false }
}

/** Une animation repart de zéro à chaque changement d'état, pas à chaque changement de direction. */
export class CharacterAnimator {
  private elapsed = 0
  private current: VisualState

  constructor(initial: VisualState) {
    this.current = initial
  }

  get state(): VisualState {
    return this.current
  }

  setState(next: VisualState): void {
    if (next === this.current) return
    this.current = next
    this.elapsed = 0
  }

  update(seconds: number): void {
    this.elapsed += seconds
  }

  frame(layout: SpriteLayout, facing: Facing): ResolvedFrame {
    return resolveFrame(layout, this.current, facing, this.elapsed)
  }
}
