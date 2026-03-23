import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import * as path from 'path';
import { runInstallWithOptions } from './install.ts';

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
  it('creates project config when missing', async () => {
    const root: string = createTempRoot('install-create-config');
    const cwd: string = path.join(root, 'project');
    const homeDir: string = path.join(root, 'home');

    mkdirSync(cwd, { recursive: true });
    mkdirSync(homeDir, { recursive: true });

    const stdout = createWriter();
    await runInstallWithOptions({ cwd, homeDir, stdout });

    const configPath: string = path.join(cwd, '.opencode', 'gstack.jsonc');
    expect(existsSync(configPath)).toBe(true);
    expect(stdout.chunks.join('')).toContain('Created project config');
  });

  it('adds @nntoan/gstack to global plugin list if missing', async () => {
    const root: string = createTempRoot('install-global-plugin');
    const cwd: string = path.join(root, 'project');
    const homeDir: string = path.join(root, 'home');

    mkdirSync(cwd, { recursive: true });
    mkdirSync(path.join(homeDir, '.config', 'opencode'), { recursive: true });
    writeFileSync(
      path.join(homeDir, '.config', 'opencode', 'opencode.json'),
      JSON.stringify({ plugin: ['other-plugin'] }, null, 2),
      'utf-8'
    );

    const stdout = createWriter();
    await runInstallWithOptions({ cwd, homeDir, stdout });

    const globalPath: string = path.join(homeDir, '.config', 'opencode', 'opencode.json');
    const content: string = await Bun.file(globalPath).text();
    const parsed = JSON.parse(content) as { plugin?: string[] };
    expect(parsed.plugin).toEqual(['other-plugin', '@nntoan/gstack']);
    expect(content.length).toBeGreaterThan(0);
  });
});
