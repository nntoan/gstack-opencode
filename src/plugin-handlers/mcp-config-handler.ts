import { createBuiltinMcps } from '../mcp/index.ts';
import type { GstackConfig } from '../types/config.ts';
import type { GstackSkill } from '../types/skill.ts';

type McpEntry = Record<string, unknown>;

function captureUserDisabledMcps(userMcp: Record<string, unknown> | undefined): Set<string> {
  const disabled = new Set<string>();
  if (!userMcp) return disabled;

  for (const [name, value] of Object.entries(userMcp)) {
    if (
      value &&
      typeof value === 'object' &&
      'enabled' in value &&
      (value as McpEntry).enabled === false
    ) {
      disabled.add(name);
    }
  }

  return disabled;
}

function extractSkillMcps(skills: GstackSkill[], disabledMcps: string[]): Record<string, McpEntry> {
  const disabledSet = new Set(disabledMcps);
  const result: Record<string, McpEntry> = {};

  for (const skill of skills) {
    if (!skill.mcpConfig) continue;
    for (const [name, config] of Object.entries(skill.mcpConfig)) {
      if (!disabledSet.has(name)) {
        result[name] = config as McpEntry;
      }
    }
  }

  return result;
}

export async function applyMcpConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: GstackConfig;
  skills?: GstackSkill[];
}): Promise<void> {
  const disabledMcps = params.pluginConfig.disabled_mcps ?? [];
  const userMcp = params.config.mcp as Record<string, unknown> | undefined;
  const userDisabledMcps = captureUserDisabledMcps(userMcp);
  const skillMcps = extractSkillMcps(params.skills ?? [], disabledMcps);

  const merged = {
    ...createBuiltinMcps(disabledMcps, params.pluginConfig),
    ...(userMcp ?? {}),
    ...skillMcps,
  } as Record<string, McpEntry>;

  for (const name of userDisabledMcps) {
    if (merged[name]) {
      merged[name] = { ...merged[name], enabled: false };
    }
  }

  const disabledSet = new Set(disabledMcps);
  for (const name of disabledSet) {
    delete merged[name];
  }

  params.config.mcp = merged;
}
