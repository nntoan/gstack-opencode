import { describe, it, expect } from 'bun:test';
import { createBuiltinSkills } from './skills.ts';

describe('createBuiltinSkills', () => {
  it('defaults to full preset — returns all 25 skills', () => {
    const skills = createBuiltinSkills();
    expect(skills.length).toBe(25);
  });

  it('explicit preset=full returns all 25 skills', () => {
    const skills = createBuiltinSkills({ preset: 'full' });
    expect(skills.length).toBe(25);
  });

  it('preset=slim returns exactly 5 skills', () => {
    const skills = createBuiltinSkills({ preset: 'slim' });
    expect(skills.length).toBe(5);
  });

  it('preset=slim returns the correct curated skill names', () => {
    const skills = createBuiltinSkills({ preset: 'slim' });
    const names = new Set(skills.map((s) => s.name));
    expect(names.has('office-hours')).toBe(true);
    expect(names.has('review')).toBe(true);
    expect(names.has('ship')).toBe(true);
    expect(names.has('qa')).toBe(true);
    expect(names.has('investigate')).toBe(true);
  });

  it('preset=slim + disabledSkills filters out matching slim skills', () => {
    const skills = createBuiltinSkills({
      preset: 'slim',
      disabledSkills: new Set(['review', 'ship']),
    });
    const names = skills.map((s) => s.name);
    expect(names).not.toContain('review');
    expect(names).not.toContain('ship');
    expect(skills.length).toBe(3);
  });

  it('preset=slim + browserAvailable=false removes browser-required slim skills', () => {
    // qa is browserRequired — should be excluded when browserAvailable=false
    const skills = createBuiltinSkills({ preset: 'slim', browserAvailable: false });
    const names = skills.map((s) => s.name);
    expect(names).not.toContain('qa');
    expect(skills.length).toBe(4);
  });

  it('preset=full + browserAvailable=false removes all 8 browser-required skills', () => {
    const skills = createBuiltinSkills({ preset: 'full', browserAvailable: false });
    expect(skills.length).toBe(17);
  });

  it('disabledSkills filters out skills by name regardless of preset', () => {
    const skills = createBuiltinSkills({
      preset: 'full',
      disabledSkills: new Set(['codex', 'benchmark']),
    });
    const names = skills.map((s) => s.name);
    expect(names).not.toContain('codex');
    expect(names).not.toContain('benchmark');
    expect(skills.length).toBe(23);
  });
});
