import { useState } from 'react'
import { VISUAL_STATES, type VisualState } from './characters/animation'
import { OfficeCanvas } from './scene/OfficeCanvas'
import { initialCastStates } from './scene/office'

const STATE_LABELS: Record<VisualState, string> = {
  idle: 'Repos',
  walk: 'Marche',
  work: 'Travail',
  think: 'Réflexion',
  unknown: 'Inconnu',
  unavailable: 'Indisponible',
}

const CAST_LABELS: Record<string, string> = {
  'character.jarvis': 'JARVIS',
  'character.veilleur': 'VEILLEUR',
  'character.data-analyst': 'DATA ANALYST',
  'character.devops': 'DEVOPS',
  'character.developer': 'DEVELOPER',
  'character.researcher': 'RESEARCHER',
  'character.security': 'SECURITY',
}

export function App() {
  const [states, setStates] = useState(initialCastStates)

  return (
    <main className="app">
      <p className="simulation-banner" role="status">
        Démonstration : données simulées. Aucun agent Hermes n'est connecté.
      </p>
      <div className="workspace">
        <OfficeCanvas states={states} />
        <aside className="cast-panel" aria-label="Personnages de démonstration">
          <h2>Personnages</h2>
          <p className="cast-note">Apparence seulement. Les états sont choisis ici, à la main.</p>
          <ul>
            {Object.entries(states).map(([id, state]) => (
              <li key={id}>
                <label htmlFor={id}>{CAST_LABELS[id] ?? id}</label>
                <select
                  id={id}
                  value={state}
                  onChange={(event) => setStates((current) => ({ ...current, [id]: event.target.value as VisualState }))}
                >
                  {VISUAL_STATES.map((option) => (
                    <option key={option} value={option}>{STATE_LABELS[option]} (simulé)</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <p className="help">Flèches : se déplacer · Clic : aller à une case · + et − : zoom · 0 : ajuster</p>
    </main>
  )
}
