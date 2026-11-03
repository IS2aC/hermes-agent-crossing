// Génère le spritesheet du Master Character et sa planche de présentation.
import { mkdirSync, writeFileSync } from 'node:fs'
import { buildSheet, sheetLayout } from './character.mjs'
import { encodePng } from './png.mjs'
import { sheetPreview } from './preview.mjs'
import { checkSheet } from './quality.mjs'

const sheet = buildSheet()
const issues = checkSheet(sheet, sheetLayout())

mkdirSync('public/assets/characters', { recursive: true })
mkdirSync('docs/art/previews', { recursive: true })
writeFileSync('public/assets/characters/character-master.png', encodePng(sheet))
writeFileSync('docs/art/previews/master-character.png', encodePng(sheetPreview(sheet)))

if (issues.length > 0) {
  console.error(issues.join('\n'))
  process.exit(1)
}
console.log(`OK : ${sheet.width}x${sheet.height}`)
