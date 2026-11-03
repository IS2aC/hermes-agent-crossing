import { expect, test } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:5198' })

// Parcours complet demandé à l'étape 12, sur le vrai serveur en mode live, face au faux Hermes.
test('connexion, bureau, découverte, association, conversation, événements, états', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('401')) consoleErrors.push(message.text())
  })

  await test.step('connexion', async () => {
    await page.goto('/')
    await page.getByLabel('Mot de passe').fill('mot-de-passe-e2e-solide')
    await page.getByRole('button', { name: 'Se connecter' }).click()
  })

  await test.step('affichage du bureau', async () => {
    await expect(page.getByTestId('office-status')).toHaveAttribute('data-cast', /jarvis:unbound/)
  })

  await test.step('découverte des agents', async () => {
    await expect(page.getByTestId('agent-jarvis')).toContainText('Joignable')
    await expect(page.getByTestId('agent-veilleur')).toContainText('Injoignable')
  })

  const character = page.getByTestId('character-researcher')
  await test.step('association d\'un personnage', async () => {
    await character.getByLabel('Agent associé').selectOption('jarvis')
    await expect(character).toContainText('Connecté')
    await character.getByRole('button', { name: 'RESEARCHER' }).click()
    await expect(page.getByTestId('inspector')).toContainText('0.17.0')
  })

  await test.step('conversation', async () => {
    await page.getByRole('button', { name: 'Chat' }).click()
    await page.getByRole('button', { name: 'Nouvelle session' }).click()
    await page.getByLabel('Message').fill('Parcours complet')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByTestId('chat')).toContainText('Réponse de Hermes')
  })

  await test.step('événements, avec leur source', async () => {
    await page.getByRole('button', { name: 'Activité' }).click()
    const activity = page.getByTestId('activity')
    await expect(activity).toContainText('Outil lancé : bash')
    await expect(activity).toContainText('Run terminé')
    await expect(activity).toContainText('Hermes')
    await expect(activity).not.toContainText('Réponse de Hermes')
  })

  await test.step('états visuels, expliqués', async () => {
    await page.getByRole('button', { name: 'États' }).click()
    await expect(page.getByTestId('debug-researcher')).toContainText('active_agents = 0')
    await expect(page.getByTestId('debug-state-researcher')).toHaveText('idle')
    await expect(page.getByTestId('debug-state-devops')).toHaveText('unbound')
  })

  await test.step('remise à zéro', async () => {
    await page.getByRole('button', { name: 'Registre' }).click()
    await character.getByLabel('Agent associé').selectOption('')
    await expect(character).toContainText('Aucun agent associé')
  })

  expect(consoleErrors).toEqual([])
})

test('le navigateur ne parle qu\'à l\'application', async ({ page, baseURL }) => {
  const external: string[] = []
  page.on('request', (request) => {
    if (!request.url().startsWith(baseURL!) && !request.url().startsWith('data:')) external.push(request.url())
  })
  await page.goto('/')
  await page.getByLabel('Mot de passe').fill('mot-de-passe-e2e-solide')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByTestId('agent-jarvis')).toBeVisible()
  expect(external).toEqual([])
})
