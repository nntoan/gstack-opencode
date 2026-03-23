import { describe, it, expect } from 'vitest';
import { officeHoursSkill } from './office-hours.ts';

describe('officeHoursSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(officeHoursSkill.name).toBe('office-hours');
    expect(officeHoursSkill.group).toBe('planning');
    expect(officeHoursSkill.originalSkillName).toBe('gstack-office-hours');
    expect(officeHoursSkill.browserRequired).toBe(false);
    expect(officeHoursSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(officeHoursSkill.template).not.toContain('~/.claude/');
    expect(officeHoursSkill.template).not.toContain('~/.codex/');
    expect(officeHoursSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(officeHoursSkill.description.length).toBeGreaterThan(20);
  });
});
