import { describe, it, expect } from 'vitest';
import { designReviewSkill } from './design-review.ts';

describe('designReviewSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(designReviewSkill.name).toBe('design-review');
    expect(designReviewSkill.group).toBe('browser');
    expect(designReviewSkill.originalSkillName).toBe('gstack-design-review');
    expect(designReviewSkill.browserRequired).toBe(true);
    expect(designReviewSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(designReviewSkill.template).not.toContain('~/.claude/');
    expect(designReviewSkill.template).not.toContain('~/.codex/');
    expect(designReviewSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(designReviewSkill.description.length).toBeGreaterThan(20);
  });

  it('contains AI Slop Detection checklist', () => {
    expect(designReviewSkill.template).toContain('AI Slop Detection');
  });

  it('contains Design Score dual headline scoring', () => {
    expect(designReviewSkill.template).toContain('Design Score');
  });

  it('references .gstack design-reports path', () => {
    expect(designReviewSkill.template).toContain('.gstack/design-reports');
  });

  it('references .gstack analytics path', () => {
    expect(designReviewSkill.template).toContain('.gstack/analytics');
  });

  it('contains FINDING-NNN commit format', () => {
    expect(designReviewSkill.template).toContain('FINDING-NNN');
  });

  it('does not contain old binary slug reference', () => {
    expect(designReviewSkill.template).not.toContain('gstack-slug');
  });

  it('references .gstack projects path for cross-session context', () => {
    expect(designReviewSkill.template).toContain('.gstack/design-docs');
  });
});
