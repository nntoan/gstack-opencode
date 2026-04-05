import type { GstackConfig } from '../types/config.ts';
import type { GstackSkill } from '../types/skill.ts';
import type { GstackAgent } from '../types/agent.ts';
import { log } from '../shared/index.ts';
import { deepMerge } from '../shared/deep-merge.ts';
import { applyMcpConfig } from './mcp-config-handler.ts';

export interface ConfigHandlerDeps {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  skills?: GstackSkill[];
  agents?: GstackAgent[];
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

function agentsToOpenCodeAgentConfig(agents: GstackAgent[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const agent of agents) {
    const entry: Record<string, unknown> = {
      description: agent.description,
      prompt: agent.instructions,
      mode: 'all',
    };
    if (agent.model) entry.model = agent.model;
    out[agent.role] = entry;
  }
  return out;
}

function applyAgentConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: GstackConfig;
  agents?: GstackAgent[];
}): void {
  const { config, pluginConfig, agents } = params;
  const disabledSet = new Set(pluginConfig.disabled_agents ?? []);
  const registrationMode = pluginConfig.agent_registration?.mode ?? 'curated';
  const suppressedHostBuiltins = new Set(
    pluginConfig.agent_registration?.suppress_host_builtins ?? ['build', 'plan']
  );
  const agentOverrides = pluginConfig.agents ?? {};
  const builtInAgents = agents ? agentsToOpenCodeAgentConfig(agents) : {};

  const existingAgents =
    (config.agent as Record<string, unknown>) ?? (config.agents as Record<string, unknown>) ?? {};
  const curatedExisting = Object.fromEntries(
    Object.entries(existingAgents).filter(([key]) => !suppressedHostBuiltins.has(key))
  );

  const merged: Record<string, unknown> =
    registrationMode === 'replace'
      ? { ...builtInAgents }
      : registrationMode === 'curated'
        ? { ...curatedExisting, ...builtInAgents }
        : { ...builtInAgents, ...existingAgents };

  for (const key of Object.keys(merged)) {
    if (disabledSet.has(key)) {
      delete merged[key];
    }
  }

  for (const [key, override] of Object.entries(agentOverrides)) {
    if (disabledSet.has(key)) continue;
    merged[key] = { ...(merged[key] as Record<string, unknown> | undefined), ...override };
  }

  config.agent = merged;
}

function applyCategoryConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: GstackConfig;
}): void {
  const { config, pluginConfig } = params;
  const existingCategories = (config.categories as Record<string, unknown>) ?? {};
  const pluginCategories = pluginConfig.categories ?? {};
  const disabledSet = new Set(pluginConfig.disabled_categories ?? []);

  const merged = {
    ...existingCategories,
    ...pluginCategories,
  };

  for (const key of Object.keys(merged)) {
    if (disabledSet.has(key)) {
      delete merged[key];
    }
  }

  config.categories = merged;
}

function applyRuntimeFallbackConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: GstackConfig;
}): void {
  const { config, pluginConfig } = params;
  if (pluginConfig.runtime_fallback === undefined) {
    return;
  }

  const existing = config.runtime_fallback;
  if (
    pluginConfig.runtime_fallback &&
    typeof pluginConfig.runtime_fallback === 'object' &&
    existing &&
    typeof existing === 'object'
  ) {
    config.runtime_fallback = deepMerge(
      existing as Record<string, unknown>,
      pluginConfig.runtime_fallback as Record<string, unknown>
    );
    return;
  }

  config.runtime_fallback = pluginConfig.runtime_fallback;
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
  const { pluginConfig, skills, agents } = deps;

  return async (config: Record<string, unknown>): Promise<void> => {
    if (
      pluginConfig.orchestration_mode === 'multi-agent' ||
      (pluginConfig.agent_registration?.mode ?? 'curated') !== 'augment'
    ) {
      applyAgentConfig({ config, pluginConfig, agents });
    }

    applyCategoryConfig({ config, pluginConfig });
    applyRuntimeFallbackConfig({ config, pluginConfig });

    applySkillConfig({ config, pluginConfig, skills });

    await applyMcpConfig({ config, pluginConfig, skills });

    log('[config-handler] config applied', {
      mode: pluginConfig.orchestration_mode,
    });
  };
}
