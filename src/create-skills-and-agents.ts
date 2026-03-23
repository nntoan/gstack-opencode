import type { GstackConfig } from './types/config.ts';
import type { GstackSkill } from './types/skill.ts';
import type { GstackAgent } from './types/agent.ts';
import { createBuiltinSkills } from './features/builtin-skills/skills.ts';
import { createGstackAgents } from './agents/index.ts';

export interface SkillsAndAgents {
  skills: GstackSkill[];
  agents: GstackAgent[];
}

export function createSkillsAndAgents(config: GstackConfig): SkillsAndAgents {
  const skills = createBuiltinSkills({
    disabledSkills: new Set(config.disabled_skills ?? []),
  });

  const agents = createGstackAgents({
    disabledAgents: new Set(config.disabled_agents ?? []),
    orchestrationMode: config.orchestration_mode,
  });

  return { skills, agents };
}
