import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createImageCache, loadAssets } from '../../src/assets/loader'
import type { AssetManifest } from '../../src/assets/manifest'
import { buildAssets } from '../../tools/art/assets.mjs'
import { decodePng, encodePng } from '../../tools/art/png.mjs'
import { checkSheet } from '../../tools/art/quality.mjs'

const ROOT = 'public/assets'
const manifest: AssetManifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'))
const read = (file: string) => decodePng(readFileSync(join(ROOT, file)))

describe('fichiers versionnés', () => {
  const built = buildAssets()
  const images: Record<string, ReturnType<typeof decodePng>> = built.images

  it('le manifeste correspond à la source', () => {
    expect(manifest).toEqual(JSON.parse(JSON.stringify(built.manifest)))
  })

  it.each(Object.keys(images))('%s correspond exactement à la source', (file) => {
    const image = images[file]!
    expect(Buffer.compare(readFileSync(join(ROOT, file)), encodePng(image))).toBe(0)
  })
})

describe('PNG', () => {
  it('survit à un aller-retour d\'encodage', () => {
    const { images } = buildAssets()
    const original = images['environment/tiles.png']!
    const decoded = decodePng(encodePng(original))
    expect(decoded.width).toBe(original.width)
    expect(Buffer.compare(Buffer.from(decoded.data), Buffer.from(original.data))).toBe(0)
  })
})

describe('personnages', () => {
  const ids = Object.keys(manifest.characters)

  it('contient le Master et les 7 membres de la famille', () => {
    expect(ids.sort()).toEqual([
      'character.data-analyst', 'character.developer', 'character.devops', 'character.jarvis',
      'character.master', 'character.researcher', 'character.security', 'character.veilleur',
    ])
  })

  it.each(Object.entries(manifest.characters))('%s respecte les règles de qualité', (_id, { file }) => {
    expect(checkSheet(read(file), manifest.sprite)).toEqual([])
  })

  it('prévoit les animations demandées, dans les 4 directions', () => {
    expect(Object.keys(manifest.sprite.animations)).toEqual(['idle', 'walk', 'work', 'think'])
    expect(manifest.sprite.directions).toEqual(['down', 'left', 'right', 'up'])
  })
})

describe('environnement', () => {
  it('garde des identifiants stables, préfixés par leur catégorie', () => {
    for (const id of Object.keys(manifest.characters)) expect(id).toMatch(/^character\.[a-z-]+$/)
    for (const id of Object.keys(manifest.tiles.ids)) expect(id).toMatch(/^tile\.[a-z-]+$/)
    for (const id of Object.keys(manifest.props.ids)) expect(id).toMatch(/^prop\.[a-z-]+$/)
    for (const id of Object.keys(manifest.bubbles.ids)) expect(id).toMatch(/^bubble\.[a-z-]+$/)
  })

  it('place chaque objet à l\'intérieur de son atlas, sans chevauchement', () => {
    const atlas = read(manifest.props.file)
    const props = Object.values(manifest.props.ids).sort((a, b) => a.x - b.x)
    props.forEach((prop, index) => {
      expect(prop.x + prop.width).toBeLessThanOrEqual(atlas.width)
      expect(prop.y + prop.height).toBeLessThanOrEqual(atlas.height)
      const next = props[index + 1]
      if (next) expect(prop.x + prop.width).toBeLessThanOrEqual(next.x)
    })
  })

  it('distingue objets muraux et objets au sol', () => {
    for (const prop of Object.values(manifest.props.ids)) {
      expect(prop.wall ? prop.footprint === null : prop.footprint !== null).toBe(true)
    }
  })

  it('ne contient que des pixels opaques ou transparents', () => {
    for (const file of [manifest.tiles.file, manifest.props.file, manifest.bubbles.file]) {
      const { data } = read(file)
      for (let i = 3; i < data.length; i += 4) expect(data[i] === 0 || data[i] === 255).toBe(true)
    }
  })

  it('remplit entièrement chaque tuile', () => {
    const { data, width, height } = read(manifest.tiles.file)
    expect(height).toBe(16)
    expect(width).toBe(Object.keys(manifest.tiles.ids).length * 16)
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255)
  })

  it('indique la provenance et n\'utilise aucune image externe', () => {
    expect(manifest.provenance.source).toBe('tools/art/')
    expect(manifest.provenance.method).toMatch(/sans image externe/)
  })
})

describe('chargement', () => {
  it('ne demande chaque image qu\'une fois', async () => {
    const load = vi.fn(async (url: string) => url)
    const cached = createImageCache(load)
    await Promise.all([cached('a.png'), cached('a.png')])
    await cached('a.png')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('permet de réessayer après un échec', async () => {
    const load = vi.fn<(url: string) => Promise<string>>()
      .mockRejectedValueOnce(new Error('réseau'))
      .mockResolvedValueOnce('ok')
    const cached = createImageCache(load)
    await expect(cached('a.png')).rejects.toThrow('réseau')
    await expect(cached('a.png')).resolves.toBe('ok')
  })

  it('charge tous les fichiers du manifeste', async () => {
    const load = vi.fn(async (url: string) => url)
    const assets = await loadAssets(manifest, '/assets', load)
    expect(assets.characters.get('character.jarvis')).toBe('/assets/characters/character-jarvis.png')
    expect(assets.tiles).toBe('/assets/environment/tiles.png')
    expect(load).toHaveBeenCalledTimes(Object.keys(manifest.characters).length + 3)
  })

  it('échoue explicitement si un fichier manque', async () => {
    const load = vi.fn(async (url: string) => {
      if (url.includes('props')) throw new Error('absent')
      return url
    })
    await expect(loadAssets(manifest, '/assets', load)).rejects.toThrow('absent')
  })
})
