import { describe, it, expect } from 'vitest';
import { freezeSkill } from './freeze.ts';

describe('freezeSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(freezeSkill.name).toBe('freeze');
    expect(freezeSkill.group).toBe('safety');
    expect(freezeSkill.originalSkillName).toBe('gstack-freeze');
    expect(freezeSkill.browserRequired).toBe(false);
    expect(freezeSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no Claude Code or home-path references', () => {
    expect(freezeSkill.template).not.toContain('$B');
    expect(freezeSkill.template).not.toContain('~/.claude/');
    expect(freezeSkill.template).not.toContain('~/.codex/');
    expect(freezeSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(freezeSkill.description.length).toBeGreaterThan(20);
  });
});
