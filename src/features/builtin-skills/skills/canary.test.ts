import { describe, it, expect } from 'vitest';
import { canarySkill } from './canary.ts';

describe('canarySkill', () => {
  it('has required GstackSkill fields', () => {
    expect(canarySkill.name).toBe('canary');
    expect(canarySkill.group).toBe('browser');
    expect(canarySkill.originalSkillName).toBe('gstack-canary');
    expect(canarySkill.browserRequired).toBe(true);
    expect(canarySkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(canarySkill.template).not.toContain('~/.claude/');
    expect(canarySkill.template).not.toContain('~/.codex/');
    expect(canarySkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(canarySkill.description.length).toBeGreaterThan(20);
  });

  it('contains canary monitoring workflow', () => {
    expect(canarySkill.template).toContain('CANARY ALERT');
    expect(canarySkill.template).toContain('HEALTHY');
  });

  it('references .gstack canary-reports path', () => {
    expect(canarySkill.template).toContain('.gstack/canary-reports');
  });

  it('references .gstack analytics path', () => {
    expect(canarySkill.template).toContain('.gstack/analytics');
  });

  it('uses inline slug detection', () => {
    expect(canarySkill.template).toContain('basename');
    expect(canarySkill.template).toContain('git rev-parse --show-toplevel');
  });

  it('does not contain old binary slug reference', () => {
    expect(canarySkill.template).not.toContain('gstack-slug');
  });
});
