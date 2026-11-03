import { expect, test } from '@playwright/test'

test.describe('bureau Claude-Office', () => {
  test('la salle et les sprites se chargent', async ({ page }) => {
    const failures: string[] = []
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(response.url())
    })
    await page.goto('/')
    await expect(page.getByTestId('office-status')).toContainText('Case')
    expect(failures).toEqual([])
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('les flèches déplacent le visiteur et les murs le bloquent', async ({ page }) => {
    await page.goto('/')
    const status = page.getByTestId('office-status')
    await expect(status).toContainText('Case')
    const start = Number(await status.getAttribute('data-x'))
    await page.keyboard.down('ArrowRight')
    await page.waitForTimeout(400)
    await page.keyboard.up('ArrowRight')
    const moved = Number(await status.getAttribute('data-x'))
    expect(moved).toBeGreaterThan(start)

    await page.keyboard.down('ArrowUp')
    await page.keyboard.down('ArrowLeft')
    await page.waitForTimeout(4000)
    await page.keyboard.up('ArrowUp')
    await page.keyboard.up('ArrowLeft')
    const x = Number(await status.getAttribute('data-x'))
    const y = Number(await status.getAttribute('data-y'))
    // Reste sur le plancher au lieu de sortir de la salle.
    expect(x).toBeGreaterThan(0)
    expect(y).toBeGreaterThan(200)
  })

  test('un clic sur un personnage ouvre sa fiche', async ({ page }) => {
    await page.goto('/')
    const status = page.getByTestId('office-status')
    await expect(status).toContainText('Case')
    const canvas = page.getByTestId('office-canvas')
    const scale = Number(await status.getAttribute('data-scale'))
    const offsetX = Number(await status.getAttribute('data-offset-x'))
    const offsetY = Number(await status.getAttribute('data-offset-y'))
    // JARVIS est au poste 1 : x 25,8 %, y 71 % de la salle ; on vise son torse.
    await canvas.click({ position: { x: offsetX + 0.258 * 800 * scale, y: offsetY + (0.71 * 600 - 40) * scale } })
    await expect(page.getByRole('button', { name: 'Fiche' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('/?skin=pixel affiche encore l\'ancien bureau', async ({ page }) => {
    await page.goto('/?skin=pixel')
    await expect(page.getByTestId('office-status')).toContainText('Tuile')
  })
})
