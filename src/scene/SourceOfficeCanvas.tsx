import { useEffect, useRef, useState } from 'react'
import { createImageCache, loadBrowserImage } from '../assets/loader'
import type { AssetManifest } from '../assets/manifest'
import { CharacterAnimator } from '../characters/animation'
import { createActor, navigateTo, updateActor, type Actor } from '../engine/actor'
import { worldToTile, type Point } from '../engine/grid'
import { createLoop } from '../engine/loop'
import type { CastEntry } from './OfficeCanvas'
import {
  allFiles,
  bobFor,
  characterFile,
  CHARACTER_HEIGHT,
  createWalkMap,
  deskSpotForTile,
  FURNITURE,
  furnitureSprite,
  poseForFacing,
  ROOM_FILE,
  toPercent,
  toWorld,
  VISITOR_SPRITE,
  WORLD,
  type Pose,
} from './sourceSkin'

const BASE = `${import.meta.env.BASE_URL}assets`
const SKIN_BASE = `${BASE}/skin-source`
const images = createImageCache(loadBrowserImage)
const VISITOR_START = toWorld({ x: 30, y: 76 })
const VISITOR_SPEED = 110

const KEY_DIRECTIONS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
}

interface Props {
  cast: readonly CastEntry[]
  selectedId: string | null
  onSelect(id: string): void
}

type Images = Map<string, HTMLImageElement>

interface Bubbles {
  sheet: HTMLImageElement
  size: number
  columns: Record<string, { column: number } | undefined>
}

