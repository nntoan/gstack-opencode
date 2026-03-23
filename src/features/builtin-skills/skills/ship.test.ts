import { describe, it, expect } from 'vitest';
import { shipSkill } from './ship.ts';

describe('shipSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(shipSkill.name).toBe('ship');
    expect(shipSkill.group).toBe('deploy');
    expect(shipSkill.originalSkillName).toBe('gstack-ship');
    expect(shipSkill.browserRequired).toBe(false);
    expect(shipSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(shipSkill.template).not.toContain('~/.claude/');
    expect(shipSkill.template).not.toContain('~/.codex/');
    expect(shipSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(shipSkill.description.length).toBeGreaterThan(20);
  });

  it('contains ship workflow structure', () => {
    expect(shipSkill.template).toContain('Pre-flight');
    expect(shipSkill.template).toContain('Run tests');
    expect(shipSkill.template).toContain('Create PR');
  });

  it('uses .gstack/reviews path instead of old binary', () => {
    expect(shipSkill.template).toContain('.gstack/reviews');
    expect(shipSkill.template).not.toContain('gstack-review-read');
  });

  it('uses inline slug detection', () => {
    expect(shipSkill.template).toContain('basename');
    expect(shipSkill.template).toContain('git rev-parse --show-toplevel');
  });
});
