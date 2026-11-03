// Contrôle le build livré : aucun secret côté navigateur, aucun asset de provenance inconnue.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const DIST = process.argv[2] ?? 'dist'

const FORBIDDEN_IN_CLIENT = [
  ['API_SERVER_KEY', /API_SERVER_KEY/],
  ['HERMES_KEY_', /HERMES_KEY_/],
  ['HERMES_PROFILES', /HERMES_PROFILES/],
  ['OPERATOR_PASSWORD_HASH', /OPERATOR_PASSWORD_HASH/],
  ['DATABASE_URL', /DATABASE_URL/],
  ['chaîne de connexion PostgreSQL', /postgres(?:ql)?:\/\//],
  ['port du dashboard Hermes', /\b9119\b/],
  ['port de l\'API Hermes', /:8642\b/],
  ['appel de Hermes', /\/v1\/runs/],
  ['clé de type sk-', /\bsk-[A-Za-z0-9]{16,}/],
]
const FORBIDDEN_PATHS = [/office\/characters/, /office\/props/, /dunder/i, /\.env/, /\.map$/, /\/Me-\d/, /TEMPLATE/, /Helper/, /-dm\.png$/]
// Images de Claude-Office sous licence MIT, licence et notice à côté.
const SOURCE_SKIN = 'assets/skin-source/'

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const problems = []
const files = walk(DIST)
if (files.length === 0) problems.push('Build vide')

const manifest = JSON.parse(readFileSync(join(DIST, 'assets/manifest.json'), 'utf8'))
const declared = new Set([
  'assets/manifest.json',
  ...Object.values(manifest.characters).map((character) => `assets/${character.file}`),
  `assets/${manifest.tiles.file}`,
  `assets/${manifest.props.file}`,
  `assets/${manifest.bubbles.file}`,
])
if (!manifest.provenance?.method?.includes('sans image externe')) problems.push('Provenance absente du manifeste')

for (const file of files) {
  const path = relative(DIST, file).replaceAll('\\', '/')
  for (const pattern of FORBIDDEN_PATHS) if (pattern.test(path)) problems.push(`Fichier interdit : ${path}`)
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(path) && !declared.has(path) && !path.startsWith(SOURCE_SKIN)) problems.push(`Image hors manifeste : ${path}`)
  if (/\.(js|css|html|json)$/.test(path)) {
    const content = readFileSync(file, 'utf8')
    for (const [label, pattern] of FORBIDDEN_IN_CLIENT) if (pattern.test(content)) problems.push(`${label} trouvé dans ${path}`)
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`OK : ${files.length} fichiers contrôlés`)
