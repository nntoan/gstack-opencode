import { describe, it, expect } from 'vitest';
import { createConfigHandler } from './config-handler.ts';
import type { GstackConfig } from '../types/config.ts';
import type { GstackAgent } from '../types/agent.ts';

function makePluginConfig(overrides: Partial<GstackConfig> = {}): GstackConfig {
  return {
    orchestration_mode: 'multi-agent',
    disabled_agents: [],
    disabled_categories: [],
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

  it('in skills-only mode with default curated registration: host built-ins are suppressed and explicit overrides remain', async () => {
    const pluginConfig = makePluginConfig({
      orchestration_mode: 'skills-only',
      agents: { 'ceo-agent': { model: 'claude-opus-4' } },
    });
    const config: Record<string, unknown> = {
      agent: {
        build: { description: 'host build', prompt: 'host', mode: 'primary' },
        plan: { description: 'host plan', prompt: 'host', mode: 'primary' },
        reviewer: { description: 'external reviewer', prompt: 'external', mode: 'subagent' },
      },
    };
    const handler = createConfigHandler({ ctx: { directory: '/tmp' }, pluginConfig });
    await handler(config);

    const agents = config.agent as Record<string, unknown>;
    expect(agents?.build).toBeUndefined();
    expect(agents?.plan).toBeUndefined();
    expect(agents?.reviewer).toBeDefined();
    expect(agents?.['ceo-agent']).toMatchObject({ model: 'claude-opus-4' });
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

  it('curated mode suppresses host built-ins and keeps external plugin agents', async () => {
    const pluginConfig = makePluginConfig({
      agent_registration: {
        mode: 'curated',
        suppress_host_builtins: ['build', 'plan'],
      },
    });
    const config: Record<string, unknown> = {
      agent: {
        build: { description: 'host build', prompt: 'host', mode: 'primary' },
        plan: { description: 'host plan', prompt: 'host', mode: 'primary' },
        reviewer: { description: 'external reviewer', prompt: 'external', mode: 'subagent' },
      },
    };

    const handler = createConfigHandler({
      ctx: { directory: '/tmp' },
      pluginConfig,
      agents: sampleAgents,
    });
    await handler(config);

    const agents = config.agent as Record<string, unknown>;
    expect(agents.build).toBeUndefined();
    expect(agents.plan).toBeUndefined();
    expect(agents.reviewer).toMatchObject({ description: 'external reviewer' });
    expect(agents.ceo).toBeDefined();
    expect(agents.builder).toBeDefined();
  });

  it('replace mode keeps only gstack agent registry output', async () => {
    const pluginConfig = makePluginConfig({
      agent_registration: {
        mode: 'replace',
        suppress_host_builtins: ['build', 'plan'],
      },
    });
    const config: Record<string, unknown> = {
      agent: {
        reviewer: { description: 'external reviewer', prompt: 'external', mode: 'subagent' },
      },
    };

    const handler = createConfigHandler({
      ctx: { directory: '/tmp' },
      pluginConfig,
      agents: sampleAgents,
    });
    await handler(config);

    const agents = config.agent as Record<string, unknown>;
    expect(agents.reviewer).toBeUndefined();
    expect(Object.keys(agents).sort()).toEqual(['builder', 'ceo']);
  });

  it('applies categories and runtime_fallback config', async () => {
    const pluginConfig = makePluginConfig({
      categories: {
        quick: { model: 'opencode/gpt-5-nano' },
        deep: { model: 'openai/gpt-5.3-codex' },
      },
      disabled_categories: ['deep'],
      runtime_fallback: {
        enabled: true,
        max_fallback_attempts: 4,
      },
    });
    const config: Record<string, unknown> = {
      categories: {
        writing: { model: 'kimi-for-coding/k2p5' },
      },
      runtime_fallback: {
        timeout_seconds: 30,
      },
    };

    const handler = createConfigHandler({
      ctx: { directory: '/tmp' },
      pluginConfig,
      agents: sampleAgents,
    });
    await handler(config);

    expect(config.categories).toMatchObject({
      writing: { model: 'kimi-for-coding/k2p5' },
      quick: { model: 'opencode/gpt-5-nano' },
    });
    expect((config.categories as Record<string, unknown>).deep).toBeUndefined();
    expect(config.runtime_fallback).toMatchObject({
      timeout_seconds: 30,
      enabled: true,
      max_fallback_attempts: 4,
    });
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

  describe('#company-mode host projection', () => {
    const specialistAgents: GstackAgent[] = [
      {
        role: 'company',
        name: 'The Company',
        description: 'Company orchestrator',
        sprintPhase: 'cross-cutting',
        skills: [],
        instructions: 'Company instructions',
      },
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
      },
    ];

    it('when agent_surface.mode is company, host-visible config.agent contains only company from built-in registry', async () => {
      const pluginConfig = makePluginConfig({
        orchestration_mode: 'multi-agent',
        agent_surface: { mode: 'company' },
      });
      const config: Record<string, unknown> = {};
      const handler = createConfigHandler({
        ctx: { directory: '/tmp' },
        pluginConfig,
        agents: specialistAgents,
      });
      await handler(config);

      const agents = config.agent as Record<string, unknown>;
      expect(agents).toBeDefined();
      expect(agents.company).toBeDefined();
    });

    it('company mode does not publish specialist agents such as ceo or builder from built-in registry', async () => {
      const pluginConfig = makePluginConfig({
        orchestration_mode: 'multi-agent',
        agent_surface: { mode: 'company' },
      });
      const config: Record<string, unknown> = {};
      const handler = createConfigHandler({
        ctx: { directory: '/tmp' },
        pluginConfig,
        agents: specialistAgents,
      });
      await handler(config);

      const agents = config.agent as Record<string, unknown>;
      expect(agents.ceo).toBeUndefined();
      expect(agents.builder).toBeUndefined();
    });

    it('host built-ins and non-agent config handling remain consistent with registration-mode rules in company mode', async () => {
      const pluginConfig = makePluginConfig({
        orchestration_mode: 'multi-agent',
        agent_surface: { mode: 'company' },
        categories: { quick: { model: 'opencode/gpt-5-nano' } },
        runtime_fallback: { enabled: true },
      });
      const config: Record<string, unknown> = {};
      const handler = createConfigHandler({
        ctx: { directory: '/tmp' },
        pluginConfig,
        agents: specialistAgents,
      });
      await handler(config);

      expect((config.categories as Record<string, unknown>)?.quick).toMatchObject({
        model: 'opencode/gpt-5-nano',
      });
      expect(config.runtime_fallback).toMatchObject({ enabled: true });
    });
  });
});