export function SourceOfficeCanvas({ cast, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const inputsRef = useRef<Props>({ cast, selectedId, onSelect })
  const [loadError, setLoadError] = useState<string | null>(null)
  inputsRef.current = { cast, selectedId, onSelect }

  useEffect(() => {
    let disposed = false
    let cleanup = () => {}

    const start = async () => {
      const response = await fetch(`${BASE}/manifest.json`)
      if (!response.ok) throw new Error(`Manifeste introuvable (${response.status})`)
      const manifest = (await response.json()) as AssetManifest
      const files = allFiles()
      const [loaded, sheet] = await Promise.all([
        Promise.all(files.map((file) => images(`${SKIN_BASE}/${file}`))),
        images(`${BASE}/${manifest.bubbles.file}`),
      ])
      if (disposed) return
      const library: Images = new Map(files.map((file, index) => [file, loaded[index]!]))
      const bubbles: Bubbles = { sheet, size: manifest.bubbles.size, columns: manifest.bubbles.ids }
      cleanup = runScene(canvasRef.current!, statusRef.current!, library, bubbles, inputsRef)
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
      <canvas ref={canvasRef} className="office-canvas source-skin" data-testid="office-canvas" />
      <p ref={statusRef} className="office-status" data-testid="office-status" />
      {loadError && (
        <p className="office-error" role="alert">
          Impossible de charger les graphismes : {loadError}
        </p>
      )}
    </div>
  )
}

function runScene(
  canvas: HTMLCanvasElement,
  status: HTMLElement,
  library: Images,
  bubbles: Bubbles,
  inputs: { current: Props },
): () => void {
  const context = canvas.getContext('2d')!
  const map = createWalkMap()
  const room = library.get(ROOM_FILE)!
  const visitor: Actor = createActor(worldToTile(VISITOR_START), VISITOR_SPEED)
  const visitorAnimator = new CharacterAnimator('idle')
  const animators = new Map<string, CharacterAnimator>()
  const pressed = new Set<string>()
  let scale = 1
  let offset: Point = { x: 0, y: 0 }
  let elapsed = 0
  let message = ''

  const resize = () => {
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(canvas.clientWidth * ratio)
    canvas.height = Math.floor(canvas.clientHeight * ratio)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  const toScene = (event: MouseEvent): Point => {
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) * ratio - offset.x) / scale,
      y: ((event.clientY - rect.top) * ratio - offset.y) / scale,
    }
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
    if (KEY_DIRECTIONS[event.key]) {
      pressed.add(event.key)
      event.preventDefault()
    }
  }
  const onKeyUp = (event: KeyboardEvent) => pressed.delete(event.key)
  const onClick = (event: MouseEvent) => {
    const point = toScene(event)
    for (const entry of inputs.current.cast) {
      const spot = deskSpotForTile(entry.tile)
      if (!spot) continue
      const feet = toWorld(spot)
      if (Math.abs(point.x - feet.x) <= 14 && point.y >= feet.y - CHARACTER_HEIGHT && point.y <= feet.y + 2) {
        inputs.current.onSelect(entry.id)
        return
      }
    }
    message = navigateTo(visitor, map, worldToTile(point)) ? '' : 'Case inaccessible'
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  canvas.addEventListener('click', onClick)

  const drawCharacter = (feet: Point, spriteId: string, pose: Pose, lift: number, selected: boolean, bubble: string | null) => {
    const image = library.get(characterFile(spriteId, pose))!
    const width = (image.naturalWidth / image.naturalHeight) * CHARACTER_HEIGHT
    if (selected) {
      context.strokeStyle = '#f2c14e'
      context.lineWidth = 2
      context.beginPath()
      context.ellipse(feet.x, feet.y, 17, 8, 0, 0, Math.PI * 2)
      context.stroke()
    }
    const top = feet.y - CHARACTER_HEIGHT - lift
    context.drawImage(image, feet.x - width / 2, top, width, CHARACTER_HEIGHT)
    const column = bubble ? bubbles.columns[bubble]?.column : undefined
    if (column !== undefined) {
      context.imageSmoothingEnabled = false
      context.drawImage(bubbles.sheet, column * bubbles.size, 0, bubbles.size, bubbles.size, feet.x + 4, top - 14, bubbles.size * 2, bubbles.size * 2)
      context.imageSmoothingEnabled = true
    }
  }

  const loop = createLoop({
    update(seconds) {
      elapsed += seconds
      const input = { x: 0, y: 0 }
      for (const key of pressed) {
        input.x += KEY_DIRECTIONS[key]?.x ?? 0
        input.y += KEY_DIRECTIONS[key]?.y ?? 0
      }
      updateActor(visitor, map, seconds, input)
      visitorAnimator.setState(visitor.moving ? 'walk' : 'idle')
      for (const entry of inputs.current.cast) {
        const animator = animators.get(entry.id)
        if (animator) animator.setState(entry.state)
        else animators.set(entry.id, new CharacterAnimator(entry.state))
      }
    },
    render() {
      scale = Math.min(canvas.width / WORLD.width, canvas.height / WORLD.height)
      offset = {
        x: Math.floor((canvas.width - WORLD.width * scale) / 2),
        y: Math.floor((canvas.height - WORLD.height * scale) / 2),
      }
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.fillStyle = '#12162a'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.setTransform(scale, 0, 0, scale, offset.x, offset.y)
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(room, 0, 0, WORLD.width, WORLD.height)

      const layers: { depth: number; draw(): void }[] = FURNITURE.map((item) => ({
        depth: item.y,
        draw() {
          const { file, height } = furnitureSprite(item.sprite)
          const image = library.get(file)!
          const width = (image.naturalWidth / image.naturalHeight) * height
          const feet = toWorld(item)
          context.drawImage(image, feet.x - width / 2, feet.y - height, width, height)
        },
      }))
      for (const entry of inputs.current.cast) {
        const spot = deskSpotForTile(entry.tile)
        if (!spot) continue
        const state = animators.get(entry.id)?.state ?? entry.state
        const frame = BUBBLE_BY_STATE[state] ?? null
        layers.push({
          depth: spot.depth,
          draw: () => drawCharacter(toWorld(spot), entry.spriteId, spot.pose, bobFor(state, elapsed), entry.id === inputs.current.selectedId, frame),
        })
      }
      layers.push({
        depth: toPercent(visitor).y,
        draw: () => drawCharacter(visitor, VISITOR_SPRITE, poseForFacing(visitor.facing), bobFor(visitorAnimator.state, elapsed), false, null),
      })
      for (const layer of layers.sort((a, b) => a.depth - b.depth)) layer.draw()

      const tile = worldToTile(visitor)
      status.dataset.x = String(visitor.x)
      status.dataset.y = String(visitor.y)
      status.dataset.facing = visitor.facing
      status.dataset.scale = String(scale)
      status.dataset.offsetX = String(offset.x)
      status.dataset.offsetY = String(offset.y)
      status.dataset.animation = visitorAnimator.state
      status.dataset.cast = inputs.current.cast.map((entry) => `${entry.id}:${animators.get(entry.id)?.state ?? entry.state}`).join(',')
      status.textContent = `Case ${tile.x},${tile.y}${message ? ` · ${message}` : ''}`
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

const BUBBLE_BY_STATE: Partial<Record<CastEntry['state'], string>> = {
  think: 'bubble.thinking',
  unknown: 'bubble.unknown',
  unavailable: 'bubble.unavailable',
  waiting: 'bubble.waiting',
}
