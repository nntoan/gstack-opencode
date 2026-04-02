import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import * as path from 'path';
import { parse as parseJsonc } from 'jsonc-parser';
import { runInstallWithOptions } from './install.ts';
import { getDefaultInstallSelection } from './model-defaults.ts';

function createReader(answers: string[]): () => Promise<string> {
  let index = 0;
  return async (): Promise<string> => {
    const answer = answers[index] ?? '';
    index += 1;
    return answer;
  };
}

interface MemoryWriter {
  chunks: string[];
  write: (chunk: string) => boolean;
}

function createWriter(): MemoryWriter {
  const chunks: string[] = [];
  return {
    chunks,
    write(chunk: string): boolean {
      chunks.push(chunk);
      return true;
    },
  };
}

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

    const stdout = createWriter();
    await runInstallWithOptions({
      homeDir,
      stdout,
      defaultSelection: getDefaultInstallSelection(),
    });

    const configPath: string = path.join(homeDir, '.config', 'opencode', 'gstack.jsonc');
    expect(existsSync(configPath)).toBe(true);
    expect(stdout.chunks.join('')).toContain('Created global config');

    const content: string = await Bun.file(configPath).text();
    const parsed = parseJsonc(content) as Record<string, unknown>;
    const installSelection = parsed.install_selection as Record<string, unknown>;
    const agents = parsed.agents as Record<string, unknown>;

    expect(installSelection).toBeDefined();
    expect(installSelection.claude_plan).toBe('none');
    expect(agents.ceo).toBeDefined();
    expect((agents.ceo as Record<string, unknown>).model).toBe('opencode/gpt-5-nano');
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

    const stdout = createWriter();
    await runInstallWithOptions({
      homeDir,
      stdout,
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

    const stdout = createWriter();
    await runInstallWithOptions({
      homeDir,
      stdout,
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
  "install_selection": {
    "claude_plan": "max"
  },
  "agents": {
    "builder": {
      "model": "custom/model"
    }
  }
}`,
      'utf-8'
    );

    const stdout = createWriter();
    await runInstallWithOptions({
      homeDir,
      stdout,
      defaultSelection: getDefaultInstallSelection(),
    });

    const mergedRaw: string = await Bun.file(configPath).text();
    const merged = parseJsonc(mergedRaw) as Record<string, unknown>;
    const installSelection = merged.install_selection as Record<string, unknown>;
    const agents = merged.agents as Record<string, unknown>;

    expect(merged.orchestration_mode).toBe('skills-only');
    expect(installSelection.claude_plan).toBe('max');
    expect((agents.builder as Record<string, unknown>).model).toBe('custom/model');
    expect(agents.ceo).toBeDefined();
  });

  it('supports interactive provider selection and persists generated defaults', async () => {
    const root: string = createTempRoot('install-interactive-selection');
    const homeDir: string = path.join(root, 'home');
    mkdirSync(homeDir, { recursive: true });

    const stdout = createWriter();
    await runInstallWithOptions({
      homeDir,
      stdout,
      promptForSelection: true,
      defaultSelection: getDefaultInstallSelection(),
      stdin: {
        read: createReader(['max', 'yes', 'yes', 'yes', 'yes', 'no', 'no', 'yes']),
      },
    });

    const configPath: string = path.join(homeDir, '.config', 'opencode', 'gstack.jsonc');
    const raw = await Bun.file(configPath).text();
    const parsed = parseJsonc(raw) as Record<string, unknown>;
    const installSelection = parsed.install_selection as Record<string, unknown>;
    const agents = parsed.agents as Record<string, unknown>;

    expect(installSelection.claude_plan).toBe('max');
    expect(installSelection.has_openai).toBe(true);
    expect(installSelection.has_gemini).toBe(true);
    expect(installSelection.has_copilot).toBe(true);
    expect(installSelection.has_opencode_zen).toBe(true);
    expect(installSelection.has_opencode_go).toBe(true);
    expect((agents.ceo as Record<string, unknown>).model).toBe('anthropic/claude-opus-4-6');
  });

  it('supports interactive prompts when stdout.write needs method binding', async () => {
    const root: string = createTempRoot('install-interactive-bound-stdout');
    const homeDir: string = path.join(root, 'home');
    mkdirSync(homeDir, { recursive: true });

    const stdout = {
      chunks: [] as string[],
      write(this: { chunks: string[] }, chunk: string): boolean {
        this.chunks.push(chunk);
        return true;
      },
    };

    await runInstallWithOptions({
      homeDir,
      stdout,
      promptForSelection: true,
      defaultSelection: getDefaultInstallSelection(),
      stdin: {
        read: createReader(['max', 'yes', 'yes', 'yes', 'yes', 'no', 'no', 'yes']),
      },
    });

    expect(stdout.chunks.length).toBeGreaterThan(0);
    expect(stdout.chunks.join('')).toContain('gstack install completed successfully');
  });

  it('supports non-interactive CLI-style selection defaults', async () => {
    const root: string = createTempRoot('install-non-interactive-selection');
    const homeDir: string = path.join(root, 'home');
    mkdirSync(homeDir, { recursive: true });

    const stdout = createWriter();
    await runInstallWithOptions({
      homeDir,
      stdout,
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
      promptForSelection: false,
    });

    const configPath: string = path.join(homeDir, '.config', 'opencode', 'gstack.jsonc');
    const raw = await Bun.file(configPath).text();
    const parsed = parseJsonc(raw) as Record<string, unknown>;
    const installSelection = parsed.install_selection as Record<string, unknown>;
    const agents = parsed.agents as Record<string, unknown>;

    expect(installSelection.has_openai).toBe(true);
    expect(installSelection.has_opencode_go).toBe(true);
    expect((agents.ceo as Record<string, unknown>).model).toBe('openai/gpt-5.4');
  });
});
