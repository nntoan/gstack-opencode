import type { GstackAgent, AgentRole, SprintPhase } from '../types/agent.ts';
import type { OrchestrationMode } from '../types/config.ts';

export type { GstackAgent, AgentRole, SprintPhase };

export interface CreateAgentsOptions {
  disabledAgents?: Set<string>;
  orchestrationMode?: OrchestrationMode;
}
