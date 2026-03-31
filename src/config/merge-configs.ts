import { deepMerge } from '../shared/deep-merge.ts';
import type { GstackConfig } from '../types/config.ts';

export function mergeConfigs(base: GstackConfig, override: Partial<GstackConfig>): GstackConfig {
  return {
    ...base,
    ...override,
    install_selection: deepMerge(
      (base.install_selection ?? {}) as Record<string, unknown>,
      (override.install_selection ?? {}) as Record<string, unknown>
    ) as GstackConfig['install_selection'],
    agents: deepMerge(base.agents ?? {}, override.agents ?? {}),
    mcp: deepMerge(base.mcp ?? {}, override.mcp ?? {}),
    disabled_agents: [
      ...new Set([...(base.disabled_agents ?? []), ...(override.disabled_agents ?? [])]),
    ],
    disabled_mcps: [...new Set([...(base.disabled_mcps ?? []), ...(override.disabled_mcps ?? [])])],
    disabled_skills: [
      ...new Set([...(base.disabled_skills ?? []), ...(override.disabled_skills ?? [])]),
    ],
    disabled_hooks: [
      ...new Set([...(base.disabled_hooks ?? []), ...(override.disabled_hooks ?? [])]),
    ],
  };
}
