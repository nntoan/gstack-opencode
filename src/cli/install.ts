import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as p from '@clack/prompts';
import color from 'picocolors';
import { parse as parseJsonc } from 'jsonc-parser';
import { buildConfigTemplate, buildInstallTemplateData } from './install-config-template.ts';
import { promptInstallSelection } from './install-selection-prompts.ts';
import { detectExistingConfig } from './detect-existing-config.ts';
import { getDefaultInstallSelection, type InstallSelection } from './model-defaults.ts';
import { resolveInstallSelectionFromCli, type InstallCliArgs } from './install-options.ts';
import { deepMerge } from '../shared/deep-merge.ts';

export interface InstallOptions {
  homeDir: string;
  tui?: boolean;
  defaultSelection?: InstallSelection;
  overwriteAgentModels?: boolean;
}

export interface InstallResult {
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

function ensurePluginInGlobalConfig(homeDir: string): { updated: boolean; configPath: string } {
  const configDir: string = path.join(homeDir, '.config', 'opencode');
  const configPath: string = path.join(configDir, 'opencode.json');

  mkdirSync(configDir, { recursive: true });

  let baseConfig: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    const existingRaw = readFileSync(configPath, 'utf-8');
    if (existingRaw.trim().length > 0) {
      const parsed = parseObjectConfig(existingRaw);
      if (!parsed) {
        throw new Error(`Invalid JSON/JSONC in ${configPath}; refusing to overwrite existing file`);
      }
      baseConfig = parsed;
    }
  }

  const pluginValue: unknown = baseConfig.plugin;
  const plugins: string[] = Array.isArray(pluginValue)
    ? pluginValue.filter((item): item is string => typeof item === 'string')
    : [];

  if (!plugins.includes('@nntoan/gstack')) {
    plugins.push('@nntoan/gstack');
    const nextConfig: Record<string, unknown> = { ...baseConfig, plugin: plugins };
    writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf-8');
    return { updated: true, configPath };
  }

  return { updated: false, configPath };
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
    throw new Error(`Invalid JSON/JSONC in ${configPath}; refusing to overwrite existing file`);
  }

  const merged = deepMerge(nextConfig, existingConfig) ?? nextConfig;
  writeFileSync(configPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');
}

function writeConfigWithMergeOptions(options: {
  configPath: string;
  template: string;
  overwriteAgentModels: boolean;
}): void {
  const { configPath, template, overwriteAgentModels } = options;
  writeConfigWithMerge(configPath, template);

  if (!overwriteAgentModels) {
    return;
  }

  const writtenRaw = readFileSync(configPath, 'utf-8');
  const writtenConfig = parseObjectConfig(writtenRaw);
  const nextConfig = parseObjectConfig(template);
  if (!writtenConfig || !nextConfig) {
    return;
  }

  const existingAgents =
    writtenConfig.agents &&
    typeof writtenConfig.agents === 'object' &&
    !Array.isArray(writtenConfig.agents)
      ? (writtenConfig.agents as Record<string, Record<string, unknown>>)
      : {};
  const nextAgents =
    nextConfig.agents && typeof nextConfig.agents === 'object' && !Array.isArray(nextConfig.agents)
      ? (nextConfig.agents as Record<string, Record<string, unknown>>)
      : {};

  const mergedAgents: Record<string, Record<string, unknown>> = { ...existingAgents };
  for (const [role, nextAgent] of Object.entries(nextAgents)) {
    mergedAgents[role] = {
      ...(existingAgents[role] ?? {}),
      ...nextAgent,
    };
  }

  const rewritten = {
    ...writtenConfig,
    agents: mergedAgents,
  };
  writeFileSync(configPath, `${JSON.stringify(rewritten, null, 2)}\n`, 'utf-8');
}

