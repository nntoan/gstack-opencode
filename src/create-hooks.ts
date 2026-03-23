import type { GstackConfig } from './types/config.ts';
import type { Managers } from './create-managers.ts';

export function createHooks(_params: {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  managers: Managers;
}): Record<string, unknown> {
  return {};
}
