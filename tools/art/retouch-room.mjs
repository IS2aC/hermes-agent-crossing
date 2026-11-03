// Remplace la plaque « CLAUDE » de la porte par « HERMES » dans la salle de Claude-Office.
// Usage : node tools/art/retouch-room.mjs <office-day.png d'origine> <sortie>
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('Usage : retouch-room.mjs <origine> <sortie>')

// Intérieur de la plaque, relevé sur l'image d'origine, et sa pente.
const PLATE = [[1010, 314], [1078, 340], [1078, 358], [1010, 332]]
const SLOPE = 26 / 68

const browser = await chromium.launch()
const page = await browser.newPage()
const data = await page.evaluate(async ({ src, plate, slope }) => {
  const image = new Image()
  image.src = src
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)
  context.fillStyle = '#2d3045'
  context.beginPath()
  plate.forEach(([x, y]) => context.lineTo(x, y))
  context.closePath()
  context.fill()
  context.setTransform(1, slope, 0, 1, 1044, 336)
  context.fillStyle = '#e8e8ee'
  context.font = 'bold 13px monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('HERMES', 0, 1)
  return canvas.toDataURL('image/png')
}, { src: `data:image/png;base64,${readFileSync(input).toString('base64')}`, plate: PLATE, slope: SLOPE })
writeFileSync(output, Buffer.from(data.split(',')[1], 'base64'))
await browser.close()
