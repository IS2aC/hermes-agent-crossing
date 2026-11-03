// Pile complète pour les tests E2E : le vrai serveur, en mode live, face au faux Hermes.
import { startFakeHermes } from '../../tests/fixtures/fakeHermes'
import { hashPassword } from '../../server/http/auth'

const hermes = await startFakeHermes({ model: 'jarvis' })
hermes.sessions.push({
  id: 'tg_1',
  source: 'telegram',
  title: 'Conversation Telegram',
  started_at: Date.now() / 1000 - 60,
  last_active: Date.now() / 1000 - 30,
  message_count: 2,
  tool_call_count: 0,
})
hermes.messages.set('tg_1', [
  { id: 1, role: 'user', content: 'Bonjour depuis Telegram', timestamp: Date.now() / 1000 - 60 },
  { id: 2, role: 'assistant', content: 'Bonjour !', timestamp: Date.now() / 1000 - 30 },
])
hermes.nextRunEvents = [
  { event: 'reasoning.available', text: 'contenu privé' },
  { event: 'tool.started', tool: 'bash', preview: 'ls' },
  { event: 'tool.completed', tool: 'bash', duration: 0.1, error: false },
  { event: 'message.delta', delta: 'Réponse ' },
  { event: 'message.delta', delta: 'de Hermes' },
  { event: 'run.completed', output: 'Réponse de Hermes', usage: {} },
]

Object.assign(process.env, {
  HERMES_MODE: 'live',
  HERMES_PROFILES: JSON.stringify([
    { id: 'jarvis', name: 'JARVIS', baseUrl: hermes.url, keyEnv: 'E2E_KEY_JARVIS' },
    { id: 'veilleur', name: 'VEILLEUR', baseUrl: 'http://127.0.0.1:9', keyEnv: 'E2E_KEY_VEILLEUR' },
  ]),
  E2E_KEY_JARVIS: hermes.key,
  E2E_KEY_VEILLEUR: 'cle-sans-serveur',
  OPERATOR_PASSWORD_HASH: hashPassword('mot-de-passe-e2e-solide'),
  PORT: '5198',
  HOST: '127.0.0.1',
})

await import('../../server/index')
