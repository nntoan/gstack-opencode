import { describe, it, expect } from 'vitest';
import { guardSkill } from './guard.ts';

describe('guardSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(guardSkill.name).toBe('guard');
    expect(guardSkill.group).toBe('safety');
    expect(guardSkill.originalSkillName).toBe('gstack-guard');
    expect(guardSkill.browserRequired).toBe(false);
    expect(guardSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no Claude Code or home-path references', () => {
    expect(guardSkill.template).not.toContain('$B');
    expect(guardSkill.template).not.toContain('~/.claude/');
    expect(guardSkill.template).not.toContain('~/.codex/');
    expect(guardSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(guardSkill.description.length).toBeGreaterThan(20);
  });
});
