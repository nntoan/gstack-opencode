import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfigFromPath, loadPluginConfig, parseConfigPartially } from './plugin-config.ts';

function writeConfigFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

describe('plugin-config', () => {
  let tempDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-config-test-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns defaults when no user or project config exists', () => {
    const projectDir = path.join(tempDir, 'project-no-config');
    fs.mkdirSync(projectDir, { recursive: true });

    const config = loadPluginConfig(projectDir, null);

    expect(config.orchestration_mode).toBe('multi-agent');
    expect(config.disabled_agents).toEqual([]);
    expect(config.disabled_mcps).toEqual([]);
    expect(config.disabled_skills).toEqual([]);
    expect(config.disabled_hooks).toEqual([]);
    expect(config.backlog.enabled).toBe(true);
    expect(config.backlog.auto_create_tasks).toBe(true);
    expect(config.backlog.auto_update_status).toBe(true);
  });

  it('merges user and project config with project overrides', () => {
    const userConfigPath = path.join(tempDir, '.config', 'opencode', 'gstack.jsonc');
    const projectDir = path.join(tempDir, 'project-merge');
    const projectConfigPath = path.join(projectDir, '.opencode', 'gstack.jsonc');

    writeConfigFile(
      userConfigPath,
      `{
  // user-level config
  "orchestration_mode": "multi-agent",
  "disabled_agents": ["user-agent"],
  "disabled_mcps": ["websearch"],
  "disabled_skills": ["user-skill"],
  "install_selection": {
    "claude_plan": "pro",
    "has_openai": false
  },
  "backlog": {
    "enabled": true,
    "auto_create_tasks": true,
    "auto_update_status": false
  },
  "agents": {
    "sisyphus": {
      "model": "user-model",
      "instructions": "keep-user"
    }
  }
}`
    );

    writeConfigFile(
      projectConfigPath,
      `{
  "orchestration_mode": "skills-only",
  "disabled_agents": ["project-agent", "user-agent"],
  "disabled_mcps": ["context7"],
  "disabled_skills": ["project-skill"],
  "disabled_hooks": ["hook-project"],
  "install_selection": {
    "has_openai": true,
    "has_gemini": true
  },
  "agents": {
    "sisyphus": {
      "model": "project-model"
    }
  },
  "backlog": {
    "enabled": false,
    "auto_create_tasks": false,
    "auto_update_status": false
  }
}`
    );

    const config = loadPluginConfig(projectDir, null);

    expect(config.orchestration_mode).toBe('skills-only');
    expect(config.disabled_agents).toEqual(['user-agent', 'project-agent']);
    expect(config.disabled_mcps).toEqual(['websearch', 'context7']);
    expect(config.disabled_skills).toEqual(['user-skill', 'project-skill']);
    expect(config.disabled_hooks).toEqual(['hook-project']);
    expect(config.install_selection?.claude_plan).toBe('pro');
    expect(config.install_selection?.has_openai).toBe(true);
    expect(config.install_selection?.has_gemini).toBe(true);
    expect(config.agents?.sisyphus.model).toBe('project-model');
    expect(config.agents?.sisyphus.instructions).toBe('keep-user');
    expect(config.backlog.enabled).toBe(false);
    expect(config.backlog.auto_create_tasks).toBe(false);
    expect(config.backlog.auto_update_status).toBe(false);
  });

  it('loadConfigFromPath handles missing file gracefully', () => {
    const missingPath = path.join(tempDir, 'missing', 'gstack.jsonc');

    const result = loadConfigFromPath(missingPath, null);

    expect(result).toBeNull();
  });

  it('loadConfigFromPath returns partial config for invalid JSONC', () => {
    const configPath = path.join(tempDir, 'partial', 'gstack.jsonc');

    writeConfigFile(
      configPath,
      `{
  "disabled_agents": ["agent-a"],
  "backlog": {
    "enabled": false
  }
`
    );

    const result = loadConfigFromPath(configPath, null);

    expect(result).not.toBeNull();
    expect(result?.disabled_agents).toEqual(['agent-a']);
    expect(result?.backlog?.enabled).toBe(false);
  });

  it('parseConfigPartially keeps valid sections and skips invalid ones', () => {
    const partial = parseConfigPartially({
      orchestration_mode: 'skills-only',
      disabled_agents: ['valid-agent'],
      disabled_mcps: [123],
      backlog: {
        enabled: false,
      },
      browser: {
        timeout_ms: 'invalid-type',
      },
    });

    expect(partial).not.toBeNull();
    expect(partial?.orchestration_mode).toBe('skills-only');
    expect(partial?.disabled_agents).toEqual(['valid-agent']);
    expect(partial?.disabled_mcps).toBeUndefined();
    expect(partial?.backlog?.enabled).toBe(false);
    expect(partial?.browser).toBeUndefined();
  });

  it('falls back to os.homedir when HOME is not set', () => {
    const fakeHome = path.join(tempDir, 'fake-home');
    writeConfigFile(
      path.join(fakeHome, '.config', 'opencode', 'gstack.jsonc'),
      `{
  "agents": {
    "ceo": { "model": "custom/homedir-model" }
  }
}`
    );

    const homedirSpy = vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);

    try {
      delete process.env.HOME;

      const projectDir = path.join(tempDir, 'project-homedir-fallback');
      fs.mkdirSync(projectDir, { recursive: true });

      const config = loadPluginConfig(projectDir, null);
      expect(config.agents?.ceo?.model).toBe('custom/homedir-model');
    } finally {
      homedirSpy.mockRestore();
    }
  });

  it('falls back to os.homedir when HOME is empty string', () => {
    const fakeHome = path.join(tempDir, 'fake-home-empty');
    writeConfigFile(
      path.join(fakeHome, '.config', 'opencode', 'gstack.jsonc'),
      `{
  "agents": {
    "ceo": { "model": "custom/homedir-empty-model" }
  }
}`
    );

    const homedirSpy = vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);

    try {
      process.env.HOME = '';

      const projectDir = path.join(tempDir, 'project-homedir-empty-fallback');
      fs.mkdirSync(projectDir, { recursive: true });

      const config = loadPluginConfig(projectDir, null);
      expect(config.agents?.ceo?.model).toBe('custom/homedir-empty-model');
    } finally {
      homedirSpy.mockRestore();
    }
  });
});
