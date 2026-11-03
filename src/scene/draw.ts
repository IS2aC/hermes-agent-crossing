import type { LoadedAssets } from '../assets/loader'
import type { ResolvedFrame } from '../characters/animation'
import type { Actor } from '../engine/actor'
import { TILE_SIZE, type Point } from '../engine/grid'
import { snap, type DrawCommand } from '../engine/renderer'
import { tileAt, type TileMap } from '../engine/tilemap'
import type { PropPlacement } from './office'

type Assets = LoadedAssets<HTMLImageElement>

/** Le sol et les murs ne changent jamais : on les trace une fois, dans une image. */
export function createGroundLayer(map: TileMap, placements: readonly PropPlacement[], assets: Assets): HTMLCanvasElement {
  const { manifest } = assets
  const layer = document.createElement('canvas')
  layer.width = map.width * TILE_SIZE
  layer.height = map.height * TILE_SIZE
  const context = layer.getContext('2d')!
  context.imageSmoothingEnabled = false
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      let id = tileAt(map, { x, y })!
      // Alterne deux tuiles de parquet pour éviter un motif trop répétitif.
      if (id === 'tile.floor-wood' && (x + y * 3) % 5 === 0) id = 'tile.floor-wood-alt'
      const column = manifest.tiles.ids[id]?.column
      if (column === undefined) throw new Error(`Tuile absente du manifeste : ${id}`)
      context.drawImage(assets.tiles, column * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
    }
  }
  for (const placement of placements) {
    const prop = manifest.props.ids[placement.id]
    if (!prop?.wall) continue
    context.drawImage(assets.props, prop.x, prop.y, prop.width, prop.height, placement.tile.x * TILE_SIZE, placement.tile.y * TILE_SIZE, prop.width, prop.height)
  }
  return layer
}

/** Une image de meuble repose sur le bas de son emprise, qui fixe sa profondeur. */
export function propCommands(placements: readonly PropPlacement[], assets: Assets): DrawCommand[] {
  const commands: DrawCommand[] = []
  for (const placement of placements) {
    const prop = assets.manifest.props.ids[placement.id]
    if (!prop) throw new Error(`Objet absent du manifeste : ${placement.id}`)
    if (!prop.footprint) continue
    const baseY = (placement.tile.y + prop.footprint[1]) * TILE_SIZE
    const x = placement.tile.x * TILE_SIZE
    commands.push({
      depth: baseY,
      draw(context) {
        context.drawImage(assets.props, prop.x, prop.y, prop.width, prop.height, x, baseY - prop.height, prop.width, prop.height)
      },
    })
  }
  return commands
}

export function characterCommand(actor: Actor, spriteId: string, frame: ResolvedFrame, assets: Assets, selected = false): DrawCommand {
  const { sprite, bubbles } = assets.manifest
  const fallback = assets.characters.get('character.master')!
  const sheet = assets.characters.get(spriteId) ?? fallback
  const position: Point = { x: snap(actor.x), y: snap(actor.y) }
  return {
    depth: actor.y,
    draw(context) {
      const left = position.x - sprite.anchor.x
      const top = position.y - sprite.anchor.y
      if (selected) {
        context.fillStyle = '#f2c14e'
        context.fillRect(position.x - 8, position.y - 1, 16, 1)
        context.fillRect(position.x - 8, position.y + 2, 16, 1)
        context.fillRect(position.x - 9, position.y, 1, 2)
        context.fillRect(position.x + 8, position.y, 1, 2)
      }
      context.drawImage(sheet, frame.sourceX, frame.sourceY, sprite.cell.width, sprite.cell.height, left, top, sprite.cell.width, sprite.cell.height)
      if (frame.bubble) {
        const column = bubbles.ids[frame.bubble]?.column
        if (column === undefined) return
        context.drawImage(assets.bubbles, column * bubbles.size, 0, bubbles.size, bubbles.size, position.x + 2, top - 3, bubbles.size, bubbles.size)
      }
    },
  }
}
