import { SCHEMA_URL } from '../config/schema/constants.ts';
import type { InstallSelection } from './model-defaults.ts';
import { resolveAgentModelDefaults } from './model-defaults.ts';

export interface InstallTemplateData {
  selection: InstallSelection;
  models: ReturnType<typeof resolveAgentModelDefaults>;
}

export function buildInstallTemplateData(selection: InstallSelection): InstallTemplateData {
  return {
    selection,
    models: resolveAgentModelDefaults(selection),
  };
}

export function buildConfigTemplate(selection: InstallSelection): string {
  const { selection: normalizedSelection, models: defaults } = buildInstallTemplateData(selection);

  return `{
  "$schema": "${SCHEMA_URL}",
  // Orchestration mode: "multi-agent" (default) or "skills-only" (backward compat)
  "orchestration_mode": "multi-agent",
  // Install-time provider subscription flags (oh-my-openagent style)
  "install_selection": {
    "claude_plan": "${normalizedSelection.claudePlan}",
    "has_openai": ${normalizedSelection.hasOpenAI},
    "has_gemini": ${normalizedSelection.hasGemini},
    "has_copilot": ${normalizedSelection.hasCopilot},
    "has_opencode_zen": ${normalizedSelection.hasOpencodeZen},
    "has_zai_coding_plan": ${normalizedSelection.hasZaiCodingPlan},
    "has_kimi_for_coding": ${normalizedSelection.hasKimiForCoding},
    "has_opencode_go": ${normalizedSelection.hasOpencodeGo}
  },
  // Agent model defaults generated from install_selection fallback chain
  "agents": {
    "ceo": { "model": "${defaults.ceo}" },
    "eng-manager": { "model": "${defaults['eng-manager']}" },
    "designer": { "model": "${defaults.designer}" },
    "builder": { "model": "${defaults.builder}" },
    "reviewer": { "model": "${defaults.reviewer}" },
    "debugger": { "model": "${defaults.debugger}" },
    "qa-lead": { "model": "${defaults['qa-lead']}" },
    "release-engineer": { "model": "${defaults['release-engineer']}" },
    "doc-engineer": { "model": "${defaults['doc-engineer']}" },
    "retro-lead": { "model": "${defaults['retro-lead']}" },
    "safety-guard": { "model": "${defaults['safety-guard']}" },
    "upgrader": { "model": "${defaults.upgrader}" },
    "session-manager": { "model": "${defaults['session-manager']}" }
  },
  // Agents to disable (e.g. ["designer", "retro-lead"])
  "disabled_agents": [],
  // Skills to disable
  "disabled_skills": []
}
`;
}
