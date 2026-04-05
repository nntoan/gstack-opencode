import type { GstackConfig } from './types/config.ts';
import type { Managers } from './create-managers.ts';
import { createSprintTools } from './features/tools/index.ts';

export function createTools(params: {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  managers: Managers;
}): Record<string, unknown> {
  return createSprintTools({
    directory: params.ctx.directory,
    managers: params.managers,
  });
}
