import { useEffect, useRef } from 'react'
import { updateActor, navigateTo } from '../engine/actor'
import { clampZoom, computeView, fitZoom, screenToWorld, type View } from '../engine/camera'
import { TILE_SIZE, worldToTile } from '../engine/grid'
import { createLoop } from '../engine/loop'
import { renderFrame, snap, type DrawCommand } from '../engine/renderer'
import { tileAt, worldSize } from '../engine/tilemap'
import { createDemoScene } from './demoScene'

const KEY_DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
}

export function OfficeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const context = canvas.getContext('2d')!
    const scene = createDemoScene()
    const world = worldSize(scene.map)
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
      const target = worldToTile(screenToWorld(view, {
        x: (event.clientX - rect.left) * ratio,
        y: (event.clientY - rect.top) * ratio,
      }))
      message = navigateTo(scene.player, scene.map, target) ? '' : 'Case inaccessible'
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('click', onClick)

    const drawGround = (target: CanvasRenderingContext2D) => {
      for (let y = 0; y < scene.map.height; y++) {
        for (let x = 0; x < scene.map.width; x++) {
          const wall = tileAt(scene.map, { x, y }) === 'wall'
          target.fillStyle = wall ? '#5b6175' : (x + y) % 2 ? '#d9c7a5' : '#d2bf9b'
          target.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }
    }

    const loop = createLoop({
      update(seconds) {
        const input = { x: 0, y: 0 }
        for (const key of pressed) {
          input.x += KEY_DIRECTIONS[key]?.x ?? 0
          input.y += KEY_DIRECTIONS[key]?.y ?? 0
        }
        updateActor(scene.player, scene.map, seconds, input)
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
        const player: DrawCommand = {
          depth: scene.player.y,
          draw(target) {
            target.fillStyle = '#35508f'
            target.fillRect(snap(scene.player.x) - 5, snap(scene.player.y) - 16, 10, 18)
          },
        }
        const obstacles: DrawCommand[] = []
        for (let y = 0; y < scene.map.height; y++) {
          for (let x = 0; x < scene.map.width; x++) {
            if (tileAt(scene.map, { x, y }) !== 'obstacle') continue
            obstacles.push({
              depth: (y + 1) * TILE_SIZE,
              draw(target) {
                target.fillStyle = '#8a6d4b'
                target.fillRect(x * TILE_SIZE, y * TILE_SIZE - 8, TILE_SIZE, TILE_SIZE + 8)
              },
            })
          }
        }
        renderFrame(context, {
          width: canvas.width,
          height: canvas.height,
          background: '#1f2230',
          view,
          ground: drawGround,
          commands: [...obstacles, player],
        })
        const tile = worldToTile(scene.player)
        const status = statusRef.current!
        status.dataset.x = String(scene.player.x)
        status.dataset.y = String(scene.player.y)
        status.dataset.scale = String(view.scale)
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
  }, [])

  return (
    <div className="office">
      <canvas ref={canvasRef} className="office-canvas" data-testid="office-canvas" />
      <p ref={statusRef} className="office-status" data-testid="office-status" />
    </div>
  )
}
