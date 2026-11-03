import type { Facing } from '../engine/actor'

export interface AnimationSpec {
  frames: number
  fps: number
  firstRow: number
}

export interface SpriteLayout {
  cell: { width: number; height: number }
  anchor: { x: number; y: number }
  directions: Facing[]
  columns: number
  animations: Record<string, AnimationSpec>
}

export interface PropEntry {
  x: number
  y: number
  width: number
  height: number
  /** Emprise bloquante, en tuiles. Absente pour un objet mural. */
  footprint: [number, number] | null
  wall: boolean
}

export interface AssetManifest {
  version: number
  provenance: { author: string; method: string; source: string }
  sprite: SpriteLayout
  characters: Record<string, { file: string; displayName: string }>
  tiles: { file: string; size: number; ids: Record<string, { column: number }> }
  props: { file: string; ids: Record<string, PropEntry> }
  bubbles: { file: string; size: number; ids: Record<string, { column: number }> }
}
