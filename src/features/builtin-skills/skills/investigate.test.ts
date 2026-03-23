import { describe, it, expect } from 'vitest';
import { investigateSkill } from './investigate.ts';

describe('investigateSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(investigateSkill.name).toBe('investigate');
    expect(investigateSkill.group).toBe('utility');
    expect(investigateSkill.originalSkillName).toBe('gstack-investigate');
    expect(investigateSkill.browserRequired).toBe(false);
    expect(investigateSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no Claude Code or home-path references', () => {
    expect(investigateSkill.template).not.toContain('$B');
    expect(investigateSkill.template).not.toContain('~/.claude/');
    expect(investigateSkill.template).not.toContain('~/.codex/');
    expect(investigateSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(investigateSkill.description.length).toBeGreaterThan(20);
  });

  it('contains the Iron Law', () => {
    expect(investigateSkill.template).toContain('NO FIXES WITHOUT ROOT CAUSE');
  });

  it('references .gstack/analytics for telemetry', () => {
    expect(investigateSkill.template).toContain('.gstack/analytics');
  });

  it('contains the 4 investigation phases', () => {
    expect(investigateSkill.template).toContain('Phase 1');
    expect(investigateSkill.template).toContain('Phase 2');
    expect(investigateSkill.template).toContain('Phase 3');
    expect(investigateSkill.template).toContain('Phase 4');
  });
});
