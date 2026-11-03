import { test } from '@playwright/test'

// Capture de contrôle visuel, à la demande : PREVIEW_PATH=chemin.png npx playwright test preview
const target = process.env.PREVIEW_PATH

test('capture de la scène', async ({ page }) => {
  test.skip(!target, 'Capture à la demande uniquement')
  await page.goto(process.env.PREVIEW_URL ?? '/')
  await page.getByTestId('office-status').waitFor()
  await page.getByTestId('character-jarvis').getByLabel('Agent associé').selectOption('demo-jarvis')
  await page.getByTestId('character-veilleur').getByLabel('Agent associé').selectOption('demo-veilleur')
  await page.getByTestId('character-devops').getByLabel('Agent associé').selectOption('demo-hors-ligne')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: target })
})
