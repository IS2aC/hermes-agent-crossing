/** Emplacements du bureau : devant chacun des 7 bureaux. Le personnage se centre sur ses deux tuiles. */
export interface OfficeSpot {
  id: string
  tileX: number
  tileY: number
}

export const OFFICE_SPOTS: readonly OfficeSpot[] = [
  { id: 'poste-1', tileX: 3, tileY: 4 },
  { id: 'poste-2', tileX: 7, tileY: 4 },
  { id: 'poste-3', tileX: 11, tileY: 4 },
  { id: 'poste-4', tileX: 3, tileY: 8 },
  { id: 'poste-5', tileX: 7, tileY: 8 },
  { id: 'poste-6', tileX: 11, tileY: 8 },
  { id: 'poste-7', tileX: 7, tileY: 12 },
]

/** Personnages créés au premier démarrage : apparence et emplacement, sans aucun agent. */
export const INITIAL_CHARACTERS: readonly { id: string; spriteId: string; displayName: string; spotId: string }[] = [
  { id: 'jarvis', spriteId: 'character.jarvis', displayName: 'JARVIS', spotId: 'poste-1' },
  { id: 'veilleur', spriteId: 'character.veilleur', displayName: 'VEILLEUR', spotId: 'poste-2' },
  { id: 'data-analyst', spriteId: 'character.data-analyst', displayName: 'DATA ANALYST', spotId: 'poste-3' },
  { id: 'devops', spriteId: 'character.devops', displayName: 'DEVOPS', spotId: 'poste-4' },
  { id: 'developer', spriteId: 'character.developer', displayName: 'DEVELOPER', spotId: 'poste-5' },
  { id: 'researcher', spriteId: 'character.researcher', displayName: 'RESEARCHER', spotId: 'poste-6' },
  { id: 'security', spriteId: 'character.security', displayName: 'SECURITY', spotId: 'poste-7' },
]
