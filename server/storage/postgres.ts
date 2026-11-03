import type { ActivityEvent, EventFilter, LocalTask } from '../../src/domain/activity'
import type { AgentBinding, AgentId, CharacterId, CharacterProfile, SessionId } from '../../src/domain/agents'
import { ConflictError, initialProfiles, newTask, NotFoundError, type CharacterUpdate, type Store, type TaskCreate, type TaskUpdate } from './store'

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
  `CREATE TABLE activity_events (
    id TEXT PRIMARY KEY,
    provenance TEXT NOT NULL,
    confidence_level TEXT NOT NULL,
    confidence_rule TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    agent_id TEXT,
    session_id TEXT,
    run_id TEXT,
    summary TEXT
  )`,
  'CREATE INDEX activity_events_occurred_at ON activity_events (occurred_at)',
  `CREATE TABLE local_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL,
    assignee_id TEXT,
    owner_id TEXT NOT NULL DEFAULT 'operator',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
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

function toEvent(row: Record<string, unknown>): ActivityEvent {
  const level = row.confidence_level as string
  return {
    id: row.id as string,
    provenance: row.provenance as ActivityEvent['provenance'],
    confidence: level === 'inferred'
      ? { level: 'inferred', rule: (row.confidence_rule as string | null) ?? '' }
      : level === 'confirmed' ? { level: 'confirmed' } : { level: 'unknown' },
    occurredAt: new Date(row.occurred_at as string | Date).toISOString(),
    type: row.type as string,
    agentId: (row.agent_id as AgentId | null) ?? null,
    sessionId: (row.session_id as SessionId | null) ?? null,
    runId: (row.run_id as string | null) ?? null,
    summary: (row.summary as string | null) ?? null,
  }
}

function toTask(row: Record<string, unknown>): LocalTask {
  return {
    id: row.id as string,
    provenance: 'application',
    title: row.title as string,
    details: (row.details as string | null) ?? null,
    status: row.status as LocalTask['status'],
    assigneeId: (row.assignee_id as CharacterId | null) ?? null,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
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

  async addEvent(event: ActivityEvent): Promise<boolean> {
    const { rows: existing } = await this.pool.query('SELECT id FROM activity_events WHERE id = $1', [event.id])
    if (existing.length > 0) return false
    try {
      const result = await this.pool.query(
        `INSERT INTO activity_events (id, provenance, confidence_level, confidence_rule, occurred_at, type, agent_id, session_id, run_id, summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING RETURNING id`,
        [event.id, event.provenance, event.confidence.level, event.confidence.level === 'inferred' ? event.confidence.rule : null,
          event.occurredAt, event.type, event.agentId, event.sessionId, event.runId, event.summary],
      )
      return result.rows.length === 1
    } catch (error) {
      if (isUniqueViolation(error)) return false
      throw error
    }
  }

  async listEvents(filter: EventFilter): Promise<ActivityEvent[]> {
    const conditions: string[] = []
    const values: unknown[] = []
    const add = (condition: string, value: unknown) => {
      values.push(value)
      conditions.push(condition.replace('?', `$${values.length}`))
    }
    if (filter.agentId) add('agent_id = ?', filter.agentId)
    if (filter.provenance) add('provenance = ?', filter.provenance)
    if (filter.before) add('occurred_at < ?', filter.before)
    if (filter.taskId) {
      add('run_id = ?', filter.taskId)
      conditions.push("type LIKE 'task.%'")
    }
    values.push(filter.limit)
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await this.pool.query(
      `SELECT * FROM activity_events ${where} ORDER BY occurred_at DESC, id ASC LIMIT $${values.length}`,
      values,
    )
    return rows.map(toEvent)
  }

  async purgeEventsBefore(isoDate: string): Promise<void> {
    await this.pool.query('DELETE FROM activity_events WHERE occurred_at < $1', [isoDate])
  }

  async listTasks(): Promise<LocalTask[]> {
    const { rows } = await this.pool.query('SELECT * FROM local_tasks ORDER BY created_at DESC')
    return rows.map(toTask)
  }

  async createTask(input: TaskCreate): Promise<LocalTask> {
    const task = newTask(input)
    await this.pool.query(
      'INSERT INTO local_tasks (id, title, details, status, assignee_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [task.id, task.title, task.details, task.status, task.assigneeId, task.createdAt, task.updatedAt],
    )
    return task
  }

  async updateTask(id: string, update: TaskUpdate): Promise<LocalTask> {
    const { rows } = await this.pool.query('SELECT * FROM local_tasks WHERE id = $1', [id])
    const current = rows[0]
    if (!current) throw new NotFoundError('Tâche introuvable')
    const next: LocalTask = { ...toTask(current), ...update, updatedAt: new Date().toISOString() }
    await this.pool.query(
      'UPDATE local_tasks SET title = $1, details = $2, status = $3, assignee_id = $4, updated_at = $5 WHERE id = $6',
      [next.title, next.details, next.status, next.assigneeId, next.updatedAt, id],
    )
    return next
  }

  async deleteTask(id: string): Promise<void> {
    const { rows } = await this.pool.query('SELECT id FROM local_tasks WHERE id = $1', [id])
    if (rows.length === 0) throw new NotFoundError('Tâche introuvable')
    await this.pool.query('DELETE FROM local_tasks WHERE id = $1', [id])
  }

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1')
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}
