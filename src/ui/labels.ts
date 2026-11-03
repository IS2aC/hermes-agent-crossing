import type { ObservedAgentState } from '../domain/agents'
import type { Confidence, Provenance } from '../domain/provenance'
import type { LinkState } from '../domain/registry'

export const LINK_LABELS: Record<LinkState, string> = {
  none: 'Aucun agent associé',
  connected: 'Connecté',
  unreachable: 'Agent injoignable',
  missing: 'Agent introuvable',
  unknown: 'État inconnu',
}

export const STATE_LABELS: Record<ObservedAgentState, string> = {
  idle: 'Au repos',
  working: 'En activité',
  thinking: 'En réflexion',
  waiting: 'En attente',
  error: 'En erreur',
  unavailable: 'Indisponible',
  unknown: 'Inconnu',
}

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  hermes: 'Hermes',
  application: 'Application',
  simulation: 'Simulation',
}

export function confidenceLabel(confidence: Confidence): string {
  if (confidence.level === 'confirmed') return 'confirmé'
  if (confidence.level === 'inferred') return `déduit : ${confidence.rule}`
  return 'inconnu'
}

export function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString('fr-FR') : 'Indisponible'
}
