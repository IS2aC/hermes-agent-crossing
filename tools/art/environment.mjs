// Tuiles, mobilier et bulles, dessinés en rectangles sur une grille de pixels.
import { createImage, setPixel } from './png.mjs'

const hex = (value) => {
  const n = Number.parseInt(value.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
}

function rect(image, x, y, w, h, color) {
  const rgba = hex(color)
  for (let v = y; v < y + h; v++) for (let u = x; u < x + w; u++) setPixel(image, u, v, rgba)
}

const OUTLINE = '#2b2433'

export const TILE_NAMES = ['floor-wood', 'floor-wood-alt', 'floor-carpet', 'wall-top', 'wall-face', 'wall-base']

function drawTile(image, column, name) {
  const x = column * 16
  switch (name) {
    case 'floor-wood':
    case 'floor-wood-alt': {
      const alt = name === 'floor-wood-alt'
      rect(image, x, 0, 16, 16, '#c99f70')
      rect(image, x, 7, 16, 1, '#a57d55')
      rect(image, x, 15, 16, 1, '#a57d55')
      rect(image, x + (alt ? 11 : 4), 0, 1, 7, '#a57d55')
      rect(image, x + (alt ? 3 : 12), 8, 1, 7, '#a57d55')
      rect(image, x + (alt ? 1 : 7), 3, 3, 1, '#d6b083')
      rect(image, x + (alt ? 7 : 1), 11, 3, 1, '#d6b083')
      break
    }
    case 'floor-carpet':
      rect(image, x, 0, 16, 16, '#5d7f8c')
      for (let v = 0; v < 16; v += 4) for (let u = (v / 4) % 2 ? 2 : 0; u < 16; u += 4) rect(image, x + u, v, 1, 1, '#6d91a0')
      break
    case 'wall-top':
      rect(image, x, 0, 16, 16, '#3d4257')
      rect(image, x, 0, 16, 1, '#4b5169')
      break
    case 'wall-face':
      rect(image, x, 0, 16, 16, '#d8d3c4')
      rect(image, x, 0, 16, 2, '#b4af9f')
      rect(image, x, 13, 16, 3, '#8d7760')
      rect(image, x, 12, 16, 1, '#6f5c49')
      break
    case 'wall-base':
      rect(image, x, 0, 16, 16, '#3d4257')
      rect(image, x, 15, 16, 1, '#2b2433')
      break
    default:
      throw new Error(`Tuile inconnue : ${name}`)
  }
}

export function buildTiles() {
  const image = createImage(TILE_NAMES.length * 16, 16)
  TILE_NAMES.forEach((name, column) => drawTile(image, column, name))
  return image
}

function box(image, x, y, w, h, top, front, frontHeight) {
  rect(image, x, y, w, h, OUTLINE)
  rect(image, x + 1, y + 1, w - 2, h - frontHeight - 2, top)
  rect(image, x + 1, y + h - frontHeight - 1, w - 2, frontHeight, front)
}

/**
 * `footprint` : cases bloquées, en tuiles. `wall` : accroché au mur, sans collision.
 * Le bas de l'image correspond au bas de l'emprise, et sert à la profondeur.
 */
const PROPS = {
  desk: {
    size: [32, 28],
    footprint: [2, 1],
    draw(image, x, y) {
      box(image, x, y + 8, 32, 20, '#b98a58', '#8a6440', 9)
      rect(image, x + 2, y + 18, 28, 1, '#6d4f33')
      rect(image, x + 10, y, 12, 11, OUTLINE)
      rect(image, x + 11, y + 1, 10, 8, '#7fd1e0')
      rect(image, x + 12, y + 2, 5, 1, '#c7eef5')
      rect(image, x + 12, y + 4, 7, 1, '#a9e2ec')
      rect(image, x + 14, y + 11, 4, 2, OUTLINE)
      rect(image, x + 11, y + 14, 10, 3, OUTLINE)
      rect(image, x + 12, y + 15, 8, 1, '#e4e4e8')
    },
  },
  plant: {
    size: [16, 24],
    footprint: [1, 1],
    draw(image, x, y) {
      rect(image, x + 4, y + 16, 8, 8, OUTLINE)
      rect(image, x + 5, y + 17, 6, 6, '#c76f4a')
      rect(image, x + 5, y + 20, 6, 3, '#a55836')
      rect(image, x + 3, y + 3, 10, 13, OUTLINE)
      rect(image, x + 1, y + 7, 14, 7, OUTLINE)
      rect(image, x + 6, y + 1, 4, 3, OUTLINE)
      rect(image, x + 4, y + 4, 8, 11, '#4e9a5c')
      rect(image, x + 2, y + 8, 12, 5, '#4e9a5c')
      rect(image, x + 7, y + 2, 2, 3, '#4e9a5c')
      rect(image, x + 4, y + 6, 3, 2, '#75bd7b')
      rect(image, x + 9, y + 9, 3, 2, '#75bd7b')
      rect(image, x + 5, y + 12, 6, 2, '#3b7c49')
    },
  },
  bookshelf: {
    size: [32, 32],
    footprint: [2, 1],
    draw(image, x, y) {
      rect(image, x, y, 32, 32, OUTLINE)
      rect(image, x + 1, y + 1, 30, 30, '#8a6440')
      const books = ['#c7594b', '#4b7fc7', '#e0b84c', '#5a9e5a', '#8a5ab0', '#d97a2b']
      for (let shelf = 0; shelf < 3; shelf++) {
        const top = y + 3 + shelf * 9
        rect(image, x + 3, top, 26, 7, '#4f3926')
        for (let book = 0; book < 8; book++) {
          const height = 5 + ((book + shelf) % 2)
          rect(image, x + 4 + book * 3, top + 7 - height, 2, height, books[(book + shelf * 2) % books.length])
        }
      }
    },
  },
  'water-cooler': {
    size: [16, 28],
    footprint: [1, 1],
    draw(image, x, y) {
      rect(image, x + 4, y, 8, 11, OUTLINE)
      rect(image, x + 5, y + 1, 6, 9, '#8fd0ee')
      rect(image, x + 6, y + 2, 1, 6, '#c9ecf9')
      box(image, x + 3, y + 10, 10, 18, '#e4e6ec', '#c2c6d0', 12)
      rect(image, x + 5, y + 15, 2, 2, '#4b7fc7')
      rect(image, x + 9, y + 15, 2, 2, '#c7594b')
    },
  },
  printer: {
    size: [16, 22],
    footprint: [1, 1],
    draw(image, x, y) {
      box(image, x + 1, y + 6, 14, 16, '#c9cdd6', '#9fa4b0', 8)
      rect(image, x + 4, y + 2, 8, 6, OUTLINE)
      rect(image, x + 5, y + 3, 6, 5, '#f4f4f6')
      rect(image, x + 3, y + 16, 3, 2, '#5a9e5a')
    },
  },
  'coffee-counter': {
    size: [32, 28],
    footprint: [2, 1],
    draw(image, x, y) {
      box(image, x, y + 8, 32, 20, '#d9d4c7', '#8a6440', 10)
      rect(image, x + 5, y + 1, 11, 14, OUTLINE)
      rect(image, x + 6, y + 2, 9, 12, '#50566b')
      rect(image, x + 8, y + 8, 5, 4, '#2b2433')
      rect(image, x + 8, y + 4, 5, 2, '#c7594b')
      rect(image, x + 22, y + 9, 4, 4, OUTLINE)
      rect(image, x + 23, y + 10, 2, 2, '#f4f4f6')
    },
  },
  'meeting-table': {
    size: [48, 34],
    footprint: [3, 2],
    draw(image, x, y) {
      box(image, x, y + 2, 48, 32, '#a9794b', '#7c5835', 8)
      rect(image, x + 3, y + 5, 42, 1, '#c1925f')
    },
  },
  sofa: {
    size: [48, 24],
    footprint: [3, 1],
    draw(image, x, y) {
      box(image, x, y, 48, 24, '#b5534a', '#8e3f38', 10)
      rect(image, x + 15, y + 2, 1, 11, '#8e3f38')
      rect(image, x + 31, y + 2, 1, 11, '#8e3f38')
    },
  },
  whiteboard: {
    size: [32, 16],
    wall: true,
    draw(image, x, y) {
      rect(image, x, y, 32, 14, OUTLINE)
      rect(image, x + 1, y + 1, 30, 12, '#f4f4f6')
      rect(image, x + 1, y + 11, 30, 2, '#c9cdd6')
    },
  },
  window: {
    size: [32, 14],
    wall: true,
    draw(image, x, y) {
      rect(image, x, y, 32, 12, OUTLINE)
      rect(image, x + 1, y + 1, 30, 10, '#a7dbf0')
      rect(image, x + 15, y + 1, 2, 10, OUTLINE)
      rect(image, x + 3, y + 2, 7, 1, '#d7f1fa')
      rect(image, x + 19, y + 2, 7, 1, '#d7f1fa')
    },
  },
  door: {
    size: [32, 16],
    wall: true,
    draw(image, x, y) {
      rect(image, x, y, 32, 16, OUTLINE)
      rect(image, x + 1, y + 1, 30, 15, '#6f5c49')
      rect(image, x + 15, y + 1, 2, 15, OUTLINE)
      rect(image, x + 12, y + 8, 2, 2, '#e0b84c')
      rect(image, x + 18, y + 8, 2, 2, '#e0b84c')
    },
  },
}

export function buildProps() {
  const entries = Object.entries(PROPS)
  const width = entries.reduce((sum, [, prop]) => sum + prop.size[0] + 2, 0)
  const height = Math.max(...entries.map(([, prop]) => prop.size[1]))
  const image = createImage(width, height)
  const rects = {}
  let x = 0
  for (const [name, prop] of entries) {
    prop.draw(image, x, 0)
    rects[name] = {
      x,
      y: 0,
      width: prop.size[0],
      height: prop.size[1],
      footprint: prop.footprint ?? null,
      wall: prop.wall ?? false,
    }
    x += prop.size[0] + 2
  }
  return { image, rects }
}

export const BUBBLE_NAMES = ['unknown', 'thinking', 'unavailable', 'waiting']
export const BUBBLE_SIZE = 11

export function buildBubbles() {
  const image = createImage(BUBBLE_SIZE * BUBBLE_NAMES.length, BUBBLE_SIZE)
  BUBBLE_NAMES.forEach((name, column) => {
    const x = column * BUBBLE_SIZE
    rect(image, x + 1, 0, 9, 9, OUTLINE)
    rect(image, x, 1, 11, 7, OUTLINE)
    rect(image, x + 1, 1, 9, 7, '#f4f4f6')
    rect(image, x + 4, 9, 3, 1, OUTLINE)
    rect(image, x + 5, 10, 1, 1, OUTLINE)
    if (name === 'unknown') {
      rect(image, x + 4, 2, 3, 1, '#50566b')
      rect(image, x + 6, 3, 1, 1, '#50566b')
      rect(image, x + 5, 4, 1, 1, '#50566b')
      rect(image, x + 5, 6, 1, 1, '#50566b')
    } else if (name === 'thinking') {
      rect(image, x + 2, 4, 1, 1, '#50566b')
      rect(image, x + 5, 4, 1, 1, '#50566b')
      rect(image, x + 8, 4, 1, 1, '#50566b')
    } else if (name === 'waiting') {
      rect(image, x + 5, 2, 1, 3, '#d97a2b')
      rect(image, x + 5, 6, 1, 1, '#d97a2b')
    } else {
      rect(image, x + 3, 2, 1, 1, '#c7594b')
      rect(image, x + 7, 2, 1, 1, '#c7594b')
      rect(image, x + 4, 3, 1, 1, '#c7594b')
      rect(image, x + 6, 3, 1, 1, '#c7594b')
      rect(image, x + 5, 4, 1, 1, '#c7594b')
      rect(image, x + 4, 5, 1, 1, '#c7594b')
      rect(image, x + 6, 5, 1, 1, '#c7594b')
      rect(image, x + 3, 6, 1, 1, '#c7594b')
      rect(image, x + 7, 6, 1, 1, '#c7594b')
    }
  })
  return image
}
