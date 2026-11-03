import type { View } from './camera'

/** Élément tracé dans l'ordre de profondeur : plus `depth` est grand, plus il passe devant. */
export interface DrawCommand {
  depth: number
  draw(context: CanvasRenderingContext2D): void
}

/** Tri stable : à profondeur égale, l'ordre d'insertion est conservé. */
export function sortByDepth<T extends { depth: number }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.depth - b.item.depth || a.index - b.index)
    .map(({ item }) => item)
}

/** Aligne une coordonnée sur un pixel du monde. */
export function snap(value: number): number {
  return Math.round(value)
}

export interface Frame {
  width: number
  height: number
  background: string
  view: View
  /** Couche sous tous les éléments triés, par exemple le sol. */
  ground(context: CanvasRenderingContext2D): void
  commands: readonly DrawCommand[]
}

export function renderFrame(context: CanvasRenderingContext2D, frame: Frame): void {
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.imageSmoothingEnabled = false
  context.fillStyle = frame.background
  context.fillRect(0, 0, frame.width, frame.height)
  context.setTransform(frame.view.scale, 0, 0, frame.view.scale, frame.view.offsetX, frame.view.offsetY)
  frame.ground(context)
  for (const command of sortByDepth(frame.commands)) command.draw(context)
}
