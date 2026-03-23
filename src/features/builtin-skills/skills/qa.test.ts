import { describe, it, expect } from 'vitest';
import { qaSkill } from './qa.ts';

describe('qaSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(qaSkill.name).toBe('qa');
    expect(qaSkill.group).toBe('browser');
    expect(qaSkill.originalSkillName).toBe('gstack-qa');
    expect(qaSkill.browserRequired).toBe(true);
    expect(qaSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(qaSkill.template).not.toContain('~/.claude/');
    expect(qaSkill.template).not.toContain('~/.codex/');
    expect(qaSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(qaSkill.description.length).toBeGreaterThan(20);
  });

  it('contains Phase 8 Fix Loop', () => {
    expect(qaSkill.template).toContain('Phase 8');
    expect(qaSkill.template).toContain('Fix Loop');
    expect(qaSkill.template).toContain('ISSUE-NNN');
  });

  it('references .gstack qa-reports path', () => {
    expect(qaSkill.template).toContain('.gstack/qa-reports');
  });

  it('references .gstack analytics path', () => {
    expect(qaSkill.template).toContain('.gstack/analytics');
  });

  it('uses inline slug detection', () => {
    expect(qaSkill.template).toContain('basename');
    expect(qaSkill.template).toContain('git rev-parse --show-toplevel');
  });

  it('does not contain old binary slug reference', () => {
    expect(qaSkill.template).not.toContain('gstack-slug');
  });

  it('references .gstack projects path for cross-session context', () => {
    expect(qaSkill.template).toContain('.gstack/design-docs');
  });
});
