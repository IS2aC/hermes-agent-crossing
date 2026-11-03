/** Origine d'une information : toujours visible par l'utilisateur. */
export type Provenance = 'hermes' | 'application' | 'simulation'

/** Une déduction doit nommer sa règle ; un état inconnu reste inconnu. */
export type Confidence =
  | { level: 'confirmed' }
  | { level: 'inferred'; rule: string }
  | { level: 'unknown' }

export interface Sourced<T> {
  value: T
  provenance: Provenance
  confidence: Confidence
  /** Horodatage ISO 8601 de l'observation. */
  observedAt: string
}

/** Une capacité existe et a été vérifiée, ou bien est indisponible, sans valeur par défaut. */
export type Capability<T> =
  | { status: 'available'; value: T }
  | { status: 'unavailable'; reason: string }
