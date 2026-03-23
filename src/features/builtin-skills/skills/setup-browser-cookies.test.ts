import { describe, it, expect } from 'vitest';
import { setupBrowserCookiesSkill } from './setup-browser-cookies.ts';

describe('setupBrowserCookiesSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(setupBrowserCookiesSkill.name).toBe('setup-browser-cookies');
    expect(setupBrowserCookiesSkill.group).toBe('browser');
    expect(setupBrowserCookiesSkill.originalSkillName).toBe('gstack-setup-browser-cookies');
    expect(setupBrowserCookiesSkill.browserRequired).toBe(true);
    expect(setupBrowserCookiesSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(setupBrowserCookiesSkill.template).not.toContain('~/.claude/');
    expect(setupBrowserCookiesSkill.template).not.toContain('~/.codex/');
    expect(setupBrowserCookiesSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(setupBrowserCookiesSkill.description.length).toBeGreaterThan(20);
  });

  it('contains cookie import reference', () => {
    expect(setupBrowserCookiesSkill.template).toContain('gstack browse cookie-import-browser');
    expect(setupBrowserCookiesSkill.template).toContain('gstack browse cookies');
  });

  it('references .gstack analytics path', () => {
    expect(setupBrowserCookiesSkill.template).toContain('.gstack/analytics');
  });
});