function resolveGlobalConfigPath(homeDir: string): string {
  const configDir: string = path.join(homeDir, '.config', 'opencode');
  const jsoncPath = path.join(configDir, 'gstack.jsonc');
  const jsonPath = path.join(configDir, 'gstack.json');

  if (existsSync(jsoncPath)) return jsoncPath;
  if (existsSync(jsonPath)) return jsonPath;
  return jsoncPath;
}

export async function runInstallWithOptions(
  options: InstallOptions
): Promise<InstallResult | null> {
  const globalConfigDir: string = path.join(options.homeDir, '.config', 'opencode');
  const globalConfigPath: string = resolveGlobalConfigPath(options.homeDir);

  mkdirSync(globalConfigDir, { recursive: true });

  const initialSelection = options.defaultSelection ?? getDefaultInstallSelection();
  let selection = initialSelection;

  if (options.tui) {
    const result = await promptInstallSelection(initialSelection);
    if (result === null) return null;
    selection = result;
  }

  const templateData = buildInstallTemplateData(selection);
  const template = buildConfigTemplate(selection);

  writeConfigWithMergeOptions({
    configPath: globalConfigPath,
    template,
    overwriteAgentModels: options.overwriteAgentModels ?? false,
  });

  ensurePluginInGlobalConfig(options.homeDir);

  return {
    selection,
    generatedModels: templateData.models,
  };
}

export async function runInstall(): Promise<void> {
  const homeDir: string = process.env.HOME || os.homedir();
  if (!homeDir) {
    p.log.error('Unable to resolve HOME for global OpenCode config');
    process.exitCode = 1;
    return;
  }

  const cliArgs = parseInstallCliArgs(process.argv.slice(2));
  const isTty = process.stdin.isTTY === true && process.stdout.isTTY === true;
  const useTui = !cliArgs.nonInteractive && isTty;

  p.intro(color.bgMagenta(color.white(' gstack install ')));

  const detected = detectExistingConfig(homeDir);
  if (detected.exists) {
    const claudeLabel =
      detected.selection.claudePlan === 'max'
        ? 'max20'
        : detected.selection.claudePlan === 'pro'
          ? 'yes'
          : 'no';
    const geminiLabel = detected.selection.hasGemini ? 'yes' : 'no';
    p.log.info(`Existing configuration detected: Claude=${claudeLabel}, Gemini=${geminiLabel}`);
  }

  const cliSelection = resolveInstallSelectionFromCli(cliArgs);
  const defaultSelection = cliSelection ?? detected.selection;
  const overwriteAgentModels = useTui || cliSelection !== null;

  let result: InstallResult | null = null;
  const s = p.spinner();
  let spinnerStarted = false;

  try {
    if (useTui) {
      result = await runInstallWithOptions({
        homeDir,
        tui: true,
        defaultSelection,
        overwriteAgentModels,
      });
    } else {
      s.start('Writing configuration');
      spinnerStarted = true;
      result = await runInstallWithOptions({
        homeDir,
        tui: false,
        defaultSelection,
        overwriteAgentModels,
      });
      s.stop('Configuration written');
      spinnerStarted = false;
    }
  } catch (error) {
    if (spinnerStarted) {
      s.stop('Installation failed');
    }
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  if (result === null) {
    process.exitCode = 1;
    return;
  }

  const globalConfigPath = path.join(homeDir, '.config', 'opencode', 'gstack.jsonc');
  p.log.success(`Config: ${globalConfigPath}`);

  const providerNames: string[] = [];
  if (result.selection.claudePlan !== 'none') providerNames.push('Anthropic');
  if (result.selection.hasOpenAI) providerNames.push('OpenAI');
  if (result.selection.hasGemini) providerNames.push('Gemini');
  if (result.selection.hasCopilot) providerNames.push('Copilot');

  if (providerNames.length > 0) {
    p.log.info(`Run ${color.cyan('opencode auth login')} for: ${providerNames.join(', ')}`);
  }

  p.outro(color.green('gstack install completed successfully'));
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
