// Shared Zod schemas for API validation
import { z } from 'zod';

export const AgentStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  profile: z.string(),
  role: z.string(),
  team: z.string().nullable(),
  state: z.enum(['working', 'thinking', 'idle', 'meeting', 'blocked', 'waiting_approval', 'down', 'degraded']),
  since: z.number(),
  cause: z.string().nullable(),
  taskId: z.string().nullable(),
  targetAgentId: z.string().nullable()
});

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  managerId: z.string().nullable(),
  memberIds: z.array(z.string())
});

export const WorldStateSchema = z.object({
  agents: z.array(AgentStateSchema),
  teams: z.array(TeamSchema),
  layoutSeed: z.number(),
  capabilities: z.record(z.boolean())
});

// Export a combined schema for the world state
export const WorldStateSchema = z.object({
  agents: z.array(AgentStateSchema),
  teams: z.array(TeamSchema),
  layoutSeed: z.number(),
  capabilities: z.record(z.boolean())
});