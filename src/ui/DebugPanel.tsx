import type { VisualDecision } from '../characters/visualState'
import type { RegistryView } from '../domain/registry'
import { PROVENANCE_LABELS } from './labels'

interface DebugPanelProps {
  registry: RegistryView
  decisions: ReadonlyMap<string, VisualDecision>
}

const LEVEL_LABELS = { confirmed: 'Confirmé', inferred: 'Déduit', unknown: 'Inconnu' }

export function DebugPanel({ registry, decisions }: DebugPanelProps) {
  return (
    <section aria-label="Debug" data-testid="debug">
      <h2>États visuels</h2>
      <p className="muted">D'où vient chaque animation. Une animation ne prouve rien par elle-même : seule sa source fait foi.</p>
      <ul className="entries">
        {registry.characters.map((entry) => {
          const decision = decisions.get(entry.profile.id)
          return (
            <li key={entry.profile.id} data-testid={`debug-${entry.profile.id}`}>
              <strong>{entry.profile.displayName}</strong>
              {decision ? (
                <dl>
                  <dt>Animation</dt>
                  <dd data-testid={`debug-state-${entry.profile.id}`}>{decision.state}</dd>
                  <dt>Fiabilité</dt>
                  <dd>{LEVEL_LABELS[decision.level]}</dd>
                  <dt>Source</dt>
                  <dd>{decision.source}{decision.provenance ? ` (${PROVENANCE_LABELS[decision.provenance]})` : ''}</dd>
                  <dt>Règle</dt>
                  <dd>{decision.rule}</dd>
                </dl>
              ) : <span className="muted">Pas sur le bureau.</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
