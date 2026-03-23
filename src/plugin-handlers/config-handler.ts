import type { GstackConfig } from '../types/config.ts';
import type { GstackSkill } from '../types/skill.ts';
import { log } from '../shared/index.ts';
import { applyMcpConfig } from './mcp-config-handler.ts';

export interface ConfigHandlerDeps {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  skills?: GstackSkill[];
}

function skillsToCommands(skills: GstackSkill[]): Record<string, unknown> {
  const commands: Record<string, unknown> = {};
  for (const skill of skills) {
    const entry: Record<string, unknown> = {
      description: skill.description,
      template: skill.template,
    };
    if (skill.allowedTools) entry.allowedTools = skill.allowedTools;
    if (skill.agent) entry.agent = skill.agent;
    if (skill.model) entry.model = skill.model;
    if (skill.argumentHint) entry.argumentHint = skill.argumentHint;
    if (skill.subtask !== undefined) entry.subtask = skill.subtask;
    if (skill.license) entry.license = skill.license;
    if (skill.compatibility) entry.compatibility = skill.compatibility;
    if (skill.metadata) entry.metadata = skill.metadata;
    commands[skill.name] = entry;
  }
  return commands;
}

function applyAgentConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: GstackConfig;
}): void {
  const { config, pluginConfig } = params;
  const disabledSet = new Set(pluginConfig.disabled_agents ?? []);
  const agentOverrides = pluginConfig.agents ?? {};

  const existingAgents = (config.agents as Record<string, unknown>) ?? {};
  const merged: Record<string, unknown> = { ...existingAgents };

  for (const [key, override] of Object.entries(agentOverrides)) {
    if (disabledSet.has(key)) continue;
    merged[key] = { ...(merged[key] as Record<string, unknown> | undefined), ...override };
  }

  config.agents = merged;
}

function applySkillConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: GstackConfig;
  skills?: GstackSkill[];
}): void {
  const { config, pluginConfig, skills } = params;
  const disabledSet = new Set(pluginConfig.disabled_skills ?? []);

  const existingCommands = (config.commands as Record<string, unknown>) ?? {};
  const skillCommands = skills ? skillsToCommands(skills) : {};
  const merged: Record<string, unknown> = { ...skillCommands, ...existingCommands };

  for (const key of Object.keys(merged)) {
    if (disabledSet.has(key)) {
      delete merged[key];
    }
  }

  config.commands = merged;
}

export function createConfigHandler(deps: ConfigHandlerDeps) {
  const { pluginConfig, skills } = deps;

  return async (config: Record<string, unknown>): Promise<void> => {
    if (pluginConfig.orchestration_mode === 'multi-agent') {
      applyAgentConfig({ config, pluginConfig });
    }

    applySkillConfig({ config, pluginConfig, skills });

    await applyMcpConfig({ config, pluginConfig, skills });

    log('[config-handler] config applied', {
      mode: pluginConfig.orchestration_mode,
    });
  };
}
