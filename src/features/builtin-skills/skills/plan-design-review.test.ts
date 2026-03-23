import { describe, it, expect } from 'vitest';
import { planDesignReviewSkill } from './plan-design-review.ts';

describe('planDesignReviewSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(planDesignReviewSkill.name).toBe('plan-design-review');
    expect(planDesignReviewSkill.group).toBe('planning');
    expect(planDesignReviewSkill.originalSkillName).toBe('gstack-plan-design-review');
    expect(planDesignReviewSkill.browserRequired).toBe(false);
    expect(planDesignReviewSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(planDesignReviewSkill.template).not.toContain('~/.claude/');
    expect(planDesignReviewSkill.template).not.toContain('~/.codex/');
    expect(planDesignReviewSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(planDesignReviewSkill.description.length).toBeGreaterThan(20);
  });

  it('contains the 7 design pass structure', () => {
    expect(planDesignReviewSkill.template).toContain('Pass 1: Information Architecture');
    expect(planDesignReviewSkill.template).toContain('Pass 4: AI Slop Risk');
    expect(planDesignReviewSkill.template).toContain('Pass 7: Unresolved Design Decisions');
  });
});
