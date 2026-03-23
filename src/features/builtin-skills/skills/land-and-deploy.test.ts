import { describe, it, expect } from 'vitest';
import { landAndDeploySkill } from './land-and-deploy.ts';

describe('landAndDeploySkill', () => {
  it('has required GstackSkill fields', () => {
    expect(landAndDeploySkill.name).toBe('land-and-deploy');
    expect(landAndDeploySkill.group).toBe('deploy');
    expect(landAndDeploySkill.originalSkillName).toBe('gstack-land-and-deploy');
    expect(landAndDeploySkill.browserRequired).toBe(false);
    expect(landAndDeploySkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(landAndDeploySkill.template).not.toContain('~/.claude/');
    expect(landAndDeploySkill.template).not.toContain('~/.codex/');
    expect(landAndDeploySkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(landAndDeploySkill.description.length).toBeGreaterThan(20);
  });

  it('contains land-and-deploy workflow structure', () => {
    expect(landAndDeploySkill.template).toContain('Pre-merge');
    expect(landAndDeploySkill.template).toContain('Deploy');
    expect(landAndDeploySkill.template).toContain('Canary');
  });

  it('references .gstack analytics path', () => {
    expect(landAndDeploySkill.template).toContain('.gstack/analytics');
  });
});
