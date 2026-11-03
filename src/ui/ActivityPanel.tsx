import { useCallback, useEffect, useState } from 'react'
import type { ActivityEvent } from '../domain/activity'
import { mergeEvents } from '../domain/activity'
import type { Provenance } from '../domain/provenance'
import type { RegistryView } from '../domain/registry'
import { api } from './api'
import { confidenceLabel, formatDate, PROVENANCE_LABELS } from './labels'

const PAGE = 50

interface ActivityPanelProps {
  registry: RegistryView
  events: readonly ActivityEvent[]
  onLoaded(events: ActivityEvent[]): void
}

export function ActivityPanel({ registry, events, onLoaded }: ActivityPanelProps) {
  const [agentId, setAgentId] = useState('')
  const [provenance, setProvenance] = useState<'' | Provenance>('')
  const [exhausted, setExhausted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (before?: string) => {
    const query = new URLSearchParams({ limit: String(PAGE) })
    if (agentId) query.set('agentId', agentId)
    if (provenance) query.set('provenance', provenance)
    if (before) query.set('before', before)
    try {
      const page = await api<ActivityEvent[]>(`/events?${query.toString()}`)
      onLoaded(page)
      setExhausted(page.length < PAGE)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Journal indisponible')
    }
  }, [agentId, provenance, onLoaded])

  useEffect(() => {
    void load()
  }, [load])

  const visible = mergeEvents(events, []).filter((event) =>
    (!agentId || event.agentId === agentId) && (!provenance || event.provenance === provenance))
  const agents = registry.agents.status === 'available' ? registry.agents.value : []

  return (
    <section aria-label="Activité" data-testid="activity">
      <h2>Activité</h2>
      <p className="muted">
        Le détail en direct ne concerne que les conversations lancées ici. Telegram, le CLI et le cron apparaissent avec du retard, sans détail.
      </p>
      <div className="filters">
        <label>
          Agent
          <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
            <option value="">Tous</option>
            {agents.map((agent) => <option key={agent.definition.id} value={agent.definition.id}>{agent.definition.name}</option>)}
          </select>
        </label>
        <label>
          Source
          <select value={provenance} onChange={(event) => setProvenance(event.target.value as '' | Provenance)}>
            <option value="">Toutes</option>
            {Object.entries(PROVENANCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {visible.length === 0 && !error && <p className="muted">Aucune activité pour ce filtre.</p>}
      <ul className="entries">
        {visible.map((event) => (
          <li key={event.id} data-testid="activity-event">
            <span><span className={`chip chip-source-${event.provenance}`}>{PROVENANCE_LABELS[event.provenance]}</span> {event.summary ?? event.type}</span>
            <span className="muted">{formatDate(event.occurredAt)}{event.agentId ? ` · ${event.agentId}` : ''}</span>
            {event.confidence.level !== 'confirmed' && <span className="muted">Fiabilité : {confidenceLabel(event.confidence)}</span>}
          </li>
        ))}
      </ul>
      {!exhausted && visible.length >= PAGE && (
        <button type="button" className="action" onClick={() => void load(visible.at(-1)?.occurredAt)}>Charger plus</button>
      )}
    </section>
  )
}
