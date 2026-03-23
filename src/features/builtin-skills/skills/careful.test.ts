import { describe, it, expect } from 'vitest';
import { carefulSkill } from './careful.ts';

describe('carefulSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(carefulSkill.name).toBe('careful');
    expect(carefulSkill.group).toBe('safety');
    expect(carefulSkill.originalSkillName).toBe('gstack-careful');
    expect(carefulSkill.browserRequired).toBe(false);
    expect(carefulSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no Claude Code or home-path references', () => {
    expect(carefulSkill.template).not.toContain('$B');
    expect(carefulSkill.template).not.toContain('~/.claude/');
    expect(carefulSkill.template).not.toContain('~/.codex/');
    expect(carefulSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(carefulSkill.description.length).toBeGreaterThan(20);
  });
});
