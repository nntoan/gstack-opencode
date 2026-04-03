import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { parse as parseJsonc } from 'jsonc-parser';
import { getDefaultInstallSelection, type InstallSelection } from './model-defaults.ts';

export interface DetectedConfig {
  exists: boolean;
  selection: InstallSelection;
}

export function detectExistingConfig(homeDir: string): DetectedConfig {
  const configDir = path.join(homeDir, '.config', 'opencode');
  const jsoncPath = path.join(configDir, 'gstack.jsonc');
  const jsonPath = path.join(configDir, 'gstack.json');
  const configPath = existsSync(jsoncPath) ? jsoncPath : jsonPath;
  const defaults = getDefaultInstallSelection();

  if (!existsSync(configPath)) {
    return { exists: false, selection: defaults };
  }

  const raw = readFileSync(configPath, 'utf-8').trim();
  if (raw.length === 0) {
    return { exists: false, selection: defaults };
  }

  const parseErrors: Array<{ error: number; offset: number; length: number }> = [];
  const parsed: unknown = parseJsonc(raw, parseErrors);
  if (parseErrors.length > 0 || !parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { exists: true, selection: defaults };
  }

  const config = parsed as Record<string, unknown>;
  const selection = extractSelectionFromConfig(config, defaults);

  return { exists: true, selection };
}

function extractSelectionFromConfig(
  config: Record<string, unknown>,
  defaults: InstallSelection
): InstallSelection {
  const installSelection = config.install_selection as Record<string, unknown> | undefined;
  if (installSelection && typeof installSelection === 'object') {
    return extractFromInstallSelection(installSelection, defaults);
  }

  const agents = config.agents as Record<string, Record<string, unknown>> | undefined;
  if (agents && typeof agents === 'object') {
    return inferFromAgentModels(agents, defaults);
  }

  return defaults;
}

function extractFromInstallSelection(
  selection: Record<string, unknown>,
  defaults: InstallSelection
): InstallSelection {
  return {
    claudePlan: parseClaudePlan(selection.claude_plan) ?? defaults.claudePlan,
    hasOpenAI: parseBool(selection.has_openai) ?? defaults.hasOpenAI,
    hasGemini: parseBool(selection.has_gemini) ?? defaults.hasGemini,
    hasCopilot: parseBool(selection.has_copilot) ?? defaults.hasCopilot,
    hasOpencodeZen: parseBool(selection.has_opencode_zen) ?? defaults.hasOpencodeZen,
    hasZaiCodingPlan: parseBool(selection.has_zai_coding_plan) ?? defaults.hasZaiCodingPlan,
    hasKimiForCoding: parseBool(selection.has_kimi_for_coding) ?? defaults.hasKimiForCoding,
    hasOpencodeGo: parseBool(selection.has_opencode_go) ?? defaults.hasOpencodeGo,
  };
}

function inferFromAgentModels(
  agents: Record<string, Record<string, unknown>>,
  defaults: InstallSelection
): InstallSelection {
  const allModels = Object.values(agents)
    .map((a) => (typeof a.model === 'string' ? a.model : ''))
    .join(' ');

  return {
    claudePlan: allModels.includes('claude-opus')
      ? 'max'
      : allModels.includes('anthropic/')
        ? 'pro'
        : defaults.claudePlan,
    hasOpenAI: allModels.includes('openai/') || defaults.hasOpenAI,
    hasGemini: allModels.includes('google/') || defaults.hasGemini,
    hasCopilot: allModels.includes('github-copilot/') || defaults.hasCopilot,
    hasOpencodeZen: allModels.includes('opencode/') || defaults.hasOpencodeZen,
    hasZaiCodingPlan: allModels.includes('zai-coding-plan/') || defaults.hasZaiCodingPlan,
    hasKimiForCoding: allModels.includes('kimi-for-coding/') || defaults.hasKimiForCoding,
    hasOpencodeGo: allModels.includes('opencode-go/') || defaults.hasOpencodeGo,
  };
}

function parseClaudePlan(value: unknown): 'none' | 'pro' | 'max' | undefined {
  if (typeof value !== 'string') return undefined;
  if (['none', 'pro', 'max'].includes(value)) return value as 'none' | 'pro' | 'max';
  return undefined;
}

function parseBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}
