import type { Point } from './grid'

export const MIN_ZOOM = 1
export const MAX_ZOOM = 8

export interface View {
  /** Échelle entière : un pixel du monde couvre un carré entier de pixels écran. */
  scale: number
  offsetX: number
  offsetY: number
}

export interface ViewRequest {
  viewWidth: number
  viewHeight: number
  worldWidth: number
  worldHeight: number
  zoom: number
  focus?: Point
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)))
}

/** Plus grande échelle entière où tout le monde tient dans la vue. */
export function fitZoom(viewWidth: number, viewHeight: number, worldWidth: number, worldHeight: number): number {
  return clampZoom(Math.floor(Math.min(viewWidth / worldWidth, viewHeight / worldHeight)))
}

function axisOffset(view: number, world: number, focus: number, scale: number): number {
  const scaled = world * scale
  if (scaled <= view) return Math.floor((view - scaled) / 2)
  return Math.round(Math.min(0, Math.max(view - scaled, view / 2 - focus * scale)))
}

/** Centre le monde s'il tient dans la vue ; sinon suit le point visé sans montrer le vide. */
export function computeView(request: ViewRequest): View {
  const { viewWidth, viewHeight, worldWidth, worldHeight } = request
  const scale = clampZoom(request.zoom)
  const focus = request.focus ?? { x: worldWidth / 2, y: worldHeight / 2 }
  return {
    scale,
    offsetX: axisOffset(viewWidth, worldWidth, focus.x, scale),
    offsetY: axisOffset(viewHeight, worldHeight, focus.y, scale),
  }
}

export function screenToWorld(view: View, screen: Point): Point {
  return { x: (screen.x - view.offsetX) / view.scale, y: (screen.y - view.offsetY) / view.scale }
}
