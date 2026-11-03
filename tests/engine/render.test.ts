import { describe, expect, it, vi } from 'vitest'
import { clampZoom, computeView, fitZoom, MAX_ZOOM, screenToWorld } from '../../src/engine/camera'
import { createLoop, FIXED_STEP, type Scheduler } from '../../src/engine/loop'
import { renderFrame, snap, sortByDepth, type DrawCommand } from '../../src/engine/renderer'

describe('profondeur', () => {
  it('trace d\'abord ce qui est plus haut à l\'écran', () => {
    const sorted = sortByDepth([{ depth: 30, id: 'a' }, { depth: 10, id: 'b' }, { depth: 20, id: 'c' }])
    expect(sorted.map((item) => item.id)).toEqual(['b', 'c', 'a'])
  })

  it('conserve l\'ordre d\'insertion à profondeur égale', () => {
    const sorted = sortByDepth([{ depth: 1, id: 'a' }, { depth: 1, id: 'b' }, { depth: 1, id: 'c' }])
    expect(sorted.map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('ne modifie pas le tableau d\'origine', () => {
    const items = [{ depth: 2 }, { depth: 1 }]
    sortByDepth(items)
    expect(items[0]!.depth).toBe(2)
  })
})

describe('caméra', () => {
  it('choisit la plus grande échelle entière qui fait tout tenir', () => {
    expect(fitZoom(1000, 700, 320, 224)).toBe(3)
    expect(fitZoom(100, 100, 320, 224)).toBe(1)
    expect(fitZoom(100000, 100000, 320, 224)).toBe(MAX_ZOOM)
  })

  it('n\'accepte que des zooms entiers bornés', () => {
    expect(clampZoom(2.4)).toBe(2)
    expect(clampZoom(0)).toBe(1)
    expect(clampZoom(50)).toBe(MAX_ZOOM)
  })

  it('centre le monde quand il tient dans la vue, avec un décalage entier', () => {
    const view = computeView({ viewWidth: 1001, viewHeight: 701, worldWidth: 320, worldHeight: 224, zoom: 3 })
    expect(view).toEqual({ scale: 3, offsetX: 20, offsetY: 14 })
  })

  it('suit le point visé sans jamais montrer le vide', () => {
    const base = { viewWidth: 400, viewHeight: 300, worldWidth: 320, worldHeight: 224, zoom: 4 }
    expect(computeView({ ...base, focus: { x: 0, y: 0 } })).toMatchObject({ offsetX: 0, offsetY: 0 })
    expect(computeView({ ...base, focus: { x: 320, y: 224 } })).toMatchObject({ offsetX: 400 - 1280, offsetY: 300 - 896 })
  })

  it('retrouve le point du monde sous un point de l\'écran', () => {
    const view = computeView({ viewWidth: 1000, viewHeight: 700, worldWidth: 320, worldHeight: 224, zoom: 3 })
    expect(screenToWorld(view, { x: view.offsetX + 30, y: view.offsetY + 60 })).toEqual({ x: 10, y: 20 })
  })
})

describe('rendu', () => {
  function fakeContext() {
    const log: string[] = []
    const context = {
      imageSmoothingEnabled: true,
      fillStyle: '',
      setTransform: (...values: number[]) => log.push(`transform:${values.join(',')}`),
      fillRect: () => log.push('clear'),
    }
    return { log, context: context as unknown as CanvasRenderingContext2D }
  }

  it('désactive le lissage et trace le sol, puis les éléments triés', () => {
    const { log, context } = fakeContext()
    const command = (depth: number, id: string): DrawCommand => ({ depth, draw: () => log.push(id) })
    renderFrame(context, {
      width: 100,
      height: 100,
      background: '#000',
      view: { scale: 2, offsetX: 4, offsetY: 6 },
      ground: () => log.push('sol'),
      commands: [command(20, 'devant'), command(10, 'derriere')],
    })
    expect(context.imageSmoothingEnabled).toBe(false)
    expect(log).toEqual(['transform:1,0,0,1,0,0', 'clear', 'transform:2,0,0,2,4,6', 'sol', 'derriere', 'devant'])
  })

  it('aligne les coordonnées sur un pixel entier', () => {
    expect(snap(10.4)).toBe(10)
    expect(snap(10.6)).toBe(11)
  })
})

describe('boucle', () => {
  function manualScheduler() {
    const pending: ((time: number) => void)[] = []
    const scheduler: Scheduler = {
      request: (callback) => pending.push(callback),
      cancel: vi.fn(),
    }
    return { scheduler, fire: (time: number) => pending.shift()?.(time), pending }
  }

  it('avance par pas fixes, sans dépendre de la cadence', () => {
    const { scheduler, fire } = manualScheduler()
    const update = vi.fn()
    createLoop({ update, render: vi.fn() }, scheduler)
    fire(0)
    fire(FIXED_STEP * 3 * 1000 + 1)
    expect(update).toHaveBeenCalledTimes(3)
    expect(update).toHaveBeenCalledWith(FIXED_STEP)
  })

  it('abandonne le retard après une longue interruption', () => {
    const { scheduler, fire } = manualScheduler()
    const update = vi.fn()
    createLoop({ update, render: vi.fn() }, scheduler)
    fire(0)
    fire(60_000)
    expect(update).toHaveBeenCalledTimes(5)
    fire(60_000 + FIXED_STEP * 1000 + 1)
    expect(update).toHaveBeenCalledTimes(6)
  })

  it('s\'arrête quand on le demande', () => {
    const { scheduler, fire, pending } = manualScheduler()
    const render = vi.fn()
    const loop = createLoop({ update: vi.fn(), render }, scheduler)
    fire(0)
    loop.stop()
    expect(scheduler.cancel).toHaveBeenCalled()
    fire(16)
    expect(render).toHaveBeenCalledTimes(1)
    expect(pending).toHaveLength(0)
  })
})
