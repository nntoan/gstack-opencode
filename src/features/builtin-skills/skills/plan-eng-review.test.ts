import { describe, it, expect } from 'vitest';
import { planEngReviewSkill } from './plan-eng-review.ts';

describe('planEngReviewSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(planEngReviewSkill.name).toBe('plan-eng-review');
    expect(planEngReviewSkill.group).toBe('planning');
    expect(planEngReviewSkill.originalSkillName).toBe('gstack-plan-eng-review');
    expect(planEngReviewSkill.browserRequired).toBe(false);
    expect(planEngReviewSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(planEngReviewSkill.template).not.toContain('~/.claude/');
    expect(planEngReviewSkill.template).not.toContain('~/.codex/');
    expect(planEngReviewSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(planEngReviewSkill.description.length).toBeGreaterThan(20);
  });

  it('uses adapted project-relative paths', () => {
    expect(planEngReviewSkill.template).toContain('.gstack/design-docs');
    expect(planEngReviewSkill.template).toContain('.gstack/analytics');
  });
});
