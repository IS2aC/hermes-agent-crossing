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

test.describe('reprise d\'un run en cours', () => {
  test('une demande d\'autorisation survit au rechargement de la page et au changement d\'onglet', async ({ page }) => {
    await openChatWith(page, 'demo-jarvis')
    await page.getByLabel('Message').fill('danger')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByTestId('approval')).toBeVisible()

    await page.getByRole('button', { name: 'Registre' }).click()
    await expect(page.getByTestId('approval')).toBeHidden()
    await page.getByRole('button', { name: 'Chat' }).click()
    await expect(page.getByTestId('approval')).toBeVisible()

    await page.reload()
    await page.getByTestId('character-jarvis').getByRole('button', { name: 'JARVIS' }).click()
    await page.getByRole('button', { name: 'Chat' }).click()
    const approval = page.getByTestId('approval')
    await expect(approval).toContainText('commande simulée')
    await approval.getByRole('button', { name: 'Refuser' }).click()
    await expect(page.getByTestId('chat')).toContainText('Réponse simulée à : danger')
    await expect(approval).toHaveCount(0)
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

test.describe('tâches et activité', () => {
  test('sépare les tâches locales et l\'activité, avec leur source', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Tâches' }).click()
    const tasks = page.getByTestId('tasks')
    await expect(tasks).toContainText('son état ne vient pas de Hermes')
    await page.getByLabel('Nouvelle tâche').fill('Relire le rapport')
    await page.getByRole('button', { name: 'Ajouter' }).click()
    const task = page.getByTestId('task').filter({ hasText: 'Relire le rapport' })
    await expect(task).toContainText('Application')
    await task.getByLabel('État').selectOption('done')
    await expect(task.getByLabel('État')).toHaveValue('done')
    await task.getByRole('button', { name: 'Relire le rapport' }).click()
    await expect(page.getByTestId('task-details')).toContainText('Tâche terminée : Relire le rapport')

    await page.getByRole('button', { name: 'Activité' }).click()
    const activity = page.getByTestId('activity')
    await expect(activity).toContainText('Tâche créée : Relire le rapport')
    await activity.getByLabel('Source').selectOption('simulation')
    await expect(activity).not.toContainText('Tâche créée : Relire le rapport')
    await activity.getByLabel('Source').selectOption('application')
    await expect(activity).toContainText('Tâche créée : Relire le rapport')
  })

  test('affiche une conversation dans le journal en direct, sans copier la réponse', async ({ page }) => {
    await openChatWith(page, 'demo-jarvis')
    await page.getByLabel('Message').fill('journal')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByTestId('chat')).toContainText('Réponse simulée à : journal')
    await page.getByRole('button', { name: 'Activité' }).click()
    const activity = page.getByTestId('activity')
    await expect(activity).toContainText('Outil lancé : outil_simulé')
    await expect(activity).toContainText('Run terminé')
    await expect(activity).toContainText('Simulation')
    await expect(activity).not.toContainText('Réponse simulée')
  })
})

test.describe('états visuels', () => {
  test.describe.configure({ mode: 'serial' })

  const debugState = (page: Page, id: string) => page.getByTestId(`debug-state-${id}`)

  test('explique chaque animation, et montre un personnage sans agent comme tel', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'États' }).click()
    await expect(debugState(page, 'devops')).toHaveText('unbound')
    await expect(page.getByTestId('debug-devops')).toContainText('Aucun agent associé')
    await expect(page.getByTestId('office-status')).toHaveAttribute('data-cast', /devops:unbound/)
  })

  test('passe par attente puis repos, selon les événements du run', async ({ page }) => {
    await openChatWith(page, 'demo-jarvis')
    await page.getByLabel('Message').fill('danger')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByTestId('approval')).toBeVisible()
    await expect(page.getByTestId('office-status')).toHaveAttribute('data-cast', /jarvis:waiting/)

    await page.getByRole('button', { name: 'États' }).click()
    await expect(debugState(page, 'jarvis')).toHaveText('waiting')
    await expect(page.getByTestId('debug-jarvis')).toContainText('approval.request')
    await expect(page.getByTestId('debug-jarvis')).toContainText('Simulation')

    await page.getByRole('button', { name: 'Chat' }).click()
    await page.getByTestId('approval').getByRole('button', { name: 'Refuser' }).click()
    await expect(page.getByTestId('chat')).toContainText('Réponse simulée à : danger')
    await expect(page.getByTestId('office-status')).toHaveAttribute('data-cast', /jarvis:idle/, { timeout: 8_000 })
  })

  test('affiche un état inconnu dès la perte du serveur', async ({ page }) => {
    await page.goto('/')
    const jarvis = page.getByTestId('character-jarvis')
    await jarvis.getByLabel('Agent associé').selectOption('demo-veilleur')
    await expect(jarvis).toContainText('Connecté')
    await expect(page.getByTestId('office-status')).toHaveAttribute('data-cast', /jarvis:idle/)

    await page.route('**/api/**', (route) => route.abort())
    await expect(page.getByRole('alert')).toContainText('Connexion au serveur perdue', { timeout: 20_000 })
    await expect(page.getByTestId('office-status')).toHaveAttribute('data-cast', /jarvis:unknown/)
    await expect(page.getByTestId('office-status')).toHaveAttribute('data-cast', /devops:unknown/)
    await page.unroute('**/api/**')
    await expect(page.getByRole('alert')).toHaveCount(0, { timeout: 20_000 })
    await jarvis.getByLabel('Agent associé').selectOption('')
  })
})
