import type { SprintPhase, AgentRole } from './agent.ts';

export interface UserIntent {
  raw: string;
  phase: SprintPhase;
  confidence: number;
}

export interface DelegationResult {
  agent: AgentRole;
  skills: string[];
  reasoning: string;
}

export interface BoulderState {
  activePlan?: string;
  startedAt?: string;
  sessionIds: string[];
  planName?: string;
  currentPhase?: SprintPhase;
}

export interface SprintLogEntry {
  timestamp: string;
  phase: SprintPhase;
  agent: AgentRole;
  action: string;
}

export interface SessionState {
  sessionId: string;
  pid: number;
  startTime: string;
  agentType: string;
}
