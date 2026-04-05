import type { Plugin } from '@opencode-ai/plugin';

import { loadPluginConfig } from './plugin-config.ts';
import { log } from './shared/index.ts';
import { createManagers } from './create-managers.ts';
import { createSkillsAndAgents } from './create-skills-and-agents.ts';
import { createTools } from './create-tools.ts';
import { createHooks } from './create-hooks.ts';
import { createOrchestrator, DelegationStateManager } from './features/orchestrator/index.ts';
import { createPluginInterface } from './plugin-interface.ts';

const GstackPlugin: Plugin = async (ctx) => {
  log('[GstackPlugin] ENTRY - plugin loading', { directory: ctx.directory });

  const pluginConfig = loadPluginConfig(ctx.directory, ctx);
  const { skills, agents } = createSkillsAndAgents(pluginConfig);
  const managers = createManagers({ ctx, pluginConfig, skills, agents });
  const orchestrator = createOrchestrator({ agents, skills, config: pluginConfig });
  const delegationState = new DelegationStateManager();
  const toolsResult = createTools({ ctx, pluginConfig, managers });
  const hooks = createHooks({ ctx, pluginConfig, managers });

  return createPluginInterface({
    ctx,
    pluginConfig,
    managers,
    hooks,
    tools: toolsResult,
    orchestrator,
    delegationState,
    skills,
    agents,
  });
};

export default GstackPlugin;
