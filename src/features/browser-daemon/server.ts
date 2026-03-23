import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BrowserManager } from './browser-manager.ts';
import {
  addConsoleEntry,
  addDialogEntry,
  addNetworkEntry,
  consoleBuffer,
  dialogBuffer,
  networkBuffer,
} from './buffers.ts';
import { ensureBrowserStateDir, readVersionHash, resolveConfig } from './config.ts';
import { log } from '../../shared/logger.ts';
import { READ_COMMANDS, WRITE_COMMANDS } from './commands.ts';
import { handleReadCommand } from './read-commands.ts';
import { handleWriteCommand } from './write-commands.ts';
import { handleMetaCommand } from './meta-commands.ts';
import type {
  BrowseConfig,
  CommandRequest,
  CommandResponse,
  HealthResponse,
  ServerState,
} from './types.ts';

type BrowserManagerLike = {
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

export type ServerRuntime = {
  config: BrowseConfig;
  token: string;
  port: number;
  state: ServerState;
  shutdown: () => Promise<void>;
};

export type StartServerOptions = {
  env?: Record<string, string | undefined>;
  browserManager?: BrowserManagerLike;
  skipBrowserLaunch?: boolean;
  idleTimeoutMs?: number;
};

function validateAuth(req: Request, authToken: string): boolean {
  const header = req.headers.get('authorization');
  return header === `Bearer ${authToken}`;
}

async function findPort(env: Record<string, string | undefined>): Promise<number> {
  const requestedPort = parseInt(env.BROWSE_PORT || '0', 10);
  if (requestedPort) {
    try {
      const testServer = Bun.serve({ port: requestedPort, fetch: () => new Response('ok') });
      testServer.stop();
      return requestedPort;
    } catch {
      throw new Error(`[browse] Port ${requestedPort} (from BROWSE_PORT env) is in use`);
    }
  }

  const minPort = 10000;
  const maxPort = 60000;
  const retries = 5;
  for (let attempt = 0; attempt < retries; attempt++) {
    const port = minPort + Math.floor(Math.random() * (maxPort - minPort));
    try {
      const testServer = Bun.serve({ port, fetch: () => new Response('ok') });
      testServer.stop();
      return port;
    } catch {
      continue;
    }
  }

  throw new Error(
    `[browse] No available port after ${retries} attempts in range ${minPort}-${maxPort}`
  );
}

function parseCommandBody(value: unknown): CommandRequest | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Partial<CommandRequest>;
  if (typeof body.command !== 'string') return null;
  if (!Array.isArray(body.args) || !body.args.every((arg) => typeof arg === 'string')) return null;
  return { command: body.command, args: body.args };
}

