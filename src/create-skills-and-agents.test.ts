import { describe, it, expect } from 'vitest';
import { createSkillsAndAgents } from './create-skills-and-agents.ts';
import { ROLE_FALLBACKS } from './cli/model-default-chains.ts';
import type { GstackConfig } from './types/config.ts';

function baseConfig(overrides: Partial<GstackConfig> = {}): GstackConfig {
  return {
    orchestration_mode: 'multi-agent',
    disabled_skills: [],
    disabled_agents: [],
    disabled_categories: [],
    disabled_mcps: [],
    disabled_hooks: [],
    backlog: { enabled: true, auto_create_tasks: true, auto_update_status: true },
    ...overrides,
  };
}

describe('createSkillsAndAgents', () => {
  it('applies provider-based defaults for agent models', () => {
    const { agents } = createSkillsAndAgents(
      baseConfig({
        install_selection: {
          claude_plan: 'max',
          has_openai: true,
        },
      })
    );

    const ceo = agents.find((agent) => agent.role === 'ceo');
    const builder = agents.find((agent) => agent.role === 'builder');

    expect(ceo?.model).toBe('anthropic/claude-opus-4-6');
    expect(builder?.model).toBe('anthropic/claude-sonnet-4-6');
  });

  it('allows explicit config.agents model override to win', () => {
    const { agents } = createSkillsAndAgents(
      baseConfig({
        install_selection: {
          has_openai: true,
        },
        agents: {
          builder: {
            model: 'custom/provider-model',
            instructions: 'custom instructions',
          },
        },
      })
    );

    const builder = agents.find((agent) => agent.role === 'builder');
    expect(builder?.model).toBe('custom/provider-model');
    expect(builder?.instructions).toBe('custom instructions');
  });
});

describe('Company default model contract', () => {
  it('resolves Company to github-copilot/gpt-5.4 when Copilot is available', () => {
    const { agents } = createSkillsAndAgents(
      baseConfig({
        install_selection: { has_copilot: true },
      })
    );

    const company = agents.find((a) => a.role === 'company');
    expect(company?.model).toBe('github-copilot/gpt-5.4');
  });

  it('Company fallback chain preserves medium variant intent', () => {
    const chain = ROLE_FALLBACKS['company'];
    const mediumEntry = chain.find((e) => e.variant === 'medium');
    expect(mediumEntry).toBeDefined();
    expect(mediumEntry?.variant).toBe('medium');
  });

  it('existing specialist defaults remain unchanged by Company chain addition', () => {
    const { agents } = createSkillsAndAgents(
      baseConfig({
        install_selection: { claude_plan: 'max', has_openai: true },
      })
    );

    const ceo = agents.find((a) => a.role === 'ceo');
    const builder = agents.find((a) => a.role === 'builder');
    const debugger_ = agents.find((a) => a.role === 'debugger');

    expect(ceo?.model).toBe('anthropic/claude-opus-4-6');
    expect(builder?.model).toBe('anthropic/claude-sonnet-4-6');
    expect(debugger_?.model).toBe('openai/gpt-5.4');
  });
});
