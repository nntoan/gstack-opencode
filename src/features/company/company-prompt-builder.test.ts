import { describe, expect, it } from 'vitest';
import { buildCompanySystemPrompt } from './company-prompt-builder.ts';

describe('buildCompanySystemPrompt', () => {
  it('renders the company header and rejects hidden specialist role names', () => {
    const prompt = buildCompanySystemPrompt({
      phase: 'build',
      skills: [],
      specialistInstructions: 'You are Builder and must act like builder support.',
    });

    expect(prompt).toContain('## The Company — Active Context');
    expect(prompt).not.toContain('builder');
    expect(prompt).not.toContain('qa-lead');
    expect(prompt).not.toContain('ceo');
  });

  it('renders skills as one-line capability summaries instead of raw skill blocks', () => {
    const prompt = buildCompanySystemPrompt({
      phase: 'build',
      skills: [
        { name: 'implement', description: 'Ship the implementation safely.' },
        { name: 'review', description: 'Check the change before shipping.' },
      ],
    });

    expect(prompt).toContain('### Available Capabilities');
    expect(prompt).toContain('- **/implement**: Ship the implementation safely.');
    expect(prompt).toContain('- **/review**: Check the change before shipping.');
    expect(prompt).not.toContain('#### /implement');
  });

  it('does not leak raw reasoning strings such as fallback to builder', () => {
    const prompt = buildCompanySystemPrompt({
      phase: 'build',
      skills: [],
      runtimeSummary: 'Ready to continue safely.',
      specialistInstructions: 'fallback to builder if needed',
    });

    expect(prompt).toContain('**Status:** Ready to continue safely.');
    expect(prompt).not.toContain('fallback to builder');
    expect(prompt).toContain('fallback to specialist if needed');
  });

  it('sanitizes persona labels from embedded instruction text', () => {
    const prompt = buildCompanySystemPrompt({
      phase: 'review',
      skills: [],
      specialistInstructions: 'Role: qa-lead\nAgent: reviewer\nYou are CEO now',
    });

    expect(prompt).toContain('### Execution Guidance');
    expect(prompt).not.toContain('Role:');
    expect(prompt).not.toContain('Agent:');
    expect(prompt).not.toContain('qa-lead');
    expect(prompt).not.toContain('reviewer');
    expect(prompt).not.toContain('CEO');
    expect(prompt).toContain('specialist');
  });
});
