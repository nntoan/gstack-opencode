import { describe, it, expect } from 'vitest';
import { retroSkill } from './retro.ts';

describe('retroSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(retroSkill.name).toBe('retro');
    expect(retroSkill.group).toBe('utility');
    expect(retroSkill.originalSkillName).toBe('gstack-retro');
    expect(retroSkill.browserRequired).toBe(false);
    expect(retroSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no Claude Code or home-path references', () => {
    expect(retroSkill.template).not.toContain('$B');
    expect(retroSkill.template).not.toContain('~/.claude/');
    expect(retroSkill.template).not.toContain('~/.codex/');
    expect(retroSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(retroSkill.description.length).toBeGreaterThan(20);
  });

  it('references .gstack/analytics for telemetry', () => {
    expect(retroSkill.template).toContain('.gstack/analytics');
  });

  it('contains the 14 retro steps', () => {
    expect(retroSkill.template).toContain('Step 1');
    expect(retroSkill.template).toContain('Step 14');
  });

  it('references .context/retros for history persistence', () => {
    expect(retroSkill.template).toContain('.context/retros');
  });
});
