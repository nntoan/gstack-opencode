import type { HookDefinition, HookEventName, HookRegistry } from '../../types/hooks.ts';
import { log } from '../../shared/logger.ts';

type StoredHook = HookDefinition;

export function createHookRegistry(): HookRegistry {
  const handlers = new Map<HookEventName, StoredHook[]>();

  function register(hook: HookDefinition): void {
    const existing = handlers.get(hook.event) ?? [];
    existing.push(hook);
    handlers.set(hook.event, existing);
  }

  function matchesTool(hook: StoredHook, tool: string): boolean {
    if (!hook.toolFilter) return true;
    if (Array.isArray(hook.toolFilter)) return hook.toolFilter.includes(tool);
    return hook.toolFilter === tool;
  }

  async function dispatch(event: HookEventName, input: unknown, output: unknown): Promise<void> {
    const registered = handlers.get(event);
    if (!registered || registered.length === 0) return;

    const inputWithTool = input as { tool?: string };

    for (const hook of registered) {
      const isTool = event === 'tool.execute.before' || event === 'tool.execute.after';
      if (isTool && inputWithTool.tool !== undefined && !matchesTool(hook, inputWithTool.tool)) {
        continue;
      }

      try {
        await hook.handler(input, output);
      } catch (err: unknown) {
        log('[ERROR] hook handler failed', {
          hookName: hook.name,
          event,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  function getHandlerCount(event: HookEventName): number {
    return handlers.get(event)?.length ?? 0;
  }

  return { register, dispatch, getHandlerCount };
}
