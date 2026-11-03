import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { VisualState } from './characters/animation'
import type { ObservedAgentState } from './domain/agents'
import type { RegistryView } from './domain/registry'
import { OfficeCanvas, type CastEntry } from './scene/OfficeCanvas'
import { mergeEvents, type ActivityEvent } from './domain/activity'
import { ActivityPanel } from './ui/ActivityPanel'
import { AgentInspector } from './ui/AgentInspector'
import { ChatPanel } from './ui/ChatPanel'
import { api, ApiError } from './ui/api'
import { Login } from './ui/Login'
import { RegistryPanel } from './ui/RegistryPanel'
import { TasksPanel } from './ui/TasksPanel'

type Tab = 'registry' | 'inspector' | 'chat' | 'tasks' | 'activity'

const REFRESH_MS = 15_000

const STATE_TO_VISUAL: Record<ObservedAgentState, VisualState> = {
  idle: 'idle',
  working: 'work',
  thinking: 'think',
  waiting: 'unknown',
  error: 'unavailable',
  unavailable: 'unavailable',
  unknown: 'unknown',
}

function castFrom(registry: RegistryView): CastEntry[] {
  const agents = registry.agents.status === 'available' ? registry.agents.value : []
  const cast: CastEntry[] = []
  for (const entry of registry.characters) {
    if (!entry.profile.placement) continue
    let state: VisualState = 'unknown'
    if (entry.link === 'none') state = 'unbound'
    else if (entry.link === 'unreachable' || entry.link === 'missing') state = 'unavailable'
    else {
      const runtime = agents.find((agent) => agent.definition.id === entry.agentId)?.runtime
      if (runtime?.status === 'available') state = STATE_TO_VISUAL[runtime.value.state.value]
    }
    cast.push({ id: entry.profile.id, spriteId: entry.profile.spriteId, tile: { x: entry.profile.placement.tileX, y: entry.profile.placement.tileY }, state })
  }
  return cast
}

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

  const addEvents = useCallback((incoming: ActivityEvent[]) => setEvents((current) => mergeEvents(current, incoming)), [])

  // À chaque (re)connexion, la dernière page rattrape ce que le flux a pu manquer, sans doublon.
  useEffect(() => {
    const source = new EventSource('/api/events/stream')
    source.onopen = () => {
      api<ActivityEvent[]>('/events?limit=50').then(addEvents, () => undefined)
    }
    source.onmessage = (message) => addEvents([JSON.parse(message.data as string) as ActivityEvent])
    return () => source.close()
  }, [addEvents])

  const cast = useMemo(() => (registry ? castFrom(registry) : []), [registry])
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
      {error && <p className="connection-banner" role="alert">Connexion au serveur perdue : {error}. Les états affichés ne sont plus garantis.</p>}
      <div className="workspace">
        <OfficeCanvas cast={error ? cast.map((entry) => ({ ...entry, state: 'unknown' })) : cast} selectedId={selected} onSelect={select} />
        <aside className="side-panel">
          <nav className="tabs" aria-label="Panneaux">
            <button type="button" aria-pressed={tab === 'registry'} onClick={() => setTab('registry')}>Registre</button>
            <button type="button" aria-pressed={tab === 'inspector'} onClick={() => setTab('inspector')}>Fiche</button>
            <button type="button" aria-pressed={tab === 'chat'} onClick={() => setTab('chat')}>Chat</button>
            <button type="button" aria-pressed={tab === 'tasks'} onClick={() => setTab('tasks')}>Tâches</button>
            <button type="button" aria-pressed={tab === 'activity'} onClick={() => setTab('activity')}>Activité</button>
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
          {registry && tab === 'chat' && <ChatPanel registry={registry} characterId={selected} />}
          {registry && tab === 'tasks' && <TasksPanel registry={registry} />}
          {registry && tab === 'activity' && <ActivityPanel registry={registry} events={events} onLoaded={addEvents} />}
        </aside>
      </div>
      <p className="help">Flèches : se déplacer · Clic : aller à une case ou ouvrir une fiche · + et − : zoom · 0 : ajuster</p>
    </main>
  )
}
