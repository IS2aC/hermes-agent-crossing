import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { applyRunEvent, createTurn, isTerminal, type SequencedRunEvent, type SessionView, type TurnState } from '../domain/chat'
import type { SessionMessage } from '../domain/platform'
import type { RegistryView } from '../domain/registry'
import { api } from './api'
import { LINK_LABELS } from './labels'

interface ChatPanelProps {
  registry: RegistryView
  characterId: string | null
}

const ROLE_LABELS: Record<string, string> = { user: 'Toi', assistant: 'Agent', tool: 'Outil', system: 'Système' }

export function ChatPanel({ registry, characterId }: ChatPanelProps) {
  const entry = registry.characters.find((candidate) => candidate.profile.id === characterId)
  if (!entry) return <p className="muted">Choisis un personnage pour lui parler.</p>
  if (!entry.agentId || entry.link !== 'connected') {
    return <p className="muted">Conversation impossible avec {entry.profile.displayName} : {LINK_LABELS[entry.link]}.</p>
  }
  return <Conversation key={entry.agentId} agentId={entry.agentId} name={entry.profile.displayName} simulated={registry.mode === 'mock'} />
}

function Conversation({ agentId, name, simulated }: { agentId: string; name: string; simulated: boolean }) {
  const base = `/agents/${encodeURIComponent(agentId)}`
  const [sessions, setSessions] = useState<SessionView[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [turn, setTurn] = useState<TurnState | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [sending, setSending] = useState(false)
  const sourceRef = useRef<EventSource | null>(null)
  const resumeRef = useRef<{ runId: string; sessionId: string } | null>(null)

  const session = sessions.find((candidate) => candidate.id === sessionId) ?? null
  const running = turn !== null && !isTerminal(turn.status)

  const loadSessions = useCallback(async () => {
    try {
      const list = await api<SessionView[]>(`${base}/sessions`)
      setSessions(list)
      return list
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sessions indisponibles')
      return []
    }
  }, [base])

  const loadMessages = useCallback(async (id: string) => {
    try {
      setMessages(await api<SessionMessage[]>(`${base}/sessions/${encodeURIComponent(id)}/messages`))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Messages indisponibles')
    }
  }, [base])

  // Un run peut attendre une décision : on le reprend après un rechargement ou un changement de personnage.
  useEffect(() => {
    void loadSessions().then(() => api<{ runId: string; sessionId: string } | null>(`${base}/runs/active`)).then((active) => {
      if (!active) return
      resumeRef.current = active
      setSessionId(active.sessionId)
    }, () => undefined)
    return () => sourceRef.current?.close()
  }, [base, loadSessions])

  useEffect(() => {
    setError(null)
    if (sessionId) void loadMessages(sessionId)
    else setMessages([])
    if (resumeRef.current && resumeRef.current.sessionId === sessionId) {
      follow(resumeRef.current.runId, resumeRef.current.sessionId)
      resumeRef.current = null
    } else {
      setTurn(null)
    }
    // `follow` ne dépend que de valeurs stables pour cet agent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, loadMessages])

  /** Relit l'historique sans rien faire disparaître : ce que Hermes n'a pas encore enregistré reste affiché. */
  const reconcile = async (id: string) => {
    try {
      const stored = await api<SessionMessage[]>(`${base}/sessions/${encodeURIComponent(id)}/messages`)
      const has = (role: string, content: string) => stored.some((message) => message.role === role && message.content === content)
      setMessages((list) => [...stored, ...list.filter((message) => message.id.startsWith('local-') && !has(message.role, message.content))])
      setTurn((latest) => (latest?.status === 'completed' && has('assistant', latest.text) ? null : latest))
    } catch {
      // L'historique reste celui de l'écran : la réponse affichée n'est pas perdue.
    }
  }

  const follow = (runId: string, id: string) => {
    sourceRef.current?.close()
    let current = createTurn(runId)
    setTurn(current)
    const source = new EventSource(`/api${base}/runs/${encodeURIComponent(runId)}/events`)
    sourceRef.current = source
    source.onopen = () => setReconnecting(false)
    source.onmessage = (message) => {
      current = applyRunEvent(current, JSON.parse(message.data as string) as SequencedRunEvent)
      setTurn(current)
      if (isTerminal(current.status)) {
        source.close()
        void reconcile(id)
        void loadSessions()
      }
    }
    // Sans fin annoncée, le navigateur retente seul. S'il renonce, le résultat reste inconnu.
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        if (isTerminal(current.status)) return
        current = { ...current, status: 'unknown', error: 'Suivi perdu : le résultat de ce message est inconnu.' }
        setTurn(current)
        setReconnecting(false)
      } else if (!isTerminal(current.status)) {
        setReconnecting(true)
      }
    }
  }

  const newSession = async () => {
    setError(null)
    try {
      const created = await api<SessionView>(`${base}/sessions`, { method: 'POST', body: { title: `Bureau ${new Date().toLocaleString('fr-FR')}` } })
      setSessions((list) => [created, ...list])
      setSessionId(created.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Création impossible')
    }
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!sessionId || !draft.trim() || running) return
    setError(null)
    setSending(true)
    try {
      const { runId } = await api<{ runId: string }>(`${base}/sessions/${encodeURIComponent(sessionId)}/runs`, { method: 'POST', body: { input: draft } })
      const sent = draft
      setDraft('')
      setMessages((list) => [...list, { id: `local-${runId}`, role: 'user', content: sent, toolName: null, at: new Date().toISOString() }])
      follow(runId, sessionId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  const act = async (path: string, body: unknown) => {
    if (!turn) return
    setError(null)
    try {
      await api(`${base}/runs/${encodeURIComponent(turn.runId)}/${path}`, { method: 'POST', body })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action impossible')
    }
  }

  return (
    <section aria-label="Conversation" data-testid="chat">
      <h2>Conversation : {name}</h2>
      <p className="muted">
        Agent : {agentId}
        {session ? ` · Session : ${session.id} · Source : ${session.source}` : ''}
        {simulated ? ' · Simulation' : ''}
      </p>
      <div className="chat-sessions">
        <label>
          Session
          <select value={sessionId ?? ''} onChange={(event) => setSessionId(event.target.value || null)} disabled={running}>
            <option value="">Choisir…</option>
            {sessions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title ?? candidate.id} ({candidate.source}{candidate.writable ? '' : ', lecture seule'})
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="action" onClick={() => void newSession()} disabled={running}>Nouvelle session</button>
      </div>

      <ol className="chat-log" aria-live="polite">
        {messages.filter((message) => message.content).map((message) => (
          <li key={message.id} className={`message message-${message.role}`}>
            <strong>{ROLE_LABELS[message.role] ?? message.role}</strong>
            <span>{message.content}</span>
          </li>
        ))}
        {turn && (
          <li className="message message-assistant" data-testid="turn" data-status={turn.status}>
            <strong>Agent</strong>
            {turn.tools.map((tool, index) => (
              <span key={`${tool.name}-${index}`} className="muted">
                {tool.state === 'running' ? 'En cours' : tool.state === 'failed' ? 'Échec' : 'Terminé'} : {tool.name}
              </span>
            ))}
            {turn.text && <span>{turn.text}</span>}
            {running && !turn.text && !turn.approval && <span className="muted">En attente de la réponse…</span>}
            {turn.status === 'cancelled' && <span className="muted">Arrêté.</span>}
            {turn.error && <span className="form-error" role="alert">{turn.error}</span>}
          </li>
        )}
      </ol>

      {reconnecting && <p className="muted" role="status">Connexion coupée, reprise en cours…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {turn?.approval && (
        <div className="approval" role="alertdialog" aria-label="Autorisation demandée" data-testid="approval">
          <strong>L'agent demande une autorisation</strong>
          {turn.approval.description && <p>{turn.approval.description}</p>}
          {turn.approval.command && <pre>{turn.approval.command}</pre>}
          <div className="approval-actions">
            <button type="button" className="action" onClick={() => void act('approval', { choice: 'deny' })}>Refuser</button>
            <button type="button" className="action danger" onClick={() => void act('approval', { choice: 'once' })}>Autoriser une fois</button>
          </div>
        </div>
      )}

      {session && !session.writable && (
        <p className="muted" data-testid="read-only">Session {session.source} en lecture seule. Ouvre une nouvelle session pour écrire à l'agent.</p>
      )}
      {session?.writable && (
        <form className="chat-form" onSubmit={(event) => void send(event)}>
          <label htmlFor="chat-input">Message</label>
          <textarea id="chat-input" rows={3} maxLength={20000} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={running || sending} />
          <p className="muted">L'agent peut exécuter de vraies actions sur le serveur.</p>
          <div className="approval-actions">
            {running && <button type="button" className="action" onClick={() => void act('stop', {})}>Arrêter</button>}
            <button type="submit" className="action" disabled={running || sending || !draft.trim()}>Envoyer</button>
          </div>
        </form>
      )}
    </section>
  )
}
