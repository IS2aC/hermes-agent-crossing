import type { AssetManifest } from './manifest'

export type ImageFactory<T> = (url: string) => Promise<T>

/** Une image n'est demandée qu'une fois ; un échec peut être retenté. */
export function createImageCache<T>(load: ImageFactory<T>): ImageFactory<T> {
  const cache = new Map<string, Promise<T>>()
  return (url) => {
    const existing = cache.get(url)
    if (existing) return existing
    const pending = load(url).catch((error: unknown) => {
      cache.delete(url)
      throw error
    })
    cache.set(url, pending)
    return pending
  }
}

export interface LoadedAssets<T> {
  manifest: AssetManifest
  characters: Map<string, T>
  tiles: T
  props: T
  bubbles: T
}

export async function loadAssets<T>(manifest: AssetManifest, baseUrl: string, image: ImageFactory<T>): Promise<LoadedAssets<T>> {
  const url = (file: string) => `${baseUrl}/${file}`
  const entries = Object.entries(manifest.characters)
  const [sheets, tiles, props, bubbles] = await Promise.all([
    Promise.all(entries.map(([, character]) => image(url(character.file)))),
    image(url(manifest.tiles.file)),
    image(url(manifest.props.file)),
    image(url(manifest.bubbles.file)),
  ])
  return {
    manifest,
    characters: new Map(entries.map(([id], index) => [id, sheets[index]!])),
    tiles,
    props,
    bubbles,
  }
}

export function loadBrowserImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error(`Image introuvable : ${url}`))
    element.src = url
  })
}
