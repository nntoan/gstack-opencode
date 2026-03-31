import { describe, it, expect } from 'vitest';
import { getDefaultInstallSelection, resolveAgentModelDefaults } from './model-defaults.ts';

describe('model-defaults', () => {
  it('returns deterministic ultimate fallback when no provider selected', () => {
    const selection = getDefaultInstallSelection();
    const defaults = resolveAgentModelDefaults(selection);

    expect(defaults.ceo).toBe('opencode/gpt-5-nano');
    expect(defaults.builder).toBe('opencode/gpt-5-nano');
    expect(defaults['session-manager']).toBe('opencode/gpt-5-nano');
  });

  it('prefers anthropic chain when claude plan exists', () => {
    const defaults = resolveAgentModelDefaults({
      ...getDefaultInstallSelection(),
      claudePlan: 'pro',
    });

    expect(defaults.ceo).toBe('anthropic/claude-opus-4-6');
    expect(defaults.builder).toBe('anthropic/claude-sonnet-4-6');
  });

  it('uses provider transform chain when anthropic unavailable', () => {
    const defaults = resolveAgentModelDefaults({
      ...getDefaultInstallSelection(),
      hasOpenAI: true,
      hasGemini: true,
    });

    expect(defaults.ceo).toBe('openai/gpt-5.4');
    expect(defaults.designer).toBe('google/gemini-3.1-pro-preview');
    expect(defaults['qa-lead']).toBe('openai/gpt-5.4');
  });

  it('applies GitHub Copilot transform for Claude 4.6 naming', () => {
    const defaults = resolveAgentModelDefaults({
      ...getDefaultInstallSelection(),
      hasCopilot: true,
    });

    expect(defaults.ceo).toBe('github-copilot/claude-opus-4.6');
    expect(defaults.builder).toBe('github-copilot/claude-sonnet-4.6');
  });
});
