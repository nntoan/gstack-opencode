import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { parse as parseJsonc } from 'jsonc-parser';
import { SCHEMA_URL } from '../config/schema/constants.ts';

const PROJECT_CONFIG_TEMPLATE = `{
  "$schema": "${SCHEMA_URL}",
  // Orchestration mode: "multi-agent" (default) or "skills-only" (backward compat)
  "orchestration_mode": "multi-agent",
  // Agents to disable (e.g. ["designer", "retro-lead"])
  "disabled_agents": [],
  // Skills to disable
  "disabled_skills": []
}
`;

interface InstallOptions {
  cwd: string;
  homeDir: string;
  stdout: {
    write: (chunk: string) => unknown;
  };
}

function parseObjectConfig(raw: string): Record<string, unknown> | null {
  const parseErrors: Array<{ error: number; offset: number; length: number }> = [];
  const parsed: unknown = parseJsonc(raw, parseErrors);
  if (parseErrors.length > 0 || !parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

function ensurePluginInGlobalConfig(options: InstallOptions): void {
  const configDir: string = path.join(options.homeDir, '.config', 'opencode');
  const configPath: string = path.join(configDir, 'opencode.json');

  mkdirSync(configDir, { recursive: true });

  const baseConfig: Record<string, unknown> = existsSync(configPath)
    ? (parseObjectConfig(readFileSync(configPath, 'utf-8')) ?? {})
    : {};

  const pluginValue: unknown = baseConfig.plugin;
  const plugins: string[] = Array.isArray(pluginValue)
    ? pluginValue.filter((item): item is string => typeof item === 'string')
    : [];

  if (!plugins.includes('@nntoan/gstack')) {
    plugins.push('@nntoan/gstack');
    const nextConfig: Record<string, unknown> = { ...baseConfig, plugin: plugins };
    writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf-8');
    options.stdout.write(`Updated OpenCode plugin list: ${configPath}\n`);
    return;
  }

  options.stdout.write('OpenCode plugin list already contains @nntoan/gstack\n');
}

export async function runInstallWithOptions(options: InstallOptions): Promise<void> {
  const opencodeDir: string = path.join(options.cwd, '.opencode');
  const configPath: string = path.join(opencodeDir, 'gstack.jsonc');

  mkdirSync(opencodeDir, { recursive: true });

  if (!existsSync(configPath)) {
    writeFileSync(configPath, PROJECT_CONFIG_TEMPLATE, 'utf-8');
    options.stdout.write(`Created project config: ${configPath}\n`);
  } else {
    options.stdout.write(`Project config already exists: ${configPath}\n`);
  }

  ensurePluginInGlobalConfig(options);
  options.stdout.write('gstack install completed successfully\n');
}

export async function runInstall(): Promise<void> {
  const homeDir: string = process.env.HOME ?? '';
  if (!homeDir) {
    process.stderr.write('Unable to resolve HOME for global OpenCode config\n');
    process.exitCode = 1;
    return;
  }

  await runInstallWithOptions({
    cwd: process.cwd(),
    homeDir,
    stdout: process.stdout,
  });
}
