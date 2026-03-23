import { describe, it, expect } from 'vitest';
import { upgradeSkill } from './upgrade.ts';

describe('upgradeSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(upgradeSkill.name).toBe('upgrade');
    expect(upgradeSkill.group).toBe('browser');
    expect(upgradeSkill.originalSkillName).toBe('gstack-upgrade');
    expect(upgradeSkill.browserRequired).toBe(false);
    expect(upgradeSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(upgradeSkill.template).not.toContain('~/.claude/');
    expect(upgradeSkill.template).not.toContain('~/.codex/');
    expect(upgradeSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(upgradeSkill.description.length).toBeGreaterThan(20);
  });

  it('references npm package upgrade', () => {
    expect(upgradeSkill.template).toContain('@nntoan/gstack');
    expect(upgradeSkill.template).toContain('bun update');
  });

  it('references .gstack analytics path', () => {
    expect(upgradeSkill.template).toContain('.gstack/analytics');
  });

  it('does not reference binary install path', () => {
    expect(upgradeSkill.template).not.toContain('git clone');
    expect(upgradeSkill.template).not.toContain('./setup');
  });
});
