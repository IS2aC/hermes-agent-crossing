import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { applyHold, decideVisual, emptyTrack, trackRunEvent, type AgentRunTrack, type HeldState, type VisualDecision } from './characters/visualState'
import type { RegistryView } from './domain/registry'
import { OfficeCanvas, type CastEntry } from './scene/OfficeCanvas'
import { SourceOfficeCanvas } from './scene/SourceOfficeCanvas'
import { mergeEvents, type ActivityEvent } from './domain/activity'
import { ActivityPanel } from './ui/ActivityPanel'
import { AgentInspector } from './ui/AgentInspector'
import { DebugPanel } from './ui/DebugPanel'
import { ChatPanel } from './ui/ChatPanel'
import { api, ApiError } from './ui/api'
import { Login } from './ui/Login'
import { RegistryPanel } from './ui/RegistryPanel'
import { TasksPanel } from './ui/TasksPanel'

type Tab = 'registry' | 'inspector' | 'chat' | 'tasks' | 'activity' | 'debug'

const DECISION_TICK_MS = 500

const REFRESH_MS = 5_000

/** Le bureau utilise la salle et les sprites de Claude-Office ; /?skin=pixel affiche l'ancien bureau en vue de dessus. */
const SOURCE_SKIN = new URLSearchParams(window.location.search).get('skin') !== 'pixel'

export function App() {
  const [auth, setAuth] = useState<{ authenticated: boolean; authRequired: boolean } | null>(null)

  const refreshSession = useCallback(() => {
    api<{ authenticated: boolean; authRequired: boolean }>('/auth/session').then(setAuth, () => {
      setAuth({ authenticated: false, authRequired: true })
    })
  }, [])

  useEffect(refreshSession, [refreshSession])

  if (!auth) return <p className="muted centered">Chargement…</p>
  if (!auth.authenticated) return <Login onSuccess={refreshSession} />
  return <Office canLogout={auth.authRequired} onSignedOut={refreshSession} />
}

