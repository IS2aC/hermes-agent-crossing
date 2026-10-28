import type { AgentState } from '@crossing/shared';
export interface StatusInput { gateway?: boolean; reachable?: boolean; authError?: boolean; rateLimited?: boolean; failed?: boolean; waitingApproval?: boolean; blocked?: boolean; active?: boolean; lastEventAt?: number }
const priority: Array<[keyof StatusInput, AgentState]> = [['authError','down'], ['reachable','down'], ['gateway','down'], ['rateLimited','degraded'], ['failed','degraded'], ['waitingApproval','waiting_approval'], ['blocked','blocked'], ['active','working']];
export function resolveStatus(input: StatusInput): AgentState {
  for (const [key, state] of priority) if (input[key] === (key === 'reachable' || key === 'gateway' ? false : true)) return state;
  if (input.lastEventAt && Date.now() - input.lastEventAt < 20_000) return 'thinking';
  return 'idle';
}
export class StatusEngine {
  #states = new Map<string, { state: AgentState; since: number }>();
  constructor(readonly smoothingMs = 3000) {}
  update(id: string, input: StatusInput, now = Date.now()): AgentState {
    const proposed = resolveStatus(input); const current = this.#states.get(id);
    if (!current || current.state === proposed || now - current.since >= this.smoothingMs) this.#states.set(id, { state: proposed, since: now });
    return this.#states.get(id)!.state;
  }
  snapshot(): Record<string, AgentState> { return Object.fromEntries([...this.#states].map(([id, value]) => [id, value.state])); }
}
