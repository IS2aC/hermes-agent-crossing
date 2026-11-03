import { expect, test, type Page } from '@playwright/test'

const TILE = 16

async function status(page: Page) {
  const element = page.getByTestId('office-status')
  const number = async (name: string) => Number(await element.getAttribute(`data-${name}`))
  return {
    x: await number('x'),
    y: await number('y'),
    scale: await number('scale'),
    offsetX: await number('offset-x'),
    offsetY: await number('offset-y'),
    animation: await element.getAttribute('data-animation'),
    text: (await element.textContent()) ?? '',
  }
}

/** Lit un pixel du canvas à partir de coordonnées du monde. */
async function worldPixel(page: Page, worldX: number, worldY: number) {
  const view = await status(page)
  const x = view.offsetX + worldX * view.scale + Math.floor(view.scale / 2)
  const y = view.offsetY + worldY * view.scale + Math.floor(view.scale / 2)
  return page.getByTestId('office-canvas').evaluate((node: HTMLCanvasElement, point) => {
    const { data } = node.getContext('2d')!.getImageData(point.x, point.y, 1, 1)
    return `#${[data[0], data[1], data[2]].map((v) => v!.toString(16).padStart(2, '0')).join('')}`
  }, { x, y })
}

async function clickTile(page: Page, tileX: number, tileY: number) {
  const view = await status(page)
  await page.getByTestId('office-canvas').click({
    position: {
      x: view.offsetX + (tileX * TILE + TILE / 2) * view.scale,
      y: view.offsetY + (tileY * TILE + TILE / 2) * view.scale,
    },
  })
}

