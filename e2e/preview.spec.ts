import { test } from '@playwright/test'

// Capture de contrôle visuel, à la demande : PREVIEW_PATH=chemin.png npx playwright test preview
const target = process.env.PREVIEW_PATH

test('capture de la scène', async ({ page }) => {
  test.skip(!target, 'Capture à la demande uniquement')
  await page.goto('/')
  await page.getByTestId('office-status').waitFor()
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(900)
  await page.keyboard.up('ArrowRight')
  await page.keyboard.down('ArrowDown')
  await page.waitForTimeout(500)
  await page.keyboard.up('ArrowDown')
  await page.waitForTimeout(100)
  await page.screenshot({ path: target })
})
