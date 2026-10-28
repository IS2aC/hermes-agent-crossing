// Shared types for Hermes Agent Crossing
export interface AgentState {
  id: string;
  name: string;
  profile: string;
  role: string;
  team: string | null;
  state: 'working' | 'thinking' | 'idle' | 'meeting' | 'blocked' | 'waiting_approval' | 'down' | 'degraded';
  since: number;
  cause: string | null;
  taskId: string | null;
  targetAgentId: string | null;
}

export interface Team {
  id: string;
  name: string;
  color: string; // hex color
  managerId: string | null;
  memberIds: string[];
}

export interface WorldState {
  agents: AgentState[];
  teams: Team[];
  layoutSeed: number;
  capabilities: Record<string, boolean>;
}