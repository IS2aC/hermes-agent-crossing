import { useEffect, useRef, useState } from 'react'
import { createImageCache, loadAssets, loadBrowserImage } from '../assets/loader'
import type { AssetManifest } from '../assets/manifest'
import { CharacterAnimator, type VisualState } from '../characters/animation'
import { navigateTo, updateActor, type Actor } from '../engine/actor'
import { clampZoom, computeView, fitZoom, screenToWorld, type View } from '../engine/camera'
import { worldToTile, type Point } from '../engine/grid'
import { createLoop } from '../engine/loop'
import { renderFrame } from '../engine/renderer'
import { worldSize } from '../engine/tilemap'
import { characterCommand, createGroundLayer, propCommands } from './draw'
import { createOfficeScene, createSpotActor, PROP_PLACEMENTS } from './office'

const ASSET_BASE = `${import.meta.env.BASE_URL}assets`
const images = createImageCache(loadBrowserImage)

const KEY_DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
}

export interface CastEntry {
  id: string
  spriteId: string
  tile: Point
  /** État à afficher, fourni de l'extérieur : le canvas ne le déduit jamais. */
  state: VisualState
}

interface OfficeCanvasProps {
  cast: readonly CastEntry[]
  selectedId: string | null
  onSelect(id: string): void
}

interface SceneInputs {
  cast: readonly CastEntry[]
  selectedId: string | null
  onSelect(id: string): void
}

