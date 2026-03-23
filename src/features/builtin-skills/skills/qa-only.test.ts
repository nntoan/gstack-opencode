import { describe, it, expect } from 'vitest';
import { qaOnlySkill } from './qa-only.ts';

describe('qaOnlySkill', () => {
  it('has required GstackSkill fields', () => {
    expect(qaOnlySkill.name).toBe('qa-only');
    expect(qaOnlySkill.group).toBe('browser');
    expect(qaOnlySkill.originalSkillName).toBe('gstack-qa-only');
    expect(qaOnlySkill.browserRequired).toBe(true);
    expect(qaOnlySkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(qaOnlySkill.template).not.toContain('~/.claude/');
    expect(qaOnlySkill.template).not.toContain('~/.codex/');
    expect(qaOnlySkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(qaOnlySkill.description.length).toBeGreaterThan(20);
  });

  it('contains report-only QA workflow', () => {
    expect(qaOnlySkill.template).toContain('NEVER fix');
    expect(qaOnlySkill.template).toContain('Health Score');
  });

  it('references .gstack qa-reports path', () => {
    expect(qaOnlySkill.template).toContain('.gstack/qa-reports');
  });

  it('references .gstack analytics path', () => {
    expect(qaOnlySkill.template).toContain('.gstack/analytics');
  });

  it('uses inline slug detection', () => {
    expect(qaOnlySkill.template).toContain('basename');
    expect(qaOnlySkill.template).toContain('git rev-parse --show-toplevel');
  });

  it('does not contain old binary slug reference', () => {
    expect(qaOnlySkill.template).not.toContain('gstack-slug');
  });
});
