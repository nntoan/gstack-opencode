import { describe, it, expect } from 'vitest';
import { codexSkill } from './codex.ts';

describe('codexSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(codexSkill.name).toBe('codex');
    expect(codexSkill.group).toBe('review');
    expect(codexSkill.originalSkillName).toBe('gstack');
    expect(codexSkill.browserRequired).toBe(true);
    expect(codexSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(codexSkill.template).not.toContain('~/.claude/');
    expect(codexSkill.template).not.toContain('~/.codex/');
    expect(codexSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(codexSkill.description.length).toBeGreaterThan(20);
  });

  it('is marked as browser-required', () => {
    expect(codexSkill.browserRequired).toBe(true);
  });

  it('contains browse command reference content', () => {
    expect(codexSkill.template).toContain('goto');
    expect(codexSkill.template).toContain('screenshot');
    expect(codexSkill.template).toContain('snapshot');
  });

  // NOTE: do NOT check not.toContain('$B') — $B is intentionally kept in this skill
});
