import { z } from 'zod';
export const HealthSchema = z.object({ status: z.literal('ok'), service: z.literal('crossing'), timestamp: z.string().datetime() });
export type Health = z.infer<typeof HealthSchema>;
export const AgentStateSchema = z.enum(['working','thinking','idle','meeting','blocked','waiting_approval','down','degraded']);
export type AgentState = z.infer<typeof AgentStateSchema>;
export interface Agent { id: string; name: string; profile: string; state: AgentState }
export interface ServerEvent { type: string; data: unknown; timestamp: string }
