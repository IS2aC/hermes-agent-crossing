// Planches de présentation agrandies : pour l'œil, jamais chargées par le moteur.
import { createImage, getPixel, setPixel } from './png.mjs'
import { ANIMATIONS, CELL, DIRECTIONS, SHEET_COLUMNS } from './character.mjs'

const CHECKER = [[226, 228, 232, 255], [206, 209, 215, 255]]

function background(image, size = 8) {
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      setPixel(image, x, y, CHECKER[(Math.floor(x / size) + Math.floor(y / size)) % 2])
    }
  }
}

function blit(target, source, sx, sy, w, h, dx, dy, scale) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pixel = getPixel(source, sx + x, sy + y)
      if (pixel[3] === 0) continue
      for (let v = 0; v < scale; v++) {
        for (let u = 0; u < scale; u++) setPixel(target, dx + x * scale + u, dy + y * scale + v, pixel)
      }
    }
  }
}

/** Lignes : animations. Colonnes : directions, chacune avec ses frames. */
export function sheetPreview(sheet, scale = 4) {
  const rows = Object.keys(ANIMATIONS).length
  const columns = DIRECTIONS.length * SHEET_COLUMNS
  const image = createImage(columns * CELL.width * scale, rows * CELL.height * scale)
  background(image)
  Object.keys(ANIMATIONS).forEach((animation, animationIndex) => {
    DIRECTIONS.forEach((_, directionIndex) => {
      const sourceRow = animationIndex * DIRECTIONS.length + directionIndex
      for (let frame = 0; frame < ANIMATIONS[animation].frames; frame++) {
        blit(image, sheet, frame * CELL.width, sourceRow * CELL.height, CELL.width, CELL.height,
          (directionIndex * SHEET_COLUMNS + frame) * CELL.width * scale, animationIndex * CELL.height * scale, scale)
      }
    })
  })
  return image
}

/** Une pose de face et de profil par personnage, pour comparer une famille. */
export function familyPreview(sheets, scale = 4) {
  const image = createImage(sheets.length * CELL.width * 2 * scale, CELL.height * scale)
  background(image)
  sheets.forEach((sheet, index) => {
    blit(image, sheet, 0, 0, CELL.width, CELL.height, index * 2 * CELL.width * scale, 0, scale)
    blit(image, sheet, 0, 2 * CELL.height, CELL.width, CELL.height, (index * 2 + 1) * CELL.width * scale, 0, scale)
  })
  return image
}

export function scaledPreview(source, scale = 3) {
  const image = createImage(source.width * scale, source.height * scale)
  background(image)
  blit(image, source, 0, 0, source.width, source.height, 0, 0, scale)
  return image
}
