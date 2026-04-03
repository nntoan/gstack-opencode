import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import * as path from 'path';
import { parse as parseJsonc } from 'jsonc-parser';
import { runInstallWithOptions } from './install.ts';
import { getDefaultInstallSelection } from './model-defaults.ts';

function createTempRoot(name: string): string {
  const root = path.join(process.cwd(), '.memory', 'tests', name);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  return root;
}

afterEach(() => {
  rmSync(path.join(process.cwd(), '.memory', 'tests'), { recursive: true, force: true });
});

describe('runInstallWithOptions', () => {
  it('creates global config when missing', async () => {
    const root: string = createTempRoot('install-create-global-config');
    const homeDir: string = path.join(root, 'home');

    mkdirSync(homeDir, { recursive: true });

    const result = await runInstallWithOptions({
      homeDir,
      defaultSelection: getDefaultInstallSelection(),
    });

    expect(result).not.toBeNull();

    const configPath: string = path.join(homeDir, '.config', 'opencode', 'gstack.jsonc');
    expect(existsSync(configPath)).toBe(true);

    const content: string = await Bun.file(configPath).text();
    const parsed = parseJsonc(content) as Record<string, unknown>;
    const agents = parsed.agents as Record<string, unknown>;

    expect(agents.ceo).toBeDefined();
    expect((agents.ceo as Record<string, unknown>).model).toBe('opencode/gpt-5-nano');
  });

  it('does not include install_selection in generated config', async () => {
    const root: string = createTempRoot('install-no-install-selection');
    const homeDir: string = path.join(root, 'home');

    mkdirSync(homeDir, { recursive: true });

    await runInstallWithOptions({
      homeDir,
      defaultSelection: getDefaultInstallSelection(),
    });

    const configPath: string = path.join(homeDir, '.config', 'opencode', 'gstack.jsonc');
    const content: string = await Bun.file(configPath).text();
    const parsed = parseJsonc(content) as Record<string, unknown>;

    expect(parsed.install_selection).toBeUndefined();
    expect(parsed.orchestration_mode).toBeUndefined();
    expect(parsed.disabled_agents).toBeUndefined();
    expect(parsed.disabled_skills).toBeUndefined();
  });

  it('adds @nntoan/gstack to global plugin list if missing', async () => {
    const root: string = createTempRoot('install-global-plugin');
    const homeDir: string = path.join(root, 'home');

    mkdirSync(path.join(homeDir, '.config', 'opencode'), { recursive: true });
    writeFileSync(
      path.join(homeDir, '.config', 'opencode', 'opencode.json'),
      JSON.stringify({ plugin: ['other-plugin'] }, null, 2),
      'utf-8'
    );

    await runInstallWithOptions({
      homeDir,
      defaultSelection: getDefaultInstallSelection(),
    });

    const globalPath: string = path.join(homeDir, '.config', 'opencode', 'opencode.json');
    const content: string = await Bun.file(globalPath).text();
    const parsed = JSON.parse(content) as { plugin?: string[] };
    expect(parsed.plugin).toEqual(['other-plugin', '@nntoan/gstack']);
    expect(content.length).toBeGreaterThan(0);
  });

  it('does not create project .opencode/gstack.jsonc during install', async () => {
    const root: string = createTempRoot('install-no-project-config');
    const cwd: string = path.join(root, 'project');
    const homeDir: string = path.join(root, 'home');

    mkdirSync(cwd, { recursive: true });
    mkdirSync(homeDir, { recursive: true });

    await runInstallWithOptions({
      homeDir,
      defaultSelection: getDefaultInstallSelection(),
    });

    const projectConfigPath: string = path.join(cwd, '.opencode', 'gstack.jsonc');
    expect(existsSync(projectConfigPath)).toBe(false);
  });

  it('merges into existing global config while preserving custom values', async () => {
    const root: string = createTempRoot('install-merge-existing-config');
    const homeDir: string = path.join(root, 'home');

    mkdirSync(path.join(homeDir, '.config', 'opencode'), { recursive: true });
    const configPath: string = path.join(homeDir, '.config', 'opencode', 'gstack.jsonc');
    writeFileSync(
      configPath,
      `{
  "orchestration_mode": "skills-only",
  "agents": {
    "builder": {
      "model": "custom/model"
    }
  }
}`,
      'utf-8'
    );

    await runInstallWithOptions({
      homeDir,
      defaultSelection: getDefaultInstallSelection(),
    });

    const mergedRaw: string = await Bun.file(configPath).text();
    const merged = parseJsonc(mergedRaw) as Record<string, unknown>;
    const agents = merged.agents as Record<string, unknown>;

    expect(merged.orchestration_mode).toBe('skills-only');
    expect((agents.builder as Record<string, unknown>).model).toBe('custom/model');
    expect(agents.ceo).toBeDefined();
  });

  it('supports non-interactive selection defaults', async () => {
    const root: string = createTempRoot('install-non-interactive-selection');
    const homeDir: string = path.join(root, 'home');
    mkdirSync(homeDir, { recursive: true });

    const result = await runInstallWithOptions({
      homeDir,
      defaultSelection: {
        claudePlan: 'none',
        hasOpenAI: true,
        hasGemini: true,
        hasCopilot: false,
        hasOpencodeZen: false,
        hasZaiCodingPlan: false,
        hasKimiForCoding: false,
        hasOpencodeGo: true,
      },
      tui: false,
    });

    expect(result).not.toBeNull();

    const configPath: string = path.join(homeDir, '.config', 'opencode', 'gstack.jsonc');
    const raw = await Bun.file(configPath).text();
    const parsed = parseJsonc(raw) as Record<string, unknown>;
    const agents = parsed.agents as Record<string, unknown>;

    expect((agents.ceo as Record<string, unknown>).model).toBe('openai/gpt-5.4');
  });

  it('overwrites generated agent models when explicit selection is provided', async () => {
    const root: string = createTempRoot('install-overwrite-agent-models');
    const homeDir: string = path.join(root, 'home');
    mkdirSync(path.join(homeDir, '.config', 'opencode'), { recursive: true });

    const configPath: string = path.join(homeDir, '.config', 'opencode', 'gstack.jsonc');
    writeFileSync(
      configPath,
      JSON.stringify(
        {
          agents: {
            ceo: { model: 'openai/gpt-5.4' },
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    await runInstallWithOptions({
      homeDir,
      defaultSelection: {
        claudePlan: 'none',
        hasOpenAI: false,
        hasGemini: false,
        hasCopilot: true,
        hasOpencodeZen: false,
        hasZaiCodingPlan: false,
        hasKimiForCoding: false,
        hasOpencodeGo: false,
      },
      tui: false,
      overwriteAgentModels: true,
    });

    const raw = await Bun.file(configPath).text();
    const parsed = parseJsonc(raw) as Record<string, unknown>;
    const agents = parsed.agents as Record<string, unknown>;
    expect((agents.ceo as Record<string, unknown>).model).toBe('github-copilot/claude-opus-4.6');
  });

  it('writes to existing gstack.json when jsonc does not exist', async () => {
    const root: string = createTempRoot('install-json-fallback-write');
    const homeDir: string = path.join(root, 'home');
    const configDir = path.join(homeDir, '.config', 'opencode');
    mkdirSync(configDir, { recursive: true });

    const jsonPath = path.join(configDir, 'gstack.json');
    writeFileSync(
      jsonPath,
      JSON.stringify({ agents: { builder: { model: 'custom/model' } } }, null, 2)
    );

    await runInstallWithOptions({
      homeDir,
      defaultSelection: getDefaultInstallSelection(),
      tui: false,
    });

    const jsoncPath = path.join(configDir, 'gstack.jsonc');
    expect(existsSync(jsoncPath)).toBe(false);

    const raw = await Bun.file(jsonPath).text();
    const parsed = parseJsonc(raw) as Record<string, unknown>;
    const agents = parsed.agents as Record<string, unknown>;
    expect((agents.builder as Record<string, unknown>).model).toBe('custom/model');
    expect(agents.ceo).toBeDefined();
  });

  it('returns null when tui is enabled but user would cancel (non-tty env)', async () => {
    const root: string = createTempRoot('install-cancel-non-tty');
    const homeDir: string = path.join(root, 'home');
    mkdirSync(homeDir, { recursive: true });

    const result = await runInstallWithOptions({
      homeDir,
      defaultSelection: getDefaultInstallSelection(),
      tui: false,
    });

    expect(result).not.toBeNull();
    expect(result!.selection).toEqual(getDefaultInstallSelection());
  });
});
