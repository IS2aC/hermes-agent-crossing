import { expect, test, type Page } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:5198' })
test.describe.configure({ mode: 'serial' })

async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel('Mot de passe').fill('mot-de-passe-e2e-solide')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByRole('button', { name: 'Déconnexion' })).toBeVisible()
}

test('demande une connexion et refuse un mauvais mot de passe', async ({ page, request }) => {
  expect((await request.get('/api/registry')).status()).toBe(401)
  await page.goto('/')
  await expect(page.getByTestId('office-canvas')).toHaveCount(0)
  await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByRole('alert')).toContainText('Mot de passe incorrect')
})

test('n\'expose aucune clé au navigateur', async ({ page }) => {
  const bodies: string[] = []
  page.on('response', async (response) => {
    if (response.url().includes('127.0.0.1:5198')) bodies.push(await response.text().catch(() => ''))
  })
  await login(page)
  await expect(page.getByTestId('agent-jarvis')).toBeVisible()
  expect(bodies.join('\n')).not.toContain('cle-de-test-hermes')
  expect(bodies.join('\n')).not.toContain('cle-sans-serveur')
})

test('ne montre pas de bandeau de simulation en mode live', async ({ page }) => {
  await login(page)
  await expect(page.getByTestId('agent-jarvis')).toBeVisible()
  await expect(page.getByText('données simulées')).toHaveCount(0)
})

test('distingue un profil joignable et un profil injoignable', async ({ page }) => {
  await login(page)
  await expect(page.getByTestId('agent-jarvis')).toContainText('Joignable')
  await expect(page.getByTestId('agent-veilleur')).toContainText('Injoignable')
  await expect(page.getByTestId('agent-veilleur')).toContainText('Indisponible')
})

test('associe un personnage et affiche sa fiche, avec la provenance', async ({ page }) => {
  await login(page)
  const jarvis = page.getByTestId('character-jarvis')
  await expect(jarvis).toContainText('Aucun agent associé')
  await jarvis.getByLabel('Agent associé').selectOption('jarvis')
  await expect(jarvis).toContainText('Connecté')

  const veilleur = page.getByTestId('character-veilleur')
  await veilleur.getByLabel('Agent associé').selectOption('veilleur')
  await expect(veilleur).toContainText('Agent injoignable')

  await jarvis.getByRole('button', { name: 'JARVIS' }).click()
  const inspector = page.getByTestId('inspector')
  await expect(inspector).toContainText('0.17.0')
  await expect(inspector).toContainText('Hermes')
  await expect(inspector).toContainText('déduit : active_agents = 0')
  await expect(inspector).toContainText('Description')
  await expect(inspector).toContainText('Indisponible')
})

test('ouvre la fiche en cliquant sur le personnage dans le bureau', async ({ page }) => {
  await login(page)
  const status = page.getByTestId('office-status')
  await expect(status).toHaveAttribute('data-cast', /jarvis:/)
  const scale = Number(await status.getAttribute('data-scale'))
  const offsetX = Number(await status.getAttribute('data-offset-x'))
  const offsetY = Number(await status.getAttribute('data-offset-y'))
  // JARVIS est au poste 1 : x 25,8 %, y 71 % de la salle ; on vise son torse.
  await page.getByTestId('office-canvas').click({ position: { x: offsetX + 0.258 * 800 * scale, y: offsetY + (0.71 * 600 - 40) * scale } })
  await expect(page.getByTestId('inspector')).toContainText('JARVIS')
})

test('la déconnexion referme l\'accès', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Déconnexion' }).click()
  await expect(page.getByLabel('Mot de passe')).toBeVisible()
  expect((await page.request.get('/api/registry')).status()).toBe(401)
})
