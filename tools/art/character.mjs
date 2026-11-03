// Master Character : pièces en texte, assemblées frame par frame.
// Toutes les frames réutilisent ces pièces : proportions et volumes restent identiques.
import { createImage, setPixel } from './png.mjs'

export const CELL = { width: 24, height: 32 }
export const ANCHOR = { x: 12, y: 30 }
export const DIRECTIONS = ['down', 'left', 'right', 'up']
export const ANIMATIONS = {
  idle: { frames: 2, fps: 2 },
  walk: { frames: 4, fps: 8 },
  work: { frames: 4, fps: 6 },
  think: { frames: 4, fps: 2 },
}
export const SHEET_COLUMNS = 4

const HEAD = {
  down: [
    '...OOOOOO...',
    '..OHHHHHHO..',
    '.OHHlHHHHHO.',
    '.OHHHHHHHhO.',
    '.OHSSSSSShO.',
    '.OSSSSSSSSO.',
    '.OSESSSSESO.',
    '.OSESSSSESO.',
    '.OSSSSSSSsO.',
    '..OsSSSSsO..',
    '...OOOOOO...',
  ],
  up: [
    '...OOOOOO...',
    '..OHHHHHHO..',
    '.OHHlHHHHHO.',
    '.OHHHHHHHhO.',
    '.OHHHHHHHhO.',
    '.OHHHHHHHhO.',
    '.OHHHHHHHhO.',
    '.OHHHHHHhhO.',
    '.OhHHHHhhhO.',
    '..OsSSSSsO..',
    '...OOOOOO...',
  ],
  right: [
    '...OOOOOO...',
    '..OHHHHHHO..',
    '.OHHlHHHHHO.',
    '.OHHHHHHHHO.',
    '.OHHHHSSSSO.',
    '.OHHHSSSSSO.',
    '.OHHHSSESSO.',
    '.OhHHSSESSO.',
    '.OhHHSSSSsO.',
    '..OhSSSSsO..',
    '...OOOOOO...',
  ],
}