function Office({ canLogout, onSignedOut }: { canLogout: boolean; onSignedOut(): void }) {
  const [registry, setRegistry] = useState<RegistryView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('registry')
  const [selected, setSelected] = useState<string | null>(null)
  const [events, setEvents] = useState<ActivityEvent[]>([])

  const lastRefresh = useRef(0)

  const refresh = useCallback(async () => {
    // Une réponse lente ne doit pas écraser une réponse plus récente.
    const request = ++lastRefresh.current
    try {
      const view = await api<RegistryView>('/registry')
      if (request !== lastRefresh.current) return
      setRegistry(view)
      setError(null)
    } catch (caught) {
      if (request !== lastRefresh.current) return
      if (caught instanceof ApiError && caught.status === 401) {
        onSignedOut()
        return
      }
      setError(caught instanceof Error ? caught.message : 'Serveur injoignable')
    }
  }, [onSignedOut])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const [tracks, setTracks] = useState<ReadonlyMap<string, AgentRunTrack>>(new Map())
  const [streamUp, setStreamUp] = useState(true)
  const [decisions, setDecisions] = useState<ReadonlyMap<string, VisualDecision>>(new Map())
  const held = useRef(new Map<string, HeldState>())
  const seenEvents = useRef(new Set<string>())

  const addEvents = useCallback((incoming: ActivityEvent[]) => {
    setEvents((current) => mergeEvents(current, incoming))
    // Du plus ancien au plus récent : un événement rejoué après reconnexion n'est appliqué qu'une fois.
    const fresh = incoming.filter((event) => !seenEvents.current.has(event.id)).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    for (const event of fresh) seenEvents.current.add(event.id)
    setTracks((current) => {
      const next = new Map(current)
      for (const event of fresh) {
        if (event.agentId) next.set(event.agentId, trackRunEvent(next.get(event.agentId) ?? emptyTrack(), event))
      }
      return next
    })
  }, [])

  // À chaque (re)connexion, la dernière page rattrape ce que le flux a pu manquer, sans doublon.
  useEffect(() => {
    const source = new EventSource('/api/events/stream')
    source.onerror = () => setStreamUp(false)
    source.onopen = () => {
      setStreamUp(true)
      api<ActivityEvent[]>('/events?limit=50').then(addEvents, () => undefined)
    }
    source.onmessage = (message) => addEvents([JSON.parse(message.data as string) as ActivityEvent])
    return () => source.close()
  }, [addEvents])

  const connected = streamUp && error === null

  useEffect(() => {
    const decide = () => {
      if (!registry) return
      const agents = registry.agents.status === 'available' ? registry.agents.value : []
      const now = Date.now()
      const next = new Map<string, VisualDecision>()
      for (const entry of registry.characters) {
        if (!entry.profile.placement) continue
        const agent = agents.find((candidate) => candidate.definition.id === entry.agentId)
        const decision = decideVisual({
          connected,
          link: entry.link,
          runtime: agent?.runtime ?? null,
          track: (entry.agentId && tracks.get(entry.agentId)) || emptyTrack(),
          now,
        })
        const state = applyHold(held.current.get(entry.profile.id) ?? null, decision, now)
        held.current.set(entry.profile.id, state)
        next.set(entry.profile.id, state.decision)
      }
      setDecisions(next)
    }
    decide()
    const timer = setInterval(decide, DECISION_TICK_MS)
    return () => clearInterval(timer)
  }, [registry, tracks, connected])

  const cast = useMemo(() => {
    const entries: CastEntry[] = []
    for (const entry of registry?.characters ?? []) {
      if (!entry.profile.placement) continue
      entries.push({
        id: entry.profile.id,
        spriteId: entry.profile.spriteId,
        tile: { x: entry.profile.placement.tileX, y: entry.profile.placement.tileY },
        state: decisions.get(entry.profile.id)?.state ?? 'unknown',
      })
    }
    return entries
  }, [registry, decisions])

  const select = useCallback((id: string) => {
    setSelected(id)
    setTab('inspector')
  }, [])

  return (
    <main className="app">
      {registry?.mode === 'mock' && (
        <p className="simulation-banner" role="status">
          Démonstration : données simulées. Aucun agent Hermes n'est connecté.
        </p>
      )}
      {!connected && (
        <p className="connection-banner" role="alert">
          Connexion au serveur perdue{error ? ` : ${error}` : ''}. Les personnages affichent un état inconnu.
        </p>
      )}
      <div className="workspace">
        {SOURCE_SKIN
          ? <SourceOfficeCanvas cast={cast} selectedId={selected} onSelect={select} />
          : <OfficeCanvas cast={cast} selectedId={selected} onSelect={select} />}
        <aside className="side-panel">
          <nav className="tabs" aria-label="Panneaux">
            <button type="button" aria-pressed={tab === 'registry'} onClick={() => setTab('registry')}>Registre</button>
            <button type="button" aria-pressed={tab === 'inspector'} onClick={() => setTab('inspector')}>Fiche</button>
            <button type="button" aria-pressed={tab === 'chat'} onClick={() => setTab('chat')}>Chat</button>
            <button type="button" aria-pressed={tab === 'tasks'} onClick={() => setTab('tasks')}>Tâches</button>
            <button type="button" aria-pressed={tab === 'activity'} onClick={() => setTab('activity')}>Activité</button>
            <button type="button" aria-pressed={tab === 'debug'} onClick={() => setTab('debug')}>États</button>
            {canLogout && (
              <button
                type="button"
                className="logout"
                onClick={() => void api('/auth/logout', { method: 'POST' }).finally(onSignedOut)}
              >
                Déconnexion
              </button>
            )}
          </nav>
          {!registry && !error && <p className="muted">Chargement…</p>}
          {registry && tab === 'registry' && <RegistryPanel registry={registry} onChanged={() => void refresh()} onSelect={select} />}
          {registry && tab === 'inspector' && <AgentInspector registry={registry} characterId={selected} />}
          {/* Reste monté : changer d'onglet ne coupe ni le suivi d'une réponse, ni une demande d'autorisation. */}
          {registry && <div hidden={tab !== 'chat'}><ChatPanel registry={registry} characterId={selected} /></div>}
          {registry && tab === 'tasks' && <TasksPanel registry={registry} />}
          {registry && tab === 'activity' && <ActivityPanel registry={registry} events={events} onLoaded={addEvents} />}
          {registry && tab === 'debug' && <DebugPanel registry={registry} decisions={decisions} />}
        </aside>
      </div>
      <p className="help">
        {SOURCE_SKIN
          ? 'Flèches : se déplacer · Clic : aller à un endroit ou ouvrir une fiche'
          : 'Flèches : se déplacer · Clic : aller à une case ou ouvrir une fiche · + et − : zoom · 0 : ajuster'}
      </p>
    </main>
  )
}
