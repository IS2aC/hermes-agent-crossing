import type { RegistryView } from '../domain/registry'
import { confidenceLabel, formatDate, LINK_LABELS, PROVENANCE_LABELS, STATE_LABELS } from './labels'

interface AgentInspectorProps {
  registry: RegistryView
  characterId: string | null
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value || 'Indisponible'}</dd>
    </>
  )
}

export function AgentInspector({ registry, characterId }: AgentInspectorProps) {
  const entry = registry.characters.find((candidate) => candidate.profile.id === characterId)
  if (!entry) return <p className="muted">Clique sur un personnage pour voir sa fiche.</p>

  const agents = registry.agents.status === 'available' ? registry.agents.value : []
  const agent = agents.find((candidate) => candidate.definition.id === entry.agentId)
  const runtime = agent?.runtime.status === 'available' ? agent.runtime.value : null

  return (
    <section aria-label="Fiche" data-testid="inspector">
      <h2>{entry.profile.displayName}</h2>
      <p><span className={`chip chip-${entry.link}`}>{LINK_LABELS[entry.link]}</span></p>
      <p className="muted">Apparence : {entry.profile.spriteId}. Provenance : application.</p>
      {entry.link === 'none' && <p className="muted">Ce personnage n'est relié à aucun agent. Il n'a donc pas d'activité à afficher.</p>}
      {entry.link === 'missing' && <p className="muted">L'agent {entry.agentId} n'est plus déclaré. Le lien est conservé.</p>}
      {agent && (
        <dl>
          <Field label="Agent" value={agent.definition.name} />
          <Field label="Identifiant" value={agent.definition.id} />
          <Field label="Description" value={agent.definition.description} />
          <Field label="Modèle" value={agent.definition.model} />
          <Field label="Fournisseur" value={agent.definition.provider} />
          <Field label="Version" value={agent.version} />
          {agent.detail && <Field label="Détail" value={agent.detail} />}
          {runtime ? (
            <>
              <Field label="État" value={STATE_LABELS[runtime.state.value]} />
              <Field label="Fiabilité" value={confidenceLabel(runtime.state.confidence)} />
              <Field label="Source" value={PROVENANCE_LABELS[runtime.state.provenance]} />
              <Field label="Observé le" value={formatDate(runtime.state.observedAt)} />
              <Field label="Dernière activité" value={runtime.lastActivityAt && formatDate(runtime.lastActivityAt)} />
            </>
          ) : (
            <Field label="État" value={agent.runtime.status === 'unavailable' ? `Inconnu : ${agent.runtime.reason}` : 'Inconnu'} />
          )}
        </dl>
      )}
    </section>
  )
}
