import { describe, expect, it } from 'vitest'
import type { SpriteLayout } from '../../src/assets/manifest'
import { CharacterAnimator, resolveFrame } from '../../src/characters/animation'

const layout: SpriteLayout = {
  cell: { width: 24, height: 32 },
  anchor: { x: 12, y: 30 },
  directions: ['down', 'left', 'right', 'up'],
  columns: 4,
  animations: {
    idle: { frames: 2, fps: 2, firstRow: 0 },
    walk: { frames: 4, fps: 8, firstRow: 4 },
    work: { frames: 4, fps: 6, firstRow: 8 },
    think: { frames: 4, fps: 2, firstRow: 12 },
  },
}

describe('sélection de la frame', () => {
  it('calcule la bonne cellule selon l\'animation et la direction', () => {
    const frame = resolveFrame(layout, 'walk', 'right', 0.25)
    expect(frame).toMatchObject({ animation: 'walk', frame: 2, sourceX: 48, sourceY: 6 * 32, fallback: false })
  })

  it('boucle sur le nombre de frames', () => {
    expect(resolveFrame(layout, 'idle', 'down', 0).frame).toBe(0)
    expect(resolveFrame(layout, 'idle', 'down', 0.5).frame).toBe(1)
    expect(resolveFrame(layout, 'idle', 'down', 1).frame).toBe(0)
  })

  it('ajoute une bulle à la réflexion', () => {
    expect(resolveFrame(layout, 'think', 'down', 0).bubble).toBe('bubble.thinking')
    expect(resolveFrame(layout, 'work', 'down', 0).bubble).toBeNull()
  })

  it.each(['unknown', 'unavailable'] as const)('fige la pose et ajoute une bulle pour l\'état %s', (state) => {
    const start = resolveFrame(layout, state, 'up', 0)
    const later = resolveFrame(layout, state, 'up', 37.3)
    expect(later).toEqual(start)
    expect(start).toMatchObject({ animation: 'idle', frame: 0, sourceY: 3 * 32, fallback: false })
    expect(start.bubble).toBe(`bubble.${state}`)
  })

  it('fige un personnage sans agent, sans bulle', () => {
    expect(resolveFrame(layout, 'unbound', 'up', 12)).toMatchObject({ animation: 'idle', frame: 0, bubble: null, fallback: false })
  })

  it('retombe sur une pose neutre figée si une animation manque', () => {
    const { work: _removed, ...animations } = layout.animations
    const frame = resolveFrame({ ...layout, animations }, 'work', 'down', 3)
    expect(frame).toMatchObject({ animation: 'idle', frame: 0, sourceX: 0, sourceY: 0, fallback: true })
  })
})

describe('animateur', () => {
  it('repart à la première frame quand l\'état change', () => {
    const animator = new CharacterAnimator('work')
    animator.update(0.2)
    expect(animator.frame(layout, 'down').frame).toBe(1)
    animator.setState('walk')
    expect(animator.frame(layout, 'down').frame).toBe(0)
  })

  it('poursuit l\'animation si l\'état reste le même, ou si seule la direction change', () => {
    const animator = new CharacterAnimator('walk')
    animator.update(0.25)
    animator.setState('walk')
    expect(animator.frame(layout, 'down').frame).toBe(2)
    expect(animator.frame(layout, 'left').frame).toBe(2)
  })
})
