export const FIXED_STEP = 1 / 60
const MAX_STEPS_PER_FRAME = 5

export interface LoopCallbacks {
  update(seconds: number): void
  render(): void
}

export interface Scheduler {
  request(callback: (timeMs: number) => void): number
  cancel(handle: number): void
}

/** Pas fixe : la simulation reste identique quel que soit l'écran. Un long retard est abandonné. */
export function createLoop({ update, render }: LoopCallbacks, scheduler: Scheduler): { stop(): void } {
  let previous: number | null = null
  let accumulated = 0
  let handle = 0
  let running = true

  const tick = (timeMs: number) => {
    if (!running) return
    if (previous !== null) {
      accumulated += (timeMs - previous) / 1000
      let steps = 0
      while (accumulated >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
        update(FIXED_STEP)
        accumulated -= FIXED_STEP
        steps++
      }
      if (steps === MAX_STEPS_PER_FRAME) accumulated = 0
    }
    previous = timeMs
    render()
    handle = scheduler.request(tick)
  }
  handle = scheduler.request(tick)

  return {
    stop() {
      running = false
      scheduler.cancel(handle)
    },
  }
}