export function OfficeCanvas({ cast, selectedId, onSelect }: OfficeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const inputsRef = useRef<SceneInputs>({ cast, selectedId, onSelect })
  const [loadError, setLoadError] = useState<string | null>(null)
  inputsRef.current = { cast, selectedId, onSelect }

  useEffect(() => {
    let disposed = false
    let cleanup = () => {}

    const start = async () => {
      const response = await fetch(`${ASSET_BASE}/manifest.json`)
      if (!response.ok) throw new Error(`Manifeste introuvable (${response.status})`)
      const manifest = (await response.json()) as AssetManifest
      const assets = await loadAssets(manifest, ASSET_BASE, images)
      if (disposed) return
      cleanup = runScene(canvasRef.current!, statusRef.current!, assets, inputsRef)
    }
    start().catch((error: unknown) => {
      if (!disposed) setLoadError(error instanceof Error ? error.message : String(error))
    })

    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  return (
    <div className="office">
      <canvas ref={canvasRef} className="office-canvas" data-testid="office-canvas" />
      <p ref={statusRef} className="office-status" data-testid="office-status" />
      {loadError && (
        <p className="office-error" role="alert">
          Impossible de charger les graphismes : {loadError}
        </p>
      )}
    </div>
  )
}

/** La zone cliquable couvre le corps visible, au-dessus des pieds. */
function hitsCharacter(actor: Actor, world: Point): boolean {
  return Math.abs(world.x - actor.x) <= 7 && world.y >= actor.y - 22 && world.y <= actor.y + 1
}

function syncMembers(
  members: Map<string, { actor: Actor; animator: CharacterAnimator; entry: CastEntry }>,
  cast: readonly CastEntry[],
): void {
  const ids = new Set(cast.map((entry) => entry.id))
  for (const id of members.keys()) if (!ids.has(id)) members.delete(id)
  for (const entry of cast) {
    const member = members.get(entry.id)
    if (!member) {
      members.set(entry.id, { actor: createSpotActor(entry.tile), animator: new CharacterAnimator(entry.state), entry })
      continue
    }
    if (member.entry.tile.x !== entry.tile.x || member.entry.tile.y !== entry.tile.y) member.actor = createSpotActor(entry.tile)
    member.animator.setState(entry.state)
    member.entry = entry
  }
}

function runScene(
  canvas: HTMLCanvasElement,
  status: HTMLElement,
  assets: Awaited<ReturnType<typeof loadAssets<HTMLImageElement>>>,
  inputs: { current: SceneInputs },
): () => void {
  const context = canvas.getContext('2d')!
  const { manifest } = assets
  const scene = createOfficeScene(manifest)
  const world = worldSize(scene.map)
  const ground = createGroundLayer(scene.map, PROP_PLACEMENTS, assets)
  const props = propCommands(PROP_PLACEMENTS, assets)
  const playerAnimator = new CharacterAnimator('idle')
  const members = new Map<string, { actor: Actor; animator: CharacterAnimator; entry: CastEntry }>()
  const pressed = new Set<string>()
  let view: View = { scale: 1, offsetX: 0, offsetY: 0 }
  let zoom: number | null = null
  let message = ''

  const resize = () => {
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(canvas.clientWidth * ratio)
    canvas.height = Math.floor(canvas.clientHeight * ratio)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLSelectElement) return
    if (KEY_DIRECTIONS[event.key]) {
      pressed.add(event.key)
      event.preventDefault()
    } else if (event.key === '+' || event.key === '=') {
      zoom = clampZoom(view.scale + 1)
    } else if (event.key === '-') {
      zoom = clampZoom(view.scale - 1)
    } else if (event.key === '0') {
      zoom = null
    }
  }
  const onKeyUp = (event: KeyboardEvent) => pressed.delete(event.key)
  const onClick = (event: MouseEvent) => {
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const world = screenToWorld(view, {
      x: (event.clientX - rect.left) * ratio,
      y: (event.clientY - rect.top) * ratio,
    })
    for (const { actor, entry } of members.values()) {
      if (hitsCharacter(actor, world)) {
        inputs.current.onSelect(entry.id)
        return
      }
    }
    message = navigateTo(scene.player, scene.map, worldToTile(world)) ? '' : 'Case inaccessible'
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  canvas.addEventListener('click', onClick)

  const loop = createLoop({
    update(seconds) {
      const input = { x: 0, y: 0 }
      for (const key of pressed) {
        input.x += KEY_DIRECTIONS[key]?.x ?? 0
        input.y += KEY_DIRECTIONS[key]?.y ?? 0
      }
      updateActor(scene.player, scene.map, seconds, input)
      playerAnimator.setState(scene.player.moving ? 'walk' : 'idle')
      playerAnimator.update(seconds)
      syncMembers(members, inputs.current.cast)
      for (const { animator } of members.values()) animator.update(seconds)
    },
    render() {
      view = computeView({
        viewWidth: canvas.width,
        viewHeight: canvas.height,
        worldWidth: world.width,
        worldHeight: world.height,
        zoom: zoom ?? fitZoom(canvas.width, canvas.height, world.width, world.height),
        focus: scene.player,
      })
      const characters = [
        characterCommand(scene.player, 'character.master', playerAnimator.frame(manifest.sprite, scene.player.facing), assets),
        ...[...members.values()].map(({ actor, animator, entry }) =>
          characterCommand(actor, entry.spriteId, animator.frame(manifest.sprite, actor.facing), assets, entry.id === inputs.current.selectedId)),
      ]
      renderFrame(context, {
        width: canvas.width,
        height: canvas.height,
        background: '#1f2230',
        view,
        ground: (target) => target.drawImage(ground, 0, 0),
        commands: [...props, ...characters],
      })
      const tile = worldToTile(scene.player)
      status.dataset.x = String(scene.player.x)
      status.dataset.y = String(scene.player.y)
      status.dataset.scale = String(view.scale)
      status.dataset.offsetX = String(view.offsetX)
      status.dataset.offsetY = String(view.offsetY)
      status.dataset.animation = playerAnimator.state
      status.dataset.cast = [...members.values()].map(({ entry, animator }) => `${entry.id}:${animator.state}`).join(',')
      status.textContent = `Tuile ${tile.x},${tile.y} · échelle ×${view.scale}${message ? ` · ${message}` : ''}`
    },
  }, {
    request: (callback) => requestAnimationFrame(callback),
    cancel: (handle) => cancelAnimationFrame(handle),
  })

  return () => {
    loop.stop()
    observer.disconnect()
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    canvas.removeEventListener('click', onClick)
  }
}