const TORSO = {
  down: {
    rest: [
      '..OOOOOOOO..',
      '.OTTTAATTTO.',
      '.OTOTTTTOTO.',
      '.OTOTTTTOTO.',
      '.OtOTTTtOtO.',
      '.OSOttttOSO.',
      '..O.OOOO.O..',
    ],
    swingA: [
      '..OOOOOOOO..',
      '.OTTTAATTTO.',
      '.OTOTTTTOTO.',
      '.OtOTTTTOTO.',
      '.OSOTTTtOtO.',
      '..OOtttOOSO.',
      '....OOOO.O..',
    ],
    swingB: [
      '..OOOOOOOO..',
      '.OTTTAATTTO.',
      '.OTOTTTTOTO.',
      '.OTOTTTTOtO.',
      '.OtOTTTtOSO.',
      '.OSOtttOOO..',
      '..O.OOOO....',
    ],
    typeA: [
      '..OOOOOOOO..',
      '.OTTTAATTTO.',
      '.OTOTTTTOTO.',
      '.OTTOTTOTTO.',
      '..OSSOOSSO..',
      '...OOttOO...',
      '....OOOO....',
    ],
    typeB: [
      '..OOOOOOOO..',
      '.OTTTAATTTO.',
      '.OTOTTTTOTO.',
      '.OTTOTTSSOO.',
      '..OSSOOOOO..',
      '...OOttO....',
      '....OOOO....',
    ],
    think: [
      '..OOOOOOOO..',
      '.OTTTAASSOO.',
      '.OTOTTOTTOO.',
      '.OTOTTTTTTO.',
      '.OtOTTTtTO..',
      '.OSOtttOO...',
      '..O.OOOO....',
    ],
  },
  up: {
    rest: [
      '..OOOOOOOO..',
      '.OTTTTTTTTO.',
      '.OTOTTTTOTO.',
      '.OTOTTTTOTO.',
      '.OtOTTTtOtO.',
      '.OSOttttOSO.',
      '..O.OOOO.O..',
    ],
    swingA: [
      '..OOOOOOOO..',
      '.OTTTTTTTTO.',
      '.OTOTTTTOTO.',
      '.OtOTTTTOTO.',
      '.OSOTTTtOtO.',
      '..OOtttOOSO.',
      '....OOOO.O..',
    ],
    swingB: [
      '..OOOOOOOO..',
      '.OTTTTTTTTO.',
      '.OTOTTTTOTO.',
      '.OTOTTTTOtO.',
      '.OtOTTTtOSO.',
      '.OSOtttOOO..',
      '..O.OOOO....',
    ],
    typeA: [
      '..OOOOOOOO..',
      '.OTTTTTTTTO.',
      '.OTOTTTTOTO.',
      '.OSOTTTTOSO.',
      '..OOTTTtOO..',
      '...OtttO....',
      '....OOOO....',
    ],
    typeB: [
      '..OOOOOOOO..',
      '.OTTTTTTTTO.',
      '.OTOTTTTOSO.',
      '.OSOTTTTOOO.',
      '..OOTTTtO...',
      '...OtttO....',
      '....OOOO....',
    ],
    think: [
      '..OOOOOOOO..',
      '.OTTTTTTOOO.',
      '.OTOTTTTTTO.',
      '.OTOTTTTTTO.',
      '.OtOTTTtTO..',
      '.OSOtttOO...',
      '..O.OOOO....',
    ],
  },
  right: {
    rest: [
      '...OOOOOO...',
      '..OTTTTTTO..',
      '..OTTOTTTO..',
      '..OTTOTTTO..',
      '..OttOTTtO..',
      '..OSSOtttO..',
      '...OOOOOO...',
    ],
    swingA: [
      '...OOOOOO...',
      '..OTTTTTTO..',
      '..OTTTOTTO..',
      '..OTTTOTTO..',
      '..OtTTTOtO..',
      '..OttSSOtO..',
      '...OOOOOO...',
    ],
    swingB: [
      '...OOOOOO...',
      '..OTTTTTTO..',
      '..OTOTTTTO..',
      '..OTOTTTTO..',
      '.OTOTTTTtO..',
      '.OSOtttttO..',
      '..OOOOOOO...',
    ],
    typeA: [
      '...OOOOOO...',
      '..OTTTTTTO..',
      '..OTTTOTTO..',
      '..OTTTTOTOO.',
      '..OtTTTTTSSO',
      '..OttttOOOO.',
      '...OOOOOO...',
    ],
    typeB: [
      '...OOOOOO...',
      '..OTTTTTTO..',
      '..OTTTOTTO..',
      '..OTTTTOTSSO',
      '..OtTTTTOOO.',
      '..OttttttO..',
      '...OOOOOO...',
    ],
    think: [
      '...OOOOOO...',
      '..OTTTTTSSO.',
      '..OTTOTOTOO.',
      '..OTTTOTTO..',
      '..OttTTTtO..',
      '..OtttttO...',
      '...OOOOOO...',
    ],
  },
}

const LEGS = {
  front: {
    stand: [
      '...OPPPPO...',
      '...OPPpPO...',
      '...OPOOPO...',
      '...OPOOPO...',
      '...OBOOBO...',
      '...OOOOOO...',
    ],
    stepA: [
      '...OPPPPO...',
      '...OPPpPO...',
      '...OPOOPO...',
      '...OBOOPO...',
      '...OOOOBO...',
      '......OOO...',
    ],
    stepB: [
      '...OPPPPO...',
      '...OPPpPO...',
      '...OPOOPO...',
      '...OPOOBO...',
      '...OBOOOO...',
      '...OOO......',
    ],
  },
  right: {
    stand: [
      '....OPPPO...',
      '....OPPpO...',
      '....OPPpO...',
      '....OPPpO...',
      '....OBBBBO..',
      '....OOOOOO..',
    ],
    stepA: [
      '....OPPPO...',
      '...OPPOPPO..',
      '...OPpOOPpO.',
      '..OPpO..OPO.',
      '..OBBO..OBBO',
      '..OOOO..OOOO',
    ],
    stepB: [
      '....OPPPO...',
      '....OPPpO...',
      '....OPPpO...',
      '....OPPpO...',
      '....OBBBBO..',
      '....OOOOOO..',
    ],
  },
}

const HEAD_TOP = 8
const TORSO_TOP = HEAD_TOP + 10
const LEGS_TOP = TORSO_TOP + 6

