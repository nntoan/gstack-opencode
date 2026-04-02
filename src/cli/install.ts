import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import * as path from 'path';
import { parse as parseJsonc } from 'jsonc-parser';
import { buildConfigTemplate, buildInstallTemplateData } from './install-config-template.ts';
import { promptInstallSelection } from './install-selection-prompts.ts';
import { getDefaultInstallSelection, type InstallSelection } from './model-defaults.ts';
import { resolveInstallSelectionFromCli, type InstallCliArgs } from './install-options.ts';
import { deepMerge } from '../shared/deep-merge.ts';

interface InstallOptions {
  homeDir: string;
  promptForSelection?: boolean;
  defaultSelection?: InstallSelection;
  stdout: {
    write: (chunk: string) => unknown;
  };
  stdin?: {
    read: () => Promise<string>;
  };
}

interface InstallResult {
  selection: InstallSelection;
  generatedModels: Record<string, string>;
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

function writeConfigWithMerge(configPath: string, template: string): void {
  const nextConfig = parseObjectConfig(template) ?? {};

  if (!existsSync(configPath)) {
    writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf-8');
    return;
  }

  const stat = statSync(configPath);
  const existingRaw = readFileSync(configPath, 'utf-8');
  if (stat.size === 0 || existingRaw.trim().length === 0) {
    writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf-8');
    return;
  }

  const existingConfig = parseObjectConfig(existingRaw);
  if (!existingConfig) {
    writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf-8');
    return;
  }

  const merged = deepMerge(nextConfig, existingConfig) ?? nextConfig;
  writeFileSync(configPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');
}

async function readLineFromStdin(): Promise<string> {
  return await new Promise<string>((resolve) => {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (chunk: string) => {
      resolve(chunk);
    });
  });
}

export async function runInstallWithOptions(options: InstallOptions): Promise<InstallResult> {
  const globalConfigDir: string = path.join(options.homeDir, '.config', 'opencode');
  const globalConfigPath: string = path.join(globalConfigDir, 'gstack.jsonc');

  mkdirSync(globalConfigDir, { recursive: true });

  const initialSelection = options.defaultSelection ?? getDefaultInstallSelection();
  let selection = initialSelection;

  if (options.promptForSelection && options.stdin) {
    selection = await promptInstallSelection(
      {
        write: options.stdout.write.bind(options.stdout),
        read: options.stdin.read,
      },
      initialSelection
    );
  }

  const templateData = buildInstallTemplateData(selection);
  const template = buildConfigTemplate(selection);

  if (!existsSync(globalConfigPath)) {
    writeConfigWithMerge(globalConfigPath, template);
    options.stdout.write(`Created global config: ${globalConfigPath}\n`);
  } else {
    writeConfigWithMerge(globalConfigPath, template);
    options.stdout.write(`Global config already exists: ${globalConfigPath} (merged)\n`);
  }

  ensurePluginInGlobalConfig(options);
  options.stdout.write('gstack install completed successfully\n');

  return {
    selection,
    generatedModels: templateData.models,
  };
}

export async function runInstall(): Promise<void> {
  const homeDir: string = process.env.HOME ?? '';
  if (!homeDir) {
    process.stderr.write('Unable to resolve HOME for global OpenCode config\n');
    process.exitCode = 1;
    return;
  }

  const cliArgs = parseInstallCliArgs(process.argv.slice(2));

  await runInstallWithOptions({
    homeDir,
    promptForSelection: !cliArgs.nonInteractive && process.stdin.isTTY && process.stdout.isTTY,
    defaultSelection: resolveInstallSelectionFromCli(cliArgs) ?? getDefaultInstallSelection(),
    stdout: process.stdout,
    stdin: {
      read: readLineFromStdin,
    },
  });

  process.stdout.write(
    'Run `opencode auth login` for providers you selected (OpenAI/Anthropic/Gemini/Copilot).\n'
  );
}

function parseInstallCliArgs(argv: string[]): InstallCliArgs {
  const getArg = (name: string): string | undefined => {
    const index = argv.findIndex((item) => item === name);
    if (index < 0) return undefined;
    return argv[index + 1];
  };

  return {
    claude: getArg('--claude'),
    openai: getArg('--openai'),
    gemini: getArg('--gemini'),
    copilot: getArg('--copilot'),
    opencodeZen: getArg('--opencode-zen'),
    zaiCodingPlan: getArg('--zai-coding-plan'),
    kimiForCoding: getArg('--kimi-for-coding'),
    opencodeGo: getArg('--opencode-go'),
    nonInteractive: argv.includes('--non-interactive'),
  };
}
