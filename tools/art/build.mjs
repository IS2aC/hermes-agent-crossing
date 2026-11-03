// Génère les assets du jeu, le manifeste et les planches de présentation.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { buildAssets } from './assets.mjs'
import { sheetLayout } from './character.mjs'
import { encodePng } from './png.mjs'
import { familyPreview, scaledPreview, sheetPreview } from './preview.mjs'
import { checkSheet } from './quality.mjs'

const ROOT = 'public/assets'
const PREVIEWS = 'docs/art/previews'

const { manifest, images, sheets } = buildAssets()

for (const [path, image] of Object.entries(images)) {
  const target = join(ROOT, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, encodePng(image))
}
writeFileSync(join(ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

mkdirSync(PREVIEWS, { recursive: true })
writeFileSync(join(PREVIEWS, 'master-character.png'), encodePng(sheetPreview(sheets.master)))
writeFileSync(join(PREVIEWS, 'character-family.png'), encodePng(familyPreview(Object.values(sheets))))
writeFileSync(join(PREVIEWS, 'character-jarvis.png'), encodePng(sheetPreview(sheets.jarvis)))
writeFileSync(join(PREVIEWS, 'character-veilleur.png'), encodePng(sheetPreview(sheets.veilleur)))
writeFileSync(join(PREVIEWS, 'props.png'), encodePng(scaledPreview(images['environment/props.png'])))
writeFileSync(join(PREVIEWS, 'tiles.png'), encodePng(scaledPreview(images['environment/tiles.png'], 6)))

let failed = false
for (const [id, sheet] of Object.entries(sheets)) {
  const issues = checkSheet(sheet, sheetLayout())
  if (issues.length > 0) {
    failed = true
    console.error(`${id} :\n  ${issues.join('\n  ')}`)
  }
}
if (failed) process.exit(1)
console.log(`OK : ${Object.keys(images).length} images, ${Object.keys(sheets).length} personnages`)
