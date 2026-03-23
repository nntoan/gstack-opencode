import { describe, it, expect } from 'vitest';
import { setupDeploySkill } from './setup-deploy.ts';

describe('setupDeploySkill', () => {
  it('has required GstackSkill fields', () => {
    expect(setupDeploySkill.name).toBe('setup-deploy');
    expect(setupDeploySkill.group).toBe('deploy');
    expect(setupDeploySkill.originalSkillName).toBe('gstack-setup-deploy');
    expect(setupDeploySkill.browserRequired).toBe(false);
    expect(setupDeploySkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(setupDeploySkill.template).not.toContain('~/.claude/');
    expect(setupDeploySkill.template).not.toContain('~/.codex/');
    expect(setupDeploySkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(setupDeploySkill.description.length).toBeGreaterThan(20);
  });

  it('contains setup-deploy workflow structure', () => {
    expect(setupDeploySkill.template).toContain('Detect platform');
    expect(setupDeploySkill.template).toContain('CLAUDE.md');
  });

  it('references .gstack analytics path', () => {
    expect(setupDeploySkill.template).toContain('.gstack/analytics');
  });
});
