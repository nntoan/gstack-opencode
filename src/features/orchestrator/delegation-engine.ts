import type { GstackAgent, SprintPhase } from '../../types/agent.ts';
import type { BuiltinSkill } from '../../types/skill.ts';
import type { OrchestrationMode } from '../../types/config.ts';
import type { ClassifiedIntent } from './types.ts';
import { SKILL_TO_PHASE_MAP } from './intent-patterns.ts';

export interface DelegationResult {
  agent: GstackAgent;
  skills: BuiltinSkill[];
  phase: SprintPhase;
  reasoning: string;
  fallbackSkills?: BuiltinSkill[];
}

export interface DelegationOptions {
  agents: GstackAgent[];
  skills: BuiltinSkill[];
  orchestrationMode: OrchestrationMode;
  disabledAgents?: Set<string>;
}

export function getPhaseSkills(phase: SprintPhase, allSkills: BuiltinSkill[]): BuiltinSkill[] {
  return allSkills.filter((skill) => {
    const skillPhase = SKILL_TO_PHASE_MAP[skill.name];
    return skillPhase === phase;
  });
}

export function delegateIntent(
  classified: ClassifiedIntent,
  options: DelegationOptions
): DelegationResult | null {
  if (options.orchestrationMode === 'skills-only') {
    return null;
  }

  const { agents, skills, disabledAgents = new Set() } = options;

  const targetAgent = agents.find((a) => a.role === classified.suggestedAgent);
  const isDisabled = disabledAgents.has(classified.suggestedAgent);

  let selectedAgent: GstackAgent | undefined;
  let reasoningPrefix = '';

  if (!targetAgent || isDisabled) {
    selectedAgent = agents.find((a) => a.role === 'builder');
    reasoningPrefix = `Fallback to builder (${!targetAgent ? 'agent not found' : 'agent disabled'}). `;
  } else {
    selectedAgent = targetAgent;
  }

  if (!selectedAgent) {
    return null;
  }

  const phaseSkills = getPhaseSkills(classified.phase, skills);
  const additionalSkills = classified.suggestedSkills
    .filter((skillName) => !phaseSkills.some((s) => s.name === skillName))
    .map((skillName) => skills.find((s) => s.name === skillName))
    .filter((s): s is BuiltinSkill => s !== undefined);

  const allSkills = [...phaseSkills, ...additionalSkills];

  let reasoning = `${reasoningPrefix}${classified.reasoning}`;
  if (classified.confidence < 0.5) {
    reasoning += ` — Low confidence (${classified.confidence.toFixed(2)}), please confirm intent`;
  }

  return {
    agent: selectedAgent,
    skills: allSkills,
    phase: classified.phase,
    reasoning,
  };
}
