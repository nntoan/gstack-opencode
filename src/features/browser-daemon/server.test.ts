import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startServer } from './server.ts';

type FakeBrowserManager = {
  serverPort: number;
  launch: () => Promise<void>;
  close: () => Promise<void>;
  isHealthy: () => Promise<boolean>;
  getTabCount: () => number;
  getCurrentUrl: () => string;
  resetFailures: () => void;
  incrementFailures: () => void;
  getFailureHint: () => string | null;
};

function createTempProjectDir(): string {
  return mkdtempSync(join(tmpdir(), 'gstack-browser-daemon-server-test-'));
}

function createFakeBrowserManager(): FakeBrowserManager {
  return {
    serverPort: 0,
    launch: async () => {
      return;
    },
    close: async () => {
      return;
    },
    isHealthy: async () => true,
    getTabCount: () => 1,
    getCurrentUrl: () => 'about:blank',
    resetFailures: () => {
      return;
    },
    incrementFailures: () => {
      return;
    },
    getFailureHint: () => null,
  };
}

describe('browser-daemon/server', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('writes state file to .gstack/browser/browse.json', async () => {
    const projectDir = createTempProjectDir();
    tempDirs.push(projectDir);

    const stateFile = `${projectDir}/.gstack/browser/browse.json`;
    const runtime = await startServer({
      env: {
        BROWSE_STATE_FILE: stateFile,
        BROWSE_IDLE_TIMEOUT: '300000',
      },
      browserManager: createFakeBrowserManager(),
      skipBrowserLaunch: true,
    });

    const stateContent = readFileSync(stateFile, 'utf-8');
    const state = JSON.parse(stateContent) as { token: string; port: number };

    expect(existsSync(stateFile)).toBe(true);
    expect(state.token).toBe(runtime.token);
    expect(state.port).toBe(runtime.port);

    await runtime.shutdown();
  });

  it('serves /health without auth', async () => {
    const projectDir = createTempProjectDir();
    tempDirs.push(projectDir);

    const runtime = await startServer({
      env: {
        BROWSE_STATE_FILE: `${projectDir}/.gstack/browser/browse.json`,
        BROWSE_IDLE_TIMEOUT: '300000',
      },
      browserManager: createFakeBrowserManager(),
      skipBrowserLaunch: true,
    });

    const response = await fetch(`http://127.0.0.1:${runtime.port}/health`);
    const body = (await response.json()) as {
      status: 'healthy' | 'unhealthy';
      uptime: number;
      pageCount: number;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.pageCount).toBe(1);
    expect(typeof body.uptime).toBe('number');

    await runtime.shutdown();
  });
});
