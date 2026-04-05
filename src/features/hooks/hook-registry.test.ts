import { describe, it, expect, beforeEach } from 'bun:test';
import { createHookRegistry } from './hook-registry.ts';
import type { HookDefinition, HookRegistry } from '../../types/hooks.ts';

describe('createHookRegistry', () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = createHookRegistry();
  });

  it('dispatch with no handlers is a no-op', async () => {
    await expect(
      registry.dispatch('tool.execute.after', { tool: 'bash' }, { output: 'result' })
    ).resolves.toBeUndefined();
  });

  it('getHandlerCount returns 0 for unregistered events', () => {
    expect(registry.getHandlerCount('tool.execute.after')).toBe(0);
    expect(registry.getHandlerCount('system.transform')).toBe(0);
  });

  it('register a handler, dispatch fires it', async () => {
    let fired = false;
    const hook: HookDefinition = {
      name: 'test-hook',
      event: 'tool.execute.after',
      handler: async (_input, _output) => {
        fired = true;
      },
    };
    registry.register(hook);
    await registry.dispatch('tool.execute.after', { tool: 'bash' }, { output: '' });
    expect(fired).toBe(true);
  });

  it('getHandlerCount returns correct count after registering', () => {
    const hook: HookDefinition = {
      name: 'hook-1',
      event: 'system.transform',
      handler: async () => {},
    };
    registry.register(hook);
    expect(registry.getHandlerCount('system.transform')).toBe(1);

    registry.register({ ...hook, name: 'hook-2' });
    expect(registry.getHandlerCount('system.transform')).toBe(2);
  });

  it('dispatch with toolFilter only fires for matching tools', async () => {
    const firedTools: string[] = [];
    const hook: HookDefinition = {
      name: 'filtered-hook',
      event: 'tool.execute.after',
      toolFilter: ['grep', 'Grep'],
      handler: async (input, _output) => {
        firedTools.push((input as { tool: string }).tool);
      },
    };
    registry.register(hook);

    await registry.dispatch('tool.execute.after', { tool: 'grep' }, { output: '' });
    await registry.dispatch('tool.execute.after', { tool: 'bash' }, { output: '' });
    await registry.dispatch('tool.execute.after', { tool: 'Grep' }, { output: '' });

    expect(firedTools).toEqual(['grep', 'Grep']);
  });

  it('dispatch with string toolFilter only fires for matching tool', async () => {
    let fired = false;
    const hook: HookDefinition = {
      name: 'string-filter-hook',
      event: 'tool.execute.after',
      toolFilter: 'bash',
      handler: async () => {
        fired = true;
      },
    };
    registry.register(hook);

    await registry.dispatch('tool.execute.after', { tool: 'grep' }, { output: '' });
    expect(fired).toBe(false);

    await registry.dispatch('tool.execute.after', { tool: 'bash' }, { output: '' });
    expect(fired).toBe(true);
  });

  it('dispatch runs handlers sequentially, order matters', async () => {
    const order: number[] = [];
    registry.register({
      name: 'first',
      event: 'system.transform',
      handler: async (_input, output) => {
        order.push(1);
        (output as { system: string[] }).system.push('first');
      },
    });
    registry.register({
      name: 'second',
      event: 'system.transform',
      handler: async (_input, output) => {
        order.push(2);
        (output as { system: string[] }).system.push('second');
      },
    });

    const output = { system: [] as string[] };
    await registry.dispatch('system.transform', {}, output);

    expect(order).toEqual([1, 2]);
    expect(output.system).toEqual(['first', 'second']);
  });

  it('handler error is caught and logged, does not break other handlers', async () => {
    let secondFired = false;
    registry.register({
      name: 'failing-hook',
      event: 'tool.execute.after',
      handler: async () => {
        throw new Error('intentional test error');
      },
    });
    registry.register({
      name: 'succeeding-hook',
      event: 'tool.execute.after',
      handler: async () => {
        secondFired = true;
      },
    });

    await expect(
      registry.dispatch('tool.execute.after', { tool: 'bash' }, { output: '' })
    ).resolves.toBeUndefined();
    expect(secondFired).toBe(true);
  });

  it('handlers without toolFilter fire for any tool', async () => {
    const tools: string[] = [];
    registry.register({
      name: 'no-filter',
      event: 'tool.execute.after',
      handler: async (input) => {
        tools.push((input as { tool: string }).tool);
      },
    });

    await registry.dispatch('tool.execute.after', { tool: 'bash' }, {});
    await registry.dispatch('tool.execute.after', { tool: 'grep' }, {});
    await registry.dispatch('tool.execute.after', { tool: 'read' }, {});

    expect(tools).toEqual(['bash', 'grep', 'read']);
  });

  it('dispatch does not apply toolFilter for non-tool events', async () => {
    let fired = false;
    registry.register({
      name: 'system-hook',
      event: 'system.transform',
      toolFilter: 'bash',
      handler: async () => {
        fired = true;
      },
    });

    await registry.dispatch('system.transform', {}, { system: [] });
    expect(fired).toBe(true);
  });
});
