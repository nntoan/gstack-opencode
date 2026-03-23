import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureBrowserStateDir, resolveConfig } from './config.ts';

function createTempProjectDir(): string {
  return mkdtempSync(join(tmpdir(), 'gstack-browser-daemon-config-test-'));
}

describe('browser-daemon/config', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('resolveConfig derives all state paths under .gstack/browser', () => {
    const projectDir = createTempProjectDir();
    tempDirs.push(projectDir);

    const config = resolveConfig({
      BROWSE_STATE_FILE: `${projectDir}/.gstack/browser/browse.json`,
    });

    expect(config.projectDir).toBe(projectDir);
    expect(config.stateDir).toBe(`${projectDir}/.gstack/browser`);
    expect(config.stateFile).toBe(`${projectDir}/.gstack/browser/browse.json`);
    expect(config.consoleLog).toBe(`${projectDir}/.gstack/browser/console.log`);
    expect(config.networkLog).toBe(`${projectDir}/.gstack/browser/network.log`);
    expect(config.dialogLog).toBe(`${projectDir}/.gstack/browser/dialog.log`);
  });

  it('ensureBrowserStateDir creates .gstack/browser subdirectory', () => {
    const projectDir = createTempProjectDir();
    tempDirs.push(projectDir);

    const config = resolveConfig({
      BROWSE_STATE_FILE: `${projectDir}/.gstack/browser/browse.json`,
    });
    ensureBrowserStateDir(config);

    expect(existsSync(`${projectDir}/.gstack/browser`)).toBe(true);
  });
});
