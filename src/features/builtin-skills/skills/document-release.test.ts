import { describe, it, expect } from 'vitest';
import { documentReleaseSkill } from './document-release.ts';

describe('documentReleaseSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(documentReleaseSkill.name).toBe('document-release');
    expect(documentReleaseSkill.group).toBe('deploy');
    expect(documentReleaseSkill.originalSkillName).toBe('gstack-document-release');
    expect(documentReleaseSkill.browserRequired).toBe(false);
    expect(documentReleaseSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(documentReleaseSkill.template).not.toContain('~/.claude/');
    expect(documentReleaseSkill.template).not.toContain('~/.codex/');
    expect(documentReleaseSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(documentReleaseSkill.description.length).toBeGreaterThan(20);
  });

  it('contains document-release workflow steps', () => {
    expect(documentReleaseSkill.template).toContain('CHANGELOG');
    expect(documentReleaseSkill.template).toContain('NEVER');
    expect(documentReleaseSkill.template).toContain('VERSION');
  });

  it('contains documentation audit steps', () => {
    expect(documentReleaseSkill.template).toContain('README');
    expect(documentReleaseSkill.template).toContain('CONTRIBUTING');
  });

  it('references .gstack rules path for TODOS format', () => {
    expect(documentReleaseSkill.template).toContain('.gstack/rules/TODOS-format.md');
  });

  it('references .gstack analytics path', () => {
    expect(documentReleaseSkill.template).toContain('.gstack/analytics');
  });
});
