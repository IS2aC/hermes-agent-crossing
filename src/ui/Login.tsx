import { useState, type FormEvent } from 'react'
import { api } from './api'

export function Login({ onSuccess }: { onSuccess(): void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api('/auth/login', { method: 'POST', body: { password } })
      onSuccess()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connexion impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <form onSubmit={(event) => void submit(event)}>
        <h1>Hermes-Agent-Crossing</h1>
        <label htmlFor="password">Mot de passe</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </main>
  )
}
