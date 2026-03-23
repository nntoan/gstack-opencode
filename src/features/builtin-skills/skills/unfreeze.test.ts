import { describe, it, expect } from 'vitest';
import { unfreezeSkill } from './unfreeze.ts';

describe('unfreezeSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(unfreezeSkill.name).toBe('unfreeze');
    expect(unfreezeSkill.group).toBe('safety');
    expect(unfreezeSkill.originalSkillName).toBe('gstack-unfreeze');
    expect(unfreezeSkill.browserRequired).toBe(false);
    expect(unfreezeSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no Claude Code or home-path references', () => {
    expect(unfreezeSkill.template).not.toContain('$B');
    expect(unfreezeSkill.template).not.toContain('~/.claude/');
    expect(unfreezeSkill.template).not.toContain('~/.codex/');
    expect(unfreezeSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(unfreezeSkill.description.length).toBeGreaterThan(20);
  });
});
