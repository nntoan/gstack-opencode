import type { SprintPhase } from '../../types/agent.ts';
import type { AgentRole } from '../../types/agent.ts';
import type { OrchestrationMode } from '../../types/config.ts';

export interface UserIntent {
  text: string;
  context?: {
    currentPhase?: SprintPhase;
    recentSkills?: string[];
    hasDesignDoc?: boolean;
    hasBacklog?: boolean;
  };
}

export interface ClassifiedIntent {
  phase: SprintPhase;
  confidence: number;
  suggestedAgent: AgentRole;
  suggestedSkills: string[];
  reasoning: string;
}

export interface IntentClassifierOptions {
  orchestrationMode: OrchestrationMode;
}
