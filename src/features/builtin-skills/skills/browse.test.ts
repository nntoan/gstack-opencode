import { describe, it, expect } from 'vitest';
import { browseSkill } from './browse.ts';

describe('browseSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(browseSkill.name).toBe('browse');
    expect(browseSkill.group).toBe('browser');
    expect(browseSkill.originalSkillName).toBe('gstack-browse');
    expect(browseSkill.browserRequired).toBe(true);
    expect(browseSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(browseSkill.template).not.toContain('~/.claude/');
    expect(browseSkill.template).not.toContain('~/.codex/');
    expect(browseSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(browseSkill.description.length).toBeGreaterThan(20);
  });

  it('contains browse command reference', () => {
    expect(browseSkill.template).toContain('gstack browse goto');
    expect(browseSkill.template).toContain('snapshot');
  });

  it('references .gstack analytics path', () => {
    expect(browseSkill.template).toContain('.gstack/analytics');
  });

  it('contains core QA patterns', () => {
    expect(browseSkill.template).toContain('Core QA Patterns');
    expect(browseSkill.template).toContain('User Handoff');
  });
});
