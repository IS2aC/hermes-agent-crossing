// Construit tous les assets du jeu en mémoire : les tests comparent ce résultat aux fichiers versionnés.
import { buildSheet, MASTER_PALETTE, sheetLayout } from './character.mjs'
import { buildBubbles, buildProps, buildTiles, BUBBLE_NAMES, BUBBLE_SIZE, TILE_NAMES } from './environment.mjs'
import { FAMILY, familyMember } from './family.mjs'

const PROVENANCE = {
  author: 'Hermes-Agent-Crossing',
  method: 'Écrit en code, sans image externe',
  source: 'tools/art/',
}

const DISPLAY_NAMES = {
  master: 'Master Character',
  jarvis: 'JARVIS',
  veilleur: 'VEILLEUR',
  'data-analyst': 'DATA ANALYST',
  devops: 'DEVOPS',
  developer: 'DEVELOPER',
  researcher: 'RESEARCHER',
  security: 'SECURITY',
}

export function buildAssets() {
  const sheets = { master: buildSheet(MASTER_PALETTE) }
  for (const id of Object.keys(FAMILY)) {
    const { palette, overlays } = familyMember(id)
    sheets[id] = buildSheet(palette, overlays)
  }
  const props = buildProps()
  const tiles = buildTiles()
  const bubbles = buildBubbles()

  const manifest = {
    version: 1,
    provenance: PROVENANCE,
    sprite: sheetLayout(),
    characters: Object.fromEntries(Object.keys(sheets).map((id) => [
      `character.${id}`,
      { file: `characters/character-${id}.png`, displayName: DISPLAY_NAMES[id] },
    ])),
    tiles: {
      file: 'environment/tiles.png',
      size: 16,
      ids: Object.fromEntries(TILE_NAMES.map((name, column) => [`tile.${name}`, { column }])),
    },
    props: {
      file: 'environment/props.png',
      ids: Object.fromEntries(Object.entries(props.rects).map(([name, rect]) => [`prop.${name}`, rect])),
    },
    bubbles: {
      file: 'effects/bubbles.png',
      size: BUBBLE_SIZE,
      ids: Object.fromEntries(BUBBLE_NAMES.map((name, column) => [`bubble.${name}`, { column }])),
    },
  }

  const images = {
    ...Object.fromEntries(Object.entries(sheets).map(([id, image]) => [`characters/character-${id}.png`, image])),
    'environment/tiles.png': tiles,
    'environment/props.png': props.image,
    'effects/bubbles.png': bubbles,
  }
  return { manifest, images, sheets }
}
