import { describe, it, expect } from 'bun:test';
import { SLIM_SKILL_NAMES, isSlimSkill } from './slim-preset.ts';

describe('SLIM_SKILL_NAMES', () => {
  it('contains exactly 5 skills', () => {
    expect(SLIM_SKILL_NAMES.size).toBe(5);
  });

  it('contains all required slim skills', () => {
    expect(SLIM_SKILL_NAMES.has('office-hours')).toBe(true);
    expect(SLIM_SKILL_NAMES.has('review')).toBe(true);
    expect(SLIM_SKILL_NAMES.has('ship')).toBe(true);
    expect(SLIM_SKILL_NAMES.has('qa')).toBe(true);
    expect(SLIM_SKILL_NAMES.has('investigate')).toBe(true);
  });
});

describe('isSlimSkill', () => {
  it('returns true for each slim skill', () => {
    expect(isSlimSkill('office-hours')).toBe(true);
    expect(isSlimSkill('review')).toBe(true);
    expect(isSlimSkill('ship')).toBe(true);
    expect(isSlimSkill('qa')).toBe(true);
    expect(isSlimSkill('investigate')).toBe(true);
  });

  it('returns false for non-slim skills', () => {
    expect(isSlimSkill('codex')).toBe(false);
    expect(isSlimSkill('benchmark')).toBe(false);
    expect(isSlimSkill('freeze')).toBe(false);
    expect(isSlimSkill('browse')).toBe(false);
    expect(isSlimSkill('retro')).toBe(false);
    expect(isSlimSkill('')).toBe(false);
  });
});
