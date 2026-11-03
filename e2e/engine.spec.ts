import { expect, test, type Page } from '@playwright/test'

async function status(page: Page) {
  const element = page.getByTestId('office-status')
  return {
    x: Number(await element.getAttribute('data-x')),
    y: Number(await element.getAttribute('data-y')),
    scale: Number(await element.getAttribute('data-scale')),
    text: (await element.textContent()) ?? '',
  }
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByTestId('office-status')).toHaveAttribute('data-scale', /\d+/)
  expect(errors).toEqual([])
})

test('annonce clairement une simulation', async ({ page }) => {
  await expect(page.getByRole('status')).toContainText('données simulées')
})

test('le clavier déplace le personnage', async ({ page }) => {
  const start = await status(page)
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(400)
  await page.keyboard.up('ArrowRight')
  const end = await status(page)
  expect(end.x).toBeGreaterThan(start.x)
  expect(end.y).toBe(start.y)
})

test('un mur arrête le personnage', async ({ page }) => {
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(1000)
  await page.keyboard.up('ArrowUp')
  const end = await status(page)
  expect(end.y).toBeGreaterThanOrEqual(16 + 4)
  expect(end.text).toContain('Tuile 2,1')
})

test('le clic mène à une case, ou signale qu\'elle est inaccessible', async ({ page }) => {
  const canvas = page.getByTestId('office-canvas')
  const box = (await canvas.boundingBox())!
  await canvas.click({ position: { x: 2, y: 2 } })
  await expect(page.getByTestId('office-status')).toContainText('Case inaccessible')

  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 + 100 } })
  await expect(page.getByTestId('office-status')).not.toContainText('Case inaccessible')
  const start = await status(page)
  await expect.poll(async () => (await status(page)).y, { timeout: 8000 }).toBeGreaterThan(start.y)
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
  await page.setViewportSize({ width: 500, height: 500 })
  await expect.poll(async () => page.getByTestId('office-canvas').evaluate((node: HTMLCanvasElement) => node.width)).toBe(500)
  const { scale } = await status(page)
  expect(Number.isInteger(scale)).toBe(true)
  expect(scale).toBeGreaterThanOrEqual(1)
})
