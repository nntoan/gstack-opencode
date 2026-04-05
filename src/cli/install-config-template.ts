import { SCHEMA_URL } from '../config/schema/constants.ts';
import type { InstallSelection } from './model-defaults.ts';
import { resolveAgentModelDefaults } from './model-defaults.ts';

export interface InstallTemplateData {
  selection: InstallSelection;
  models: ReturnType<typeof resolveAgentModelDefaults>;
}

export function buildInstallTemplateData(selection: InstallSelection): InstallTemplateData {
  return {
    selection,
    models: resolveAgentModelDefaults(selection),
  };
}

export function buildConfigTemplate(selection: InstallSelection): string {
  const { models: defaults } = buildInstallTemplateData(selection);

  const agentsObj: Record<string, { model: string }> = {
    ceo: { model: defaults.ceo },
    'eng-manager': { model: defaults['eng-manager'] },
    designer: { model: defaults.designer },
    builder: { model: defaults.builder },
    reviewer: { model: defaults.reviewer },
    debugger: { model: defaults.debugger },
    'qa-lead': { model: defaults['qa-lead'] },
    'release-engineer': { model: defaults['release-engineer'] },
    'doc-engineer': { model: defaults['doc-engineer'] },
    'retro-lead': { model: defaults['retro-lead'] },
    'safety-guard': { model: defaults['safety-guard'] },
    upgrader: { model: defaults.upgrader },
    'session-manager': { model: defaults['session-manager'] },
  };

  const config = {
    $schema: SCHEMA_URL,
    categories: {
      'visual-engineering': {
        model: 'google/gemini-3-pro',
        variant: 'high',
      },
      ultrabrain: {
        model: 'openai/gpt-5.3-codex',
        variant: 'xhigh',
      },
      deep: {
        model: 'openai/gpt-5.3-codex',
        variant: 'medium',
      },
      artistry: {
        model: 'google/gemini-3-pro',
        variant: 'high',
      },
      quick: {
        model: 'anthropic/claude-haiku-4-5',
      },
      'unspecified-low': {
        model: 'anthropic/claude-sonnet-4-6',
      },
      'unspecified-high': {
        model: 'anthropic/claude-opus-4-6',
        variant: 'max',
      },
      writing: {
        model: 'kimi-for-coding/k2p5',
      },
    },
    agents: agentsObj,
  };

  return `${JSON.stringify(config, null, 2)}\n`;
}