const FRAMES = {
  idle: [
    { pose: 'rest', legs: 'stand' },
    { pose: 'rest', legs: 'stand', headY: 1 },
  ],
  walk: [
    { pose: 'swingA', legs: 'stepA' },
    { pose: 'rest', legs: 'stand', bodyY: -1 },
    { pose: 'swingB', legs: 'stepB' },
    { pose: 'rest', legs: 'stand', bodyY: -1 },
  ],
  work: [
    { pose: 'typeA', legs: 'stand' },
    { pose: 'typeB', legs: 'stand' },
    { pose: 'typeA', legs: 'stand', headY: 1 },
    { pose: 'typeB', legs: 'stand', headY: 1 },
  ],
  think: [
    { pose: 'think', legs: 'stand' },
    { pose: 'think', legs: 'stand' },
    { pose: 'think', legs: 'stand', headY: 1 },
    { pose: 'think', legs: 'stand', headY: 1 },
  ],
}

export const MASTER_PALETTE = {
  O: '#2b2433',
  S: '#f1c8a4',
  s: '#d59f7f',
  E: '#2b2433',
  H: '#7a5a48',
  h: '#5d4438',
  l: '#987760',
  T: '#8f98a8',
  t: '#6f7788',
  A: '#c9ced8',
  P: '#4a5062',
  p: '#393e4e',
  B: '#6b5a50',
}

function hexToRgba(hex) {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255]
}

/** Dessine une grille de texte ; `.` laisse transparent, `mirror` retourne autour de la cellule. */
export function drawGrid(image, grid, originX, originY, palette, mirror = false) {
  const width = grid[0].length
  grid.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column++) {
      const key = row[column]
      if (key === '.') continue
      const color = palette[key]
      if (!color) throw new Error(`Couleur inconnue dans la palette : ${key}`)
      const x = mirror ? originX + width - 1 - column : originX + column
      setPixel(image, x, originY + rowIndex, hexToRgba(color))
    }
  })
}

function partsFor(direction) {
  const side = direction === 'left' || direction === 'right'
  return {
    head: HEAD[side ? 'right' : direction],
    torso: TORSO[side ? 'right' : direction],
    legs: LEGS[side ? 'right' : 'front'],
    mirror: direction === 'left',
  }
}

/** Peint une frame dans une image, à l'origine de cellule demandée. */
export function drawFrame(image, cellX, cellY, direction, frame, palette, overlays = {}) {
  const { head, torso, legs, mirror } = partsFor(direction)
  const x = cellX + (CELL.width - head[0].length) / 2
  const bodyY = frame.bodyY ?? 0
  const headY = HEAD_TOP + bodyY + (frame.headY ?? 0)
  const side = direction === 'left' || direction === 'right' ? 'right' : direction
  const layer = (name, y) => {
    const overlay = overlays[name]?.[side]
    if (overlay) drawGrid(image, overlay, x, cellY + y, palette, mirror)
  }
  drawGrid(image, legs[frame.legs], x, cellY + LEGS_TOP, palette, mirror)
  layer('legs', LEGS_TOP)
  drawGrid(image, torso[frame.pose], x, cellY + TORSO_TOP + bodyY, palette, mirror)
  layer('torso', TORSO_TOP + bodyY)
  drawGrid(image, head, x, cellY + headY, palette, mirror)
  layer('head', headY)
}

/** Construit le spritesheet complet : une ligne par couple animation et direction. */
export function buildSheet(palette = MASTER_PALETTE, overlays = {}) {
  const rows = Object.keys(ANIMATIONS).length * DIRECTIONS.length
  const image = createImage(CELL.width * SHEET_COLUMNS, CELL.height * rows)
  let row = 0
  for (const animation of Object.keys(ANIMATIONS)) {
    for (const direction of DIRECTIONS) {
      FRAMES[animation].forEach((frame, column) => {
        drawFrame(image, column * CELL.width, row * CELL.height, direction, frame, palette, overlays)
      })
      row++
    }
  }
  return image
}

export function sheetLayout() {
  const animations = {}
  let row = 0
  for (const [name, spec] of Object.entries(ANIMATIONS)) {
    animations[name] = { ...spec, firstRow: row }
    row += DIRECTIONS.length
  }
  return { cell: CELL, anchor: ANCHOR, directions: DIRECTIONS, columns: SHEET_COLUMNS, animations }
}