test.describe('scène', () => {
  let errors: string[]

  test.beforeEach(async ({ page }) => {
    errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await expect(page.getByTestId('office-status')).toHaveAttribute('data-scale', /\d+/)
  })

  test.afterEach(() => {
    expect(errors).toEqual([])
  })

  test('annonce clairement une simulation', async ({ page }) => {
    await expect(page.getByRole('status')).toContainText('données simulées')
    await expect(page.getByRole('option', { name: 'Travail (simulé)' }).first()).toBeAttached()
    await expect(page.getByText('Apparence seulement')).toBeVisible()
  })

  test('le clavier déplace le personnage et change son animation', async ({ page }) => {
    const start = await status(page)
    expect(start.animation).toBe('idle')
    await page.keyboard.down('ArrowRight')
    await expect.poll(async () => (await status(page)).animation).toBe('walk')
    await page.waitForTimeout(300)
    await page.keyboard.up('ArrowRight')
    const end = await status(page)
    expect(end.x).toBeGreaterThan(start.x)
    expect(end.y).toBe(start.y)
    await expect.poll(async () => (await status(page)).animation).toBe('idle')
  })

  test('un mur arrête le personnage', async ({ page }) => {
    await page.keyboard.down('ArrowUp')
    await page.waitForTimeout(2000)
    await page.keyboard.up('ArrowUp')
    expect((await status(page)).text).toContain('Tuile 9,2')
  })

  test('un meuble arrête le personnage', async ({ page }) => {
    await clickTile(page, 9, 7)
    await expect.poll(async () => (await status(page)).text, { timeout: 5000 }).toContain('Tuile 9,7')
    await page.keyboard.down('ArrowLeft')
    await page.waitForTimeout(600)
    await page.keyboard.up('ArrowLeft')
    expect((await status(page)).text).toContain('Tuile 9,7')
  })

  test('le clic mène à une case, ou signale qu\'elle est inaccessible', async ({ page }) => {
    await clickTile(page, 3, 3)
    await expect(page.getByTestId('office-status')).toContainText('Case inaccessible')
    await clickTile(page, 12, 11)
    await expect(page.getByTestId('office-status')).not.toContainText('Case inaccessible')
    await expect.poll(async () => (await status(page)).text, { timeout: 8000 }).toContain('Tuile 12,11')
  })

  test('le zoom reste entier et le rendu reste net', async ({ page }) => {
    const start = await status(page)
    await page.keyboard.press('+')
    await expect.poll(async () => (await status(page)).scale).toBe(start.scale + 1)
    await page.keyboard.press('0')
    await expect.poll(async () => (await status(page)).scale).toBe(start.scale)
    const css = await page.getByTestId('office-canvas').evaluate((node) => getComputedStyle(node).imageRendering)
    expect(css).toBe('pixelated')
  })

  test('le canvas suit le redimensionnement de la fenêtre', async ({ page }) => {
    const before = await page.getByTestId('office-canvas').evaluate((node: HTMLCanvasElement) => node.width)
    await page.setViewportSize({ width: 900, height: 500 })
    await expect.poll(async () => page.getByTestId('office-canvas').evaluate((node: HTMLCanvasElement) => node.width)).toBeLessThan(before)
    const { scale } = await status(page)
    expect(Number.isInteger(scale)).toBe(true)
    expect(scale).toBeGreaterThanOrEqual(1)
  })

  test('affiche les vraies couleurs du décor, sans lissage', async ({ page }) => {
    // Écran du premier bureau : 16 px à gauche, atlas prop.desk, y de base 64 moins 28.
    await expect.poll(() => worldPixel(page, 48 + 15, 36 + 6)).toBe('#7fd1e0')
    // Tuile de moquette et de mur.
    await expect.poll(() => worldPixel(page, 17 * TILE + 6, 8 * TILE + 5)).toBe('#5d7f8c')
    await expect.poll(() => worldPixel(page, 0, 0)).toBe('#4b5169')
  })

  test('la profondeur dépend de la position : derrière le meuble, puis devant', async ({ page }) => {
    // L'imprimante occupe la tuile 1,6 : son papier blanc monte jusqu'en y=93.
    await clickTile(page, 1, 5)
    await expect.poll(async () => (await status(page)).text, { timeout: 8000 }).toContain('Tuile 1,5')
    await page.keyboard.down('ArrowDown')
    await page.waitForTimeout(400)
    await page.keyboard.up('ArrowDown')
    // Les pieds, à y=93, passent derrière l'imprimante.
    expect(Math.round((await status(page)).y)).toBe(94)
    await expect.poll(() => worldPixel(page, 24, 93)).toBe('#f4f4f6')

    await clickTile(page, 1, 7)
    await expect.poll(async () => (await status(page)).text, { timeout: 8000 }).toContain('Tuile 1,7')
    // Le buste couvre maintenant la face avant de l'imprimante.
    await expect.poll(() => worldPixel(page, 24, 108)).not.toBe('#9fa4b0')
  })

  test('un état inconnu reste figé, et le travail anime le personnage', async ({ page }) => {
    const select = page.getByLabel('DEVOPS')
    await select.selectOption('unknown')
    const view = await status(page)
    // DEVOPS se tient en x=64, y=136 ; sa cellule fait 24x32, avec l'ancrage en 12,30.
    const region = {
      x: view.offsetX + (64 - 12) * view.scale,
      y: view.offsetY + (136 - 30) * view.scale,
      w: 24 * view.scale,
      h: 32 * view.scale,
    }
    const read = () => page.getByTestId('office-canvas').evaluate((node: HTMLCanvasElement, box) => {
      const { data } = node.getContext('2d')!.getImageData(box.x, box.y, box.w, box.h)
      return Array.from(data).join()
    }, region)

    const first = await read()
    await page.waitForTimeout(1200)
    expect(await read()).toBe(first)

    await select.selectOption('work')
    const seen = new Set<string>()
    for (let i = 0; i < 8; i++) {
      seen.add(await read())
      await page.waitForTimeout(90)
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})

test('signale clairement un échec de chargement', async ({ page }) => {
  await page.route('**/assets/environment/props.png', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Impossible de charger les graphismes')
})

test('n\'appelle aucun service hors de l\'application', async ({ page, baseURL }) => {
  const calls: string[] = []
  page.on('request', (call) => calls.push(call.url()))
  await page.goto('/')
  await expect(page.getByTestId('office-status')).toHaveAttribute('data-scale', /\d+/)
  expect(calls.length).toBeGreaterThan(0)
  expect(calls.filter((url) => !url.startsWith(baseURL!) && !url.startsWith('data:'))).toEqual([])
})
