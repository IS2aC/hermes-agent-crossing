import type { AgentBinding, AgentId, CharacterId, CharacterProfile } from '../../src/domain/agents'
import { ConflictError, initialProfiles, NotFoundError, type CharacterUpdate, type Store } from './store'

/** Sous-ensemble de `pg.Pool` utilisé ici. */
export interface SqlPool {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>
  end(): Promise<void>
}

const UNIQUE_VIOLATION = '23505'

/** Migrations ajoutées à la fin, jamais modifiées. */
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE character_profiles (
    id TEXT PRIMARY KEY,
    sprite_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    tile_x INTEGER,
    tile_y INTEGER,
    owner_id TEXT NOT NULL DEFAULT 'operator',
    UNIQUE (tile_x, tile_y)
  )`,
  `CREATE TABLE agent_bindings (
    character_id TEXT PRIMARY KEY REFERENCES character_profiles (id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL
  )`,
]

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown }).code === UNIQUE_VIOLATION
    || /duplicate key|already exists|unique constraint/i.test(String((error as Error).message))
}

function toProfile(row: Record<string, unknown>): CharacterProfile {
  return {
    id: row.id as CharacterId,
    spriteId: row.sprite_id as string,
    displayName: row.display_name as string,
    placement: row.tile_x === null || row.tile_y === null
      ? null
      : { tileX: row.tile_x as number, tileY: row.tile_y as number },
  }
}

function toBinding(row: Record<string, unknown>): AgentBinding {
  return {
    characterId: row.character_id as CharacterId,
    agentId: row.agent_id as AgentId,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
  }
}

export class PostgresStore implements Store {
  constructor(protected readonly pool: SqlPool) {}

  async migrate(): Promise<void> {
    const { rows: tables } = await this.pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'schema_migrations' AND table_schema = current_schema()",
    )
    if (tables.length === 0) await this.pool.query('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY)')
    const { rows } = await this.pool.query('SELECT version FROM schema_migrations')
    const applied = new Set(rows.map((row) => Number(row.version)))
    for (const [index, migration] of this.migrations().entries()) {
      if (applied.has(index)) continue
      await this.pool.query(migration)
      await this.pool.query('INSERT INTO schema_migrations (version) VALUES ($1)', [index])
    }
    const { rows: existing } = await this.pool.query('SELECT id FROM character_profiles')
    if (existing.length > 0) return
    for (const profile of initialProfiles()) {
      await this.pool.query(
        'INSERT INTO character_profiles (id, sprite_id, display_name, tile_x, tile_y) VALUES ($1, $2, $3, $4, $5)',
        [profile.id, profile.spriteId, profile.displayName, profile.placement?.tileX ?? null, profile.placement?.tileY ?? null],
      )
    }
  }

  protected migrations(): readonly string[] {
    return MIGRATIONS
  }

  async listCharacters(): Promise<CharacterProfile[]> {
    const { rows } = await this.pool.query('SELECT * FROM character_profiles ORDER BY tile_y, tile_x')
    return rows.map(toProfile)
  }

  async updateCharacter(id: CharacterId, update: CharacterUpdate): Promise<CharacterProfile> {
    const { rows } = await this.pool.query('SELECT * FROM character_profiles WHERE id = $1', [id])
    const current = rows[0]
    if (!current) throw new NotFoundError('Personnage introuvable')
    const merged = { ...toProfile(current), ...update }
    try {
      await this.pool.query(
        'UPDATE character_profiles SET display_name = $1, tile_x = $2, tile_y = $3 WHERE id = $4',
        [merged.displayName, merged.placement?.tileX ?? null, merged.placement?.tileY ?? null, id],
      )
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('Cet emplacement est déjà occupé')
      throw error
    }
    return merged
  }

  async listBindings(): Promise<AgentBinding[]> {
    const { rows } = await this.pool.query('SELECT * FROM agent_bindings')
    return rows.map(toBinding)
  }

  async setBinding(characterId: CharacterId, agentId: AgentId): Promise<AgentBinding> {
    const { rows } = await this.pool.query('SELECT id FROM character_profiles WHERE id = $1', [characterId])
    if (rows.length === 0) throw new NotFoundError('Personnage introuvable')
    const createdAt = new Date().toISOString()
    try {
      await this.pool.query('DELETE FROM agent_bindings WHERE character_id = $1', [characterId])
      await this.pool.query(
        'INSERT INTO agent_bindings (character_id, agent_id, created_at) VALUES ($1, $2, $3)',
        [characterId, agentId, createdAt],
      )
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('Cet agent est déjà associé à un autre personnage')
      throw error
    }
    return { characterId, agentId, createdAt }
  }

  async removeBinding(characterId: CharacterId): Promise<void> {
    await this.pool.query('DELETE FROM agent_bindings WHERE character_id = $1', [characterId])
  }

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1')
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}
