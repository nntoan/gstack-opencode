import { describe, expect, it } from 'vitest';
import { classifyIntent, extractExplicitSkillName } from './intent-classifier.ts';
import { PHASE_PATTERNS, PHASE_TO_DEFAULT_AGENT, SKILL_TO_PHASE_MAP } from './intent-patterns.ts';

describe('extractExplicitSkillName', () => {
  it('extracts skill name from slash command', () => {
    expect(extractExplicitSkillName('/qa https://example.com')).toBe('qa');
  });

  it('returns null when no leading slash skill', () => {
    expect(extractExplicitSkillName('please run qa')).toBeNull();
  });
});

describe('classifyIntent', () => {
  it('returns disabled classification for skills-only mode', () => {
    expect(classifyIntent('please test this', { orchestrationMode: 'skills-only' })).toEqual({
      phase: 'build',
      confidence: 0,
      suggestedAgent: 'builder',
      suggestedSkills: [],
      reasoning: 'Orchestration disabled',
    });
  });

  it('classifies explicit skill command with full confidence', () => {
    const result = classifyIntent('/qa investigate this flaky test', {
      orchestrationMode: 'multi-agent',
    });
    expect(result.phase).toBe('test');
    expect(result.confidence).toBe(1);
    expect(result.suggestedAgent).toBe('qa-lead');
    expect(result.suggestedSkills).toContain('qa');
    expect(result.reasoning).toContain('Explicit skill');
  });

  it('classifies single-phase pattern matches with high confidence band', () => {
    const result = classifyIntent('Please test benchmark and verify this bug in browse flow', {
      orchestrationMode: 'multi-agent',
    });
    expect(result.phase).toBe('test');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.confidence).toBeLessThanOrEqual(0.9);
    expect(result.suggestedAgent).toBe('qa-lead');
  });

  it('classifies tied multi-phase matches with lower confidence band', () => {
    const result = classifyIntent('plan and design while we also review and check details', {
      orchestrationMode: 'multi-agent',
    });
    expect(['plan', 'review']).toContain(result.phase);
    expect(result.confidence).toBeGreaterThanOrEqual(0.3);
    expect(result.confidence).toBeLessThanOrEqual(0.6);
  });

  it('falls back to build phase when no pattern matches and input is not a question', () => {
    const result = classifyIntent('hello team', { orchestrationMode: 'multi-agent' });
    expect(result).toMatchObject({
      phase: 'build',
      confidence: 0.2,
      suggestedAgent: 'builder',
      reasoning: 'No strong pattern match, defaulting to build',
    });
  });

  it('falls back to think phase when no pattern matches and input is a question', () => {
    // "Is this a good name?" has no phase-pattern keywords → question detection kicks in
    const result = classifyIntent('Is this a good name?', { orchestrationMode: 'multi-agent' });
    expect(result).toMatchObject({
      phase: 'think',
      confidence: 0.4,
      suggestedAgent: 'ceo',
      reasoning: 'Question detected, defaulting to think phase',
    });
  });

  it('falls back to think phase for how/should/can questions with no pattern match', () => {
    const noMatch = classifyIntent('should I do it', { orchestrationMode: 'multi-agent' });
    expect(noMatch.phase).toBe('think');
    expect(noMatch.suggestedAgent).toBe('ceo');
    const canResult = classifyIntent('can you help me understand this', {
      orchestrationMode: 'multi-agent',
    });
    expect(canResult.phase).toBe('think');
  });
});

describe('orchestrator mappings', () => {
  it('maps all 25 builtin skills to a sprint phase', () => {
    expect(Object.keys(SKILL_TO_PHASE_MAP)).toHaveLength(25);
  });

  it('contains phase patterns for all sprint phases', () => {
    expect(PHASE_PATTERNS.size).toBe(9);
  });

  it('contains default agent for all sprint phases', () => {
    expect(Object.keys(PHASE_TO_DEFAULT_AGENT).sort()).toEqual([
      'build',
      'cross-cutting',
      'plan',
      'reflect',
      'review',
      'ship',
      'test',
      'think',
      'utility',
    ]);
    expect(PHASE_TO_DEFAULT_AGENT.plan).toBe('eng-manager');
  });
});
