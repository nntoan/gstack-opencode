import { describe, it, expect } from 'vitest';
import type { GstackConfig } from '../types/config.ts';
import { mergeConfigs } from './merge-configs.ts';

function createBaseConfig(): GstackConfig {
  return {
    orchestration_mode: 'multi-agent',
    disabled_skills: ['skill-base'],
    disabled_agents: ['agent-base'],
    disabled_mcps: ['mcp-base'],
    disabled_hooks: ['hook-base'],
    agents: {
      sisyphus: {
        model: 'base-model',
        instructions: 'base instructions',
      },
    },
    mcp: {
      websearch: {
        enabled: true,
      },
    },
    backlog: {
      enabled: true,
      auto_create_tasks: true,
      auto_update_status: true,
    },
  };
}

describe('mergeConfigs', () => {
  it('merges agents and mcp deeply while preserving base values', () => {
    const base = createBaseConfig();

    const result = mergeConfigs(base, {
      agents: {
        sisyphus: {
          model: 'override-model',
        },
        hephaestus: {
          enabled: false,
        },
      },
      mcp: {
        websearch: {
          enabled: false,
        },
      },
    });

    expect(result.agents?.sisyphus.model).toBe('override-model');
    expect(result.agents?.sisyphus.instructions).toBe('base instructions');
    expect(result.agents?.hephaestus.enabled).toBe(false);
    expect(result.mcp?.websearch?.enabled).toBe(false);
  });

  it('set-unions all disabled_* arrays', () => {
    const base = createBaseConfig();

    const result = mergeConfigs(base, {
      disabled_skills: ['skill-base', 'skill-project'],
      disabled_agents: ['agent-project', 'agent-base'],
      disabled_mcps: ['mcp-project', 'mcp-base'],
      disabled_hooks: ['hook-project', 'hook-base'],
    });

    expect(result.disabled_skills).toEqual(['skill-base', 'skill-project']);
    expect(result.disabled_agents).toEqual(['agent-base', 'agent-project']);
    expect(result.disabled_mcps).toEqual(['mcp-base', 'mcp-project']);
    expect(result.disabled_hooks).toEqual(['hook-base', 'hook-project']);
  });

  it('applies top-level project override values', () => {
    const base = createBaseConfig();

    const result = mergeConfigs(base, {
      orchestration_mode: 'skills-only',
      backlog: {
        enabled: false,
        auto_create_tasks: false,
        auto_update_status: false,
      },
    });

    expect(result.orchestration_mode).toBe('skills-only');
    expect(result.backlog.enabled).toBe(false);
    expect(result.backlog.auto_create_tasks).toBe(false);
    expect(result.backlog.auto_update_status).toBe(false);
  });
});
