import { useState } from 'react'
import type { AgentEntry, RegistryView } from '../domain/registry'
import { api } from './api'
import { LINK_LABELS, STATE_LABELS } from './labels'

interface RegistryPanelProps {
  registry: RegistryView
  onChanged(): void
  onSelect(characterId: string): void
}

function runtimeLabel(entry: AgentEntry): string {
  if (entry.runtime.status === 'unavailable') return 'Inconnu'
  return STATE_LABELS[entry.runtime.value.state.value]
}

export function RegistryPanel({ registry, onChanged, onSelect }: RegistryPanelProps) {
  const [error, setError] = useState<string | null>(null)
  const agents = registry.agents.status === 'available' ? registry.agents.value : []

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    try {
      await action()
      onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action impossible')
    }
  }

  return (
    <section aria-label="Registre">
      {error && <p className="form-error" role="alert">{error}</p>}

      <h2>Agents</h2>
      {registry.agents.status === 'unavailable' && (
        <p className="form-error" role="alert">Découverte indisponible : {registry.agents.reason}</p>
      )}
      {registry.agents.status === 'available' && agents.length === 0 && <p className="muted">Aucun agent configuré.</p>}
      <ul className="entries">
        {agents.map((entry) => (
          <li key={entry.definition.id} data-testid={`agent-${entry.definition.id}`}>
            <strong>{entry.definition.name}</strong>
            <span className={entry.reachable ? 'chip chip-ok' : 'chip chip-off'}>{entry.reachable ? 'Joignable' : 'Injoignable'}</span>
            <span className="muted">État : {runtimeLabel(entry)}</span>
            <span className="muted">{entry.characterId ? `Personnage : ${entry.characterId}` : 'Sans personnage'}</span>
          </li>
        ))}
      </ul>

      <h2>Personnages</h2>
      <ul className="entries">
        {registry.characters.map((entry) => (
          <li key={entry.profile.id} data-testid={`character-${entry.profile.id}`}>
            <button type="button" className="link" onClick={() => onSelect(entry.profile.id)}>{entry.profile.displayName}</button>
            <span className={`chip chip-${entry.link}`}>{LINK_LABELS[entry.link]}</span>
            <label>
              Agent associé
              <select
                value={entry.agentId ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  void run(() => value
                    ? api('/bindings', { method: 'PUT', body: { characterId: entry.profile.id, agentId: value } })
                    : api(`/bindings/${encodeURIComponent(entry.profile.id)}`, { method: 'DELETE' }))
                }}
              >
                <option value="">Aucun</option>
                {agents.map((agent) => (
                  <option key={agent.definition.id} value={agent.definition.id}>{agent.definition.name}</option>
                ))}
                {entry.agentId && !agents.some((agent) => agent.definition.id === entry.agentId) && (
                  <option value={entry.agentId}>{entry.agentId} (introuvable)</option>
                )}
              </select>
            </label>
            <label>
              Emplacement
              <select
                value={registry.spots.find((spot) => spot.tileX === entry.profile.placement?.tileX && spot.tileY === entry.profile.placement?.tileY)?.id ?? ''}
                onChange={(event) => {
                  const spotId = event.target.value || null
                  void run(() => api(`/characters/${encodeURIComponent(entry.profile.id)}`, { method: 'PATCH', body: { spotId } }))
                }}
              >
                <option value="">Absent du bureau</option>
                {registry.spots.map((spot) => <option key={spot.id} value={spot.id}>{spot.id}</option>)}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
