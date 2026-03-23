import type { GstackAgent } from '../../types/agent.ts';
import type { BuiltinSkill } from '../../types/skill.ts';
import type { GstackConfig } from '../../types/config.ts';
import type { ClassifiedIntent, IntentClassifierOptions } from './types.ts';
import type { DelegationResult, DelegationOptions } from './delegation-engine.ts';
import { classifyIntent } from './intent-classifier.ts';
import { delegateIntent } from './delegation-engine.ts';

export type { UserIntent, ClassifiedIntent, IntentClassifierOptions } from './types.ts';
export { PHASE_PATTERNS, SKILL_TO_PHASE_MAP, PHASE_TO_DEFAULT_AGENT } from './intent-patterns.ts';
export { classifyIntent, extractExplicitSkillName } from './intent-classifier.ts';
export type { DelegationResult, DelegationOptions } from './delegation-engine.ts';
export { delegateIntent, getPhaseSkills } from './delegation-engine.ts';

export interface OrchestratorOptions {
  agents: GstackAgent[];
  skills: BuiltinSkill[];
  config: GstackConfig;
}

export interface Orchestrator {
  classify(text: string): ClassifiedIntent;
  delegate(classified: ClassifiedIntent): DelegationResult | null;
}

export function createOrchestrator(options: OrchestratorOptions): Orchestrator {
  const { agents, skills, config } = options;
  const classifierOptions: IntentClassifierOptions = {
    orchestrationMode: config.orchestration_mode,
  };
  const delegationOptions: DelegationOptions = {
    agents,
    skills,
    orchestrationMode: config.orchestration_mode,
    disabledAgents: new Set(config.disabled_agents),
  };

  return {
    classify(text: string): ClassifiedIntent {
      return classifyIntent(text, classifierOptions);
    },
    delegate(classified: ClassifiedIntent): DelegationResult | null {
      return delegateIntent(classified, delegationOptions);
    },
  };
}

export type { SprintPhase } from '../../types/agent.ts';
