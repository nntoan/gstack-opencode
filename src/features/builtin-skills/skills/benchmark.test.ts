import { describe, it, expect } from 'vitest';
import { benchmarkSkill } from './benchmark.ts';

describe('benchmarkSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(benchmarkSkill.name).toBe('benchmark');
    expect(benchmarkSkill.group).toBe('browser');
    expect(benchmarkSkill.originalSkillName).toBe('gstack-benchmark');
    expect(benchmarkSkill.browserRequired).toBe(true);
    expect(benchmarkSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(benchmarkSkill.template).not.toContain('~/.claude/');
    expect(benchmarkSkill.template).not.toContain('~/.codex/');
    expect(benchmarkSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(benchmarkSkill.description.length).toBeGreaterThan(20);
  });

  it('contains performance workflow structure', () => {
    expect(benchmarkSkill.template).toContain('gstack browse perf');
    expect(benchmarkSkill.template).toContain('REGRESSION');
  });

  it('references .gstack benchmark-reports path', () => {
    expect(benchmarkSkill.template).toContain('.gstack/benchmark-reports');
  });

  it('references .gstack analytics path', () => {
    expect(benchmarkSkill.template).toContain('.gstack/analytics');
  });

  it('uses inline slug detection', () => {
    expect(benchmarkSkill.template).toContain('basename');
    expect(benchmarkSkill.template).toContain('git rev-parse --show-toplevel');
  });

  it('does not contain old binary slug reference', () => {
    expect(benchmarkSkill.template).not.toContain('gstack-slug');
  });
});
