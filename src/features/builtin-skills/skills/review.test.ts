import { describe, it, expect } from 'vitest';
import { reviewSkill } from './review.ts';

describe('reviewSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(reviewSkill.name).toBe('review');
    expect(reviewSkill.group).toBe('review');
    expect(reviewSkill.originalSkillName).toBe('gstack-review');
    expect(reviewSkill.browserRequired).toBe(false);
    expect(reviewSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(reviewSkill.template).not.toContain('~/.claude/');
    expect(reviewSkill.template).not.toContain('~/.codex/');
    expect(reviewSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(reviewSkill.description.length).toBeGreaterThan(20);
  });

  it('contains Fix-First review workflow', () => {
    expect(reviewSkill.template).toContain('Fix-First Review');
    expect(reviewSkill.template).toContain('AUTO-FIX');
    expect(reviewSkill.template).toContain('Scope Drift Detection');
  });
});
