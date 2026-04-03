import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parse as parseJsonc } from 'jsonc-parser';
import { GstackConfigSchema } from './config/schema/index.ts';
import type { GstackConfig } from './types/config.ts';
import { log } from './shared/index.ts';
import { deepMerge } from './shared/deep-merge.ts';
import { mergeConfigs } from './config/merge-configs.ts';

const PARTIAL_STRING_ARRAY_KEYS = new Set([
  'disabled_mcps',
  'disabled_agents',
  'disabled_skills',
  'disabled_hooks',
]);

export function parseConfigPartially(
  rawConfig: Record<string, unknown>
): Partial<GstackConfig> | null {
  const fullResult = GstackConfigSchema.safeParse(rawConfig);
  if (fullResult.success) return fullResult.data;

  const partialConfig: Record<string, unknown> = {};
  const invalidSections: string[] = [];

  for (const key of Object.keys(rawConfig)) {
    if (PARTIAL_STRING_ARRAY_KEYS.has(key)) {
      const sectionValue = rawConfig[key];
      if (Array.isArray(sectionValue) && sectionValue.every((v) => typeof v === 'string')) {
        partialConfig[key] = sectionValue;
      }
      continue;
    }

    const sectionResult = GstackConfigSchema.safeParse({ [key]: rawConfig[key] });
    if (sectionResult.success) {
      const parsed = sectionResult.data as Record<string, unknown>;
      if (parsed[key] !== undefined) {
        partialConfig[key] = parsed[key];
      }
    } else {
      const sectionErrors = sectionResult.error.issues
        .filter((i) => i.path[0] === key)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ');
      if (sectionErrors) invalidSections.push(`${key}: ${sectionErrors}`);
    }
  }

  if (invalidSections.length > 0) {
    log('Partial config loaded — invalid sections skipped:', invalidSections);
  }

  return partialConfig as Partial<GstackConfig>;
}

export function loadConfigFromPath(
  configPath: string,
  _ctx: unknown
): Partial<GstackConfig> | null {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const parseErrors: Array<{ error: number; offset: number; length: number }> = [];
      const parsed = parseJsonc(content, parseErrors);

      if (parseErrors.length > 0) {
        log(`Config JSONC parse error in ${configPath}:`, parseErrors);
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        log(`Config root must be an object in ${configPath}`);
        return null;
      }

      const rawConfig = parsed as Record<string, unknown>;
      const result = GstackConfigSchema.safeParse(rawConfig);
      if (result.success) {
        log(`Config loaded from ${configPath}`);
        return result.data;
      }

      const errorMsg = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ');
      log(`Config validation error in ${configPath}: ${errorMsg}`);

      const partialResult = parseConfigPartially(rawConfig);
      if (partialResult) {
        log(`Partial config loaded from ${configPath}`);
        return partialResult;
      }

      return null;
    }
  } catch (err) {
    log(`Error loading config from ${configPath}:`, err);
  }

  return null;
}

export function loadPluginConfig(directory: string, _ctx: unknown): GstackConfig {
  const homeDir = process.env.HOME || os.homedir();
  const userConfigDir = path.join(homeDir, '.config', 'opencode');
  const userConfigPath = path.join(userConfigDir, 'gstack.jsonc');
  const userConfigPathJson = path.join(userConfigDir, 'gstack.json');
  const projectConfigPath = path.join(directory, '.opencode', 'gstack.jsonc');
  const projectConfigPathJson = path.join(directory, '.opencode', 'gstack.json');

  const userPath = fs.existsSync(userConfigPath) ? userConfigPath : userConfigPathJson;
  const projectPath = fs.existsSync(projectConfigPath) ? projectConfigPath : projectConfigPathJson;

  let config: Partial<GstackConfig> = loadConfigFromPath(userPath, null) ?? {};
  const projectConfig = loadConfigFromPath(projectPath, null);
  if (projectConfig) {
    const baseDefaults = GstackConfigSchema.parse({});
    const normalizedBase = deepMerge(baseDefaults, config as GstackConfig) ?? baseDefaults;
    config = mergeConfigs(normalizedBase, projectConfig);
  }

  const result = GstackConfigSchema.safeParse(config);
  if (result.success) return result.data;

  log('Final config parse failed, using defaults');
  return GstackConfigSchema.parse({});
}
