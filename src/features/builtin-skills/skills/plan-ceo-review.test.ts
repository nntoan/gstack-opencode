import { describe, it, expect } from 'vitest';
import { planCeoReviewSkill } from './plan-ceo-review.ts';

describe('planCeoReviewSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(planCeoReviewSkill.name).toBe('plan-ceo-review');
    expect(planCeoReviewSkill.group).toBe('planning');
    expect(planCeoReviewSkill.originalSkillName).toBe('gstack-plan-ceo-review');
    expect(planCeoReviewSkill.browserRequired).toBe(false);
    expect(planCeoReviewSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(planCeoReviewSkill.template).not.toContain('~/.claude/');
    expect(planCeoReviewSkill.template).not.toContain('~/.codex/');
    expect(planCeoReviewSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(planCeoReviewSkill.description.length).toBeGreaterThan(20);
  });
});
