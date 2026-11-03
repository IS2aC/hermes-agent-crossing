import { expect, test, type Page } from '@playwright/test'

async function openChatWith(page: Page, agentId: string) {
  await page.goto('/')
  const jarvis = page.getByTestId('character-jarvis')
  await jarvis.getByLabel('Agent associé').selectOption(agentId)
  await expect(jarvis).toContainText('Connecté')
  await jarvis.getByRole('button', { name: 'JARVIS' }).click()
  await page.getByRole('button', { name: 'Chat' }).click()
  await page.getByRole('button', { name: 'Nouvelle session' }).click()
  await expect(page.getByLabel('Message')).toBeVisible()
}

test.describe('chat simulé', () => {
  test.describe.configure({ mode: 'serial' })

  test('affiche la réponse en continu, l\'agent et la session', async ({ page }) => {
    await openChatWith(page, 'demo-jarvis')
    const chat = page.getByTestId('chat')
    await expect(chat).toContainText('Agent : demo-jarvis')
    await expect(chat).toContainText('Simulation')
    await expect(chat).toContainText('Session : demo-session')
    await page.getByLabel('Message').fill('Bonjour')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(chat).toContainText('Réponse simulée à : Bonjour')
    await expect(page.getByLabel('Message')).toBeEnabled()
  })

  test('affiche un échec, jamais un faux succès', async ({ page }) => {
    await openChatWith(page, 'demo-jarvis')
    await page.getByLabel('Message').fill('provoque une erreur')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByTestId('turn')).toHaveAttribute('data-status', 'failed')
    await expect(page.getByRole('alert')).toContainText('Échec simulé')
    await expect(page.getByTestId('chat')).not.toContainText('Réponse simulée')
  })

  test('demande une autorisation avant de continuer', async ({ page }) => {
    await openChatWith(page, 'demo-jarvis')
    await page.getByLabel('Message').fill('danger')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    const approval = page.getByTestId('approval')
    await expect(approval).toContainText('commande simulée')
    await expect(approval.getByRole('button')).toHaveText(['Refuser', 'Autoriser une fois'])
    await approval.getByRole('button', { name: 'Refuser' }).click()
    await expect(approval).toHaveCount(0)
  })

  test('permet d\'arrêter une réponse en attente d\'autorisation', async ({ page }) => {
    await openChatWith(page, 'demo-jarvis')
    await page.getByLabel('Message').fill('danger')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByTestId('approval')).toBeVisible()
    await page.getByRole('button', { name: 'Arrêter' }).click()
    await expect(page.getByTestId('turn')).toHaveAttribute('data-status', 'cancelled')
    await expect(page.getByTestId('turn')).toContainText('Arrêté')
  })

  test('refuse de parler à un personnage sans agent', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('character-devops').getByRole('button', { name: 'DEVOPS' }).click()
    await page.getByRole('button', { name: 'Chat' }).click()
    await expect(page.getByText('Conversation impossible avec DEVOPS')).toBeVisible()
  })
})

test.describe('chat en mode live, face au faux Hermes', () => {
  test.use({ baseURL: 'http://127.0.0.1:5198' })
  test.describe.configure({ mode: 'serial' })

  async function openLive(page: Page) {
    await page.goto('/')
    await page.getByLabel('Mot de passe').fill('mot-de-passe-e2e-solide')
    await page.getByRole('button', { name: 'Se connecter' }).click()
  }

  test('affiche Telegram en lecture seule, et converse dans une session créée ici', async ({ page }) => {
    await openLive(page)
    const jarvis = page.getByTestId('character-jarvis')
    await jarvis.getByLabel('Agent associé').selectOption('jarvis')
    await expect(jarvis).toContainText('Connecté')
    await jarvis.getByRole('button', { name: 'JARVIS' }).click()
    await page.getByRole('button', { name: 'Chat' }).click()

    const chat = page.getByTestId('chat')
    await chat.getByLabel('Session').selectOption('tg_1')
    await expect(chat).toContainText('Bonjour depuis Telegram')
    await expect(page.getByTestId('read-only')).toBeVisible()
    await expect(page.getByLabel('Message')).toHaveCount(0)

    await page.getByRole('button', { name: 'Nouvelle session' }).click()
    await expect(chat).toContainText('Source : api_server')
    await expect(chat).not.toContainText('Simulation')
    await page.getByLabel('Message').fill('Bonjour Hermes')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(chat).toContainText('Réponse de Hermes')
    await expect(chat).toContainText('bash')
    await expect(page.getByTestId('turn')).toHaveAttribute('data-status', 'completed')

    // Remet le lien à zéro pour les autres tests, qui partagent ce serveur.
    await page.getByRole('button', { name: 'Registre' }).click()
    await jarvis.getByLabel('Agent associé').selectOption('')
    await expect(jarvis).toContainText('Aucun agent associé')
  })
})
