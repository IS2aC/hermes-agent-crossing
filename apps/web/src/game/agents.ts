import type { AgentState } from '@crossing/shared';

export const AGENT_STATES: readonly AgentState[] = ['working', 'thinking', 'idle', 'meeting', 'blocked', 'waiting_approval', 'down', 'degraded'];
export const AGENT_PALETTE = [0x1e2952, 0xf79b39, 0x38633b, 0x443467, 0x0a71b7, 0x73451d] as const;
export const WALK_SPEED = 2 * 16;

export interface AgentSnapshot { id: string; name: string; profile?: string; state: AgentState }
export interface ServerEvent { type: string; data: unknown; timestamp: string }

export function parseAgentSnapshot(value: unknown): AgentSnapshot[] {
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const raw = Array.isArray(value) ? value : Array.isArray(record.agents) ? record.agents :
    record.status && typeof record.status === 'object' ? Object.entries(record.status as Record<string, unknown>).map(([id, state]) => ({ id, state })) : [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const a = item as Record<string, unknown>;
    if (typeof a.id !== 'string' || !AGENT_STATES.includes(a.state as AgentState)) return [];
    return [{ id: a.id, name: typeof a.name === 'string' ? a.name : typeof a.profile === 'string' ? a.profile : a.id, profile: typeof a.profile === 'string' ? a.profile : undefined, state: a.state as AgentState }];
  });
}

export function idleDestination(random: () => number, points: readonly { x: number; y: number }[]): number {
  if (points.length < 1) return -1;
  const weights = points.map((_p, i) => i === 0 ? 4 : i === 1 ? 1 : i === 2 ? 3 : 2);
  const total = weights.reduce((a, b) => a + b, 0); let pick = random() * total;
  return weights.findIndex((weight) => (pick -= weight) < 0);
}