function writeStateFile(config: BrowseConfig, state: ServerState): void {
  const tmpFile = `${config.stateFile}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(tmpFile, config.stateFile);
}

export async function startServer(options: StartServerOptions = {}): Promise<ServerRuntime> {
  const env = options.env ?? process.env;
  const config = resolveConfig(env);
  ensureBrowserStateDir(config);

  const manager = options.browserManager ?? new BrowserManager();
  const authToken = crypto.randomUUID();
  const idleTimeoutMs = options.idleTimeoutMs ?? parseInt(env.BROWSE_IDLE_TIMEOUT || '1800000', 10);

  let lastConsoleFlushed = 0;
  let lastNetworkFlushed = 0;
  let lastDialogFlushed = 0;
  let flushInProgress = false;
  let isShuttingDown = false;
  let lastActivity = Date.now();

  const flushBuffers = async (): Promise<void> => {
    if (flushInProgress) return;
    flushInProgress = true;
    try {
      const newConsoleCount = consoleBuffer.totalAdded - lastConsoleFlushed;
      if (newConsoleCount > 0) {
        const entries = consoleBuffer.last(Math.min(newConsoleCount, consoleBuffer.length));
        const lines =
          entries
            .map(
              (entry) =>
                `[${new Date(entry.timestamp).toISOString()}] [${entry.level}] ${entry.text}`
            )
            .join('\n') + '\n';
        fs.appendFileSync(config.consoleLog, lines);
        lastConsoleFlushed = consoleBuffer.totalAdded;
      }

      const newNetworkCount = networkBuffer.totalAdded - lastNetworkFlushed;
      if (newNetworkCount > 0) {
        const entries = networkBuffer.last(Math.min(newNetworkCount, networkBuffer.length));
        const lines =
          entries
            .map(
              (entry) =>
                `[${new Date(entry.timestamp).toISOString()}] ${entry.method} ${entry.url} → ${entry.status || 'pending'} (${entry.duration || '?'}ms, ${entry.size || '?'}B)`
            )
            .join('\n') + '\n';
        fs.appendFileSync(config.networkLog, lines);
        lastNetworkFlushed = networkBuffer.totalAdded;
      }

      const newDialogCount = dialogBuffer.totalAdded - lastDialogFlushed;
      if (newDialogCount > 0) {
        const entries = dialogBuffer.last(Math.min(newDialogCount, dialogBuffer.length));
        const lines =
          entries
            .map(
              (entry) =>
                `[${new Date(entry.timestamp).toISOString()}] [${entry.type}] "${entry.message}" → ${entry.action}${entry.response ? ` "${entry.response}"` : ''}`
            )
            .join('\n') + '\n';
        fs.appendFileSync(config.dialogLog, lines);
        lastDialogFlushed = dialogBuffer.totalAdded;
      }
    } catch {
      return;
    } finally {
      flushInProgress = false;
    }
  };

  const flushInterval = setInterval(flushBuffers, 1000);

  const port = await findPort(env);

  if (!options.skipBrowserLaunch) {
    await manager.launch();
  }

  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const server = Bun.serve({
    port,
    hostname: '127.0.0.1',
    fetch: async (req) => {
      lastActivity = Date.now();
      const url = new URL(req.url);

      if (url.pathname === '/health') {
        const healthy = await manager.isHealthy();
        const health: HealthResponse = {
          status: healthy ? 'healthy' : 'unhealthy',
          uptime: Math.floor((Date.now() - startTime) / 1000),
          pageCount: manager.getTabCount(),
        };
        return new Response(JSON.stringify(health), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!validateAuth(req, authToken)) {
        const unauthorized: CommandResponse = { ok: false, error: 'Unauthorized' };
        return new Response(JSON.stringify(unauthorized), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/command' && req.method === 'POST') {
        const rawBody = (await req.json().catch(() => null)) as unknown;
        const body = parseCommandBody(rawBody);
        if (!body) {
          const invalid: CommandResponse = { ok: false, error: 'Missing or invalid command body' };
          return new Response(JSON.stringify(invalid), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        try {
          manager.resetFailures();
          const bm = manager as BrowserManager;
          let result: string;
          if (READ_COMMANDS.has(body.command)) {
            result = await handleReadCommand(body.command, body.args, bm);
          } else if (WRITE_COMMANDS.has(body.command)) {
            result = await handleWriteCommand(body.command, body.args, bm);
          } else {
            result = await handleMetaCommand(body.command, body.args, bm, () => shutdown());
          }
          const commandResponse: CommandResponse = { ok: true, data: result };
          return new Response(JSON.stringify(commandResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error: unknown) {
          manager.incrementFailures();
          const baseError = error instanceof Error ? error.message : String(error);
          const hint = manager.getFailureHint();
          const commandError: CommandResponse = {
            ok: false,
            error: hint ? `${baseError}\n${hint}` : baseError,
          };
          return new Response(JSON.stringify(commandError), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response('Not found', { status: 404 });
    },
  });

  const state: ServerState = {
    pid: process.pid,
    port,
    token: authToken,
    startedAt,
    serverPath: path.resolve(import.meta.dir, 'server.ts'),
    binaryVersion: readVersionHash() || undefined,
  };

  writeStateFile(config, state);
  manager.serverPort = port;

  const idleCheckInterval = setInterval(() => {
    if (Date.now() - lastActivity > idleTimeoutMs) {
      log(`[browse] Idle for ${idleTimeoutMs / 1000}s, shutting down`);
      void shutdown();
    }
  }, 60_000);

  const shutdown = async (): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    clearInterval(flushInterval);
    clearInterval(idleCheckInterval);

    await flushBuffers();
    server.stop();
    await manager.close();

    try {
      fs.unlinkSync(config.stateFile);
    } catch {
      return;
    }
  };

  process.on('SIGTERM', () => {
    void shutdown();
  });

  process.on('SIGINT', () => {
    void shutdown();
  });

  addConsoleEntry({ timestamp: Date.now(), level: 'info', text: 'browser daemon started' });
  addNetworkEntry({ timestamp: Date.now(), method: 'SERVER', url: `http://127.0.0.1:${port}` });
  addDialogEntry({
    timestamp: Date.now(),
    type: 'info',
    message: 'server ready',
    action: 'accepted',
  });

  log(`[browse] Server running on http://127.0.0.1:${port} (PID: ${process.pid})`);
  log(`[browse] State file: ${config.stateFile}`);

  return {
    config,
    token: authToken,
    port,
    state,
    shutdown,
  };
}
