import { describe, it, expect } from 'vitest';
import { createConfigHandler } from './config-handler.ts';
import type { GstackConfig } from '../types/config.ts';
import type { GstackAgent } from '../types/agent.ts';

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
  const sampleAgents: GstackAgent[] = [
    {
      role: 'ceo',
      name: 'CEO',
      description: 'CEO agent',
      sprintPhase: 'think',
      skills: [],
      instructions: 'CEO instructions',
    },
    {
      role: 'builder',
      name: 'Builder',
      description: 'Builder agent',
      sprintPhase: 'build',
      skills: [],
      instructions: 'Builder instructions',
      model: 'model-builder',
    },
  ];

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
    const handler = createConfigHandler({
      ctx: { directory: '/tmp' },
      pluginConfig,
      agents: sampleAgents,
    });
    await handler(config);

    const agents = config.agent as Record<string, unknown>;
    expect(agents).toBeDefined();
    expect(agents['ceo-agent']).toMatchObject({ model: 'claude-opus-4', enabled: true });
    expect(agents.ceo).toMatchObject({
      description: 'CEO agent',
      prompt: 'CEO instructions',
      mode: 'all',
    });
    expect(agents.builder).toMatchObject({
      description: 'Builder agent',
      prompt: 'Builder instructions',
      mode: 'all',
      model: 'model-builder',
    });
  });

  it('in skills-only mode: agents are NOT registered', async () => {
    const pluginConfig = makePluginConfig({
      orchestration_mode: 'skills-only',
      agents: { 'ceo-agent': { model: 'claude-opus-4' } },
    });
    const config: Record<string, unknown> = {};
    const handler = createConfigHandler({ ctx: { directory: '/tmp' }, pluginConfig });
    await handler(config);

    const agents = config.agent as Record<string, unknown> | undefined;
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
    const handler = createConfigHandler({
      ctx: { directory: '/tmp' },
      pluginConfig,
      agents: sampleAgents,
    });
    await handler(config);

    const agents = config.agent as Record<string, unknown>;
    expect(agents?.['ceo-agent']).toBeUndefined();
    expect(agents?.['builder-agent']).toBeDefined();
    expect(agents.builder).toBeDefined();
  });

  it('supports legacy existing config.agents input by normalizing into config.agent', async () => {
    const pluginConfig = makePluginConfig();
    const config: Record<string, unknown> = {
      agents: {
        legacy: { description: 'legacy desc', prompt: 'legacy prompt', mode: 'all' },
      },
    };
    const handler = createConfigHandler({
      ctx: { directory: '/tmp' },
      pluginConfig,
      agents: sampleAgents,
    });
    await handler(config);

    const normalized = config.agent as Record<string, unknown>;
    expect(normalized.legacy).toMatchObject({
      description: 'legacy desc',
      prompt: 'legacy prompt',
      mode: 'all',
    });
    expect(normalized.ceo).toBeDefined();
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
