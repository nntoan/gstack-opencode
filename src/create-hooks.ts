import type { GstackConfig } from './types/config.ts';
import type { Managers } from './create-managers.ts';
import type { HookRegistry } from './types/hooks.ts';
import {
  createHookRegistry,
  createToolOutputTruncator,
  createAgentsMdInjector,
} from './features/hooks/index.ts';

export function createHooks(params: {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  managers: Managers;
}): HookRegistry {
  const registry = createHookRegistry();
  registry.register(createToolOutputTruncator());
  registry.register(
    createAgentsMdInjector({ orchestrationMode: params.pluginConfig.orchestration_mode })
  );
  void params.ctx;
  void params.managers;
  return registry;
}
