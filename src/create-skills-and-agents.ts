import type { GstackConfig } from './types/config.ts';
import type { GstackSkill } from './types/skill.ts';
import type { GstackAgent } from './types/agent.ts';
import { createBuiltinSkills } from './features/builtin-skills/skills.ts';
import { createGstackAgents } from './agents/index.ts';
import {
  getDefaultInstallSelection,
  resolveAgentModelDefaults,
  type InstallSelection,
} from './cli/model-defaults.ts';

export interface SkillsAndAgents {
  skills: GstackSkill[];
  agents: GstackAgent[];
}

export function createSkillsAndAgents(config: GstackConfig): SkillsAndAgents {
  const skills = createBuiltinSkills({
    disabledSkills: new Set(config.disabled_skills ?? []),
  });

  const installSelection: InstallSelection = {
    ...getDefaultInstallSelection(),
    claudePlan: config.install_selection?.claude_plan ?? 'none',
    hasOpenAI: config.install_selection?.has_openai ?? false,
    hasGemini: config.install_selection?.has_gemini ?? false,
    hasCopilot: config.install_selection?.has_copilot ?? false,
    hasOpencodeZen: config.install_selection?.has_opencode_zen ?? false,
    hasZaiCodingPlan: config.install_selection?.has_zai_coding_plan ?? false,
    hasKimiForCoding: config.install_selection?.has_kimi_for_coding ?? false,
    hasOpencodeGo: config.install_selection?.has_opencode_go ?? false,
  };
  const defaultModels = resolveAgentModelDefaults(installSelection);

  const baseAgents = createGstackAgents({
    disabledAgents: new Set(config.disabled_agents ?? []),
    orchestrationMode: config.orchestration_mode,
  });
  const agents = baseAgents.map((agent) => {
    const override = config.agents?.[agent.role];
    const nextModel = override?.model ?? defaultModels[agent.role] ?? agent.model;

    return {
      ...agent,
      model: nextModel,
      instructions: override?.instructions ?? agent.instructions,
    };
  });

  return { skills, agents };
}
