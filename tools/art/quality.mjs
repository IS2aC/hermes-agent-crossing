// Règles de qualité d'un spritesheet, renvoyées sous forme de liste d'écarts.
import { getPixel } from './png.mjs'

function cellBounds(sheet, cell, column, row) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1
  for (let y = 0; y < cell.height; y++) {
    for (let x = 0; x < cell.width; x++) {
      if (getPixel(sheet, column * cell.width + x, row * cell.height + y)[3] === 0) continue
      minX = Math.min(minX, x); minY = Math.min(minY, y)
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY }
}

export function checkSheet(sheet, layout, { maxColors = 16 } = {}) {
  const { cell, anchor, directions, animations, columns } = layout
  const issues = []
  if (sheet.width !== cell.width * columns) issues.push(`Largeur inattendue : ${sheet.width}`)
  const rows = Object.keys(animations).length * directions.length
  if (sheet.height !== cell.height * rows) issues.push(`Hauteur inattendue : ${sheet.height}`)

  const colors = new Set()
  for (let i = 0; i < sheet.data.length; i += 4) {
    const alpha = sheet.data[i + 3]
    if (alpha !== 0 && alpha !== 255) {
      issues.push('Pixel semi-transparent')
      break
    }
    if (alpha === 255) colors.add(`${sheet.data[i]},${sheet.data[i + 1]},${sheet.data[i + 2]}`)
  }
  if (colors.size > maxColors) issues.push(`Trop de couleurs : ${colors.size}`)

  for (let y = 0; y < sheet.height; y++) {
    for (let x = 0; x < sheet.width; x++) {
      if (getPixel(sheet, x, y)[3] === 0) continue
      const lonely = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => {
        const nx = x + dx
        const ny = y + dy
        const sameCell = Math.floor(nx / cell.width) === Math.floor(x / cell.width)
          && Math.floor(ny / cell.height) === Math.floor(y / cell.height)
        return !sameCell || nx < 0 || ny < 0 || nx >= sheet.width || ny >= sheet.height
          || getPixel(sheet, nx, ny)[3] === 0
      })
      if (lonely) issues.push(`Pixel isolé en ${x},${y}`)
    }
  }

  for (const [name, spec] of Object.entries(animations)) {
    directions.forEach((direction, directionIndex) => {
      const row = spec.firstRow + directionIndex
      for (let column = 0; column < columns; column++) {
        const bounds = cellBounds(sheet, cell, column, row)
        const label = `${name}/${direction}/${column}`
        if (column >= spec.frames) {
          if (bounds) issues.push(`${label} devrait être vide`)
          continue
        }
        if (!bounds) {
          issues.push(`${label} est vide`)
          continue
        }
        if (bounds.minX === 0 || bounds.minY === 0 || bounds.maxX === cell.width - 1) {
          issues.push(`${label} touche le bord de la cellule`)
        }
        if (bounds.maxY !== anchor.y - 1) {
          issues.push(`${label} : pieds en y=${bounds.maxY}, attendu ${anchor.y - 1}`)
        }
      }
    })
  }
  return issues
}
