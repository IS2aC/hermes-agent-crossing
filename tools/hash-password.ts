// Calcule OPERATOR_PASSWORD_HASH. Le mot de passe est lu sur l'entrée standard, pour rester hors de l'historique du shell.
import { hashPassword } from '../server/http/auth'

const chunks: Buffer[] = []
for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '')
if (password.length < 12) {
  console.error('Le mot de passe doit contenir au moins 12 caractères.')
  process.exit(2)
}
console.log(hashPassword(password))
