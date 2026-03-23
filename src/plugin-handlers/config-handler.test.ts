import { describe, it, expect } from 'vitest';
import { createConfigHandler } from './config-handler.ts';
import type { GstackConfig } from '../types/config.ts';

function makePluginConfig(overrides: Partial<GstackConfig> = {}): GstackConfig {
  return {
    orchestration_mode: 'multi-agent',
    disabled_agents: [],
    disabled_skills: [],
    disabled_mcps: [],
    disabled_hooks: [],
    backlog: { enabled: true, auto_create_tasks: true, auto_update_status: true },
    ...overrides,
  };
}

describe('createConfigHandler', () => {
  it('returns a function', () => {
    const handler = createConfigHandler({
      ctx: { directory: '/tmp/test' },
      pluginConfig: makePluginConfig(),
    });
    expect(typeof handler).toBe('function');
  });

  it('returns an async function', async () => {
    const handler = createConfigHandler({
      ctx: { directory: '/tmp/test' },
      pluginConfig: makePluginConfig(),
    });
    const result = handler({});
    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  it('in multi-agent mode: agent overrides from pluginConfig are applied', async () => {
    const pluginConfig = makePluginConfig({
      orchestration_mode: 'multi-agent',
      agents: { 'ceo-agent': { model: 'claude-opus-4', enabled: true } },
    });
    const config: Record<string, unknown> = {};
    const handler = createConfigHandler({ ctx: { directory: '/tmp' }, pluginConfig });
    await handler(config);

    const agents = config.agents as Record<string, unknown>;
    expect(agents).toBeDefined();
    expect(agents['ceo-agent']).toMatchObject({ model: 'claude-opus-4', enabled: true });
  });

  it('in skills-only mode: agents are NOT registered', async () => {
    const pluginConfig = makePluginConfig({
      orchestration_mode: 'skills-only',
      agents: { 'ceo-agent': { model: 'claude-opus-4' } },
    });
    const config: Record<string, unknown> = {};
    const handler = createConfigHandler({ ctx: { directory: '/tmp' }, pluginConfig });
    await handler(config);

    const agents = config.agents as Record<string, unknown> | undefined;
    expect(agents?.['ceo-agent']).toBeUndefined();
  });

  it('disabled_agents are skipped', async () => {
    const pluginConfig = makePluginConfig({
      orchestration_mode: 'multi-agent',
      disabled_agents: ['ceo-agent'],
      agents: {
        'ceo-agent': { model: 'claude-opus-4' },
        'builder-agent': { model: 'gpt-4' },
      },
    });
    const config: Record<string, unknown> = {};
    const handler = createConfigHandler({ ctx: { directory: '/tmp' }, pluginConfig });
    await handler(config);

    const agents = config.agents as Record<string, unknown>;
    expect(agents?.['ceo-agent']).toBeUndefined();
    expect(agents?.['builder-agent']).toBeDefined();
  });

  it('disabled_mcps are excluded via applyMcpConfig integration', async () => {
    const pluginConfig = makePluginConfig({
      disabled_mcps: ['websearch'],
    });
    const config: Record<string, unknown> = {};
    const handler = createConfigHandler({ ctx: { directory: '/tmp' }, pluginConfig });
    await handler(config);

    const mcp = config.mcp as Record<string, unknown>;
    expect(mcp).toBeDefined();
    expect('websearch' in mcp).toBe(false);
    expect('context7' in mcp).toBe(true);
  });
});
