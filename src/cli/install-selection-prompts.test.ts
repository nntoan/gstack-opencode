import { describe, it, expect } from 'vitest';
import { getDefaultInstallSelection } from './model-defaults.ts';
import { detectExistingConfig } from './detect-existing-config.ts';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import * as path from 'path';
import { afterEach } from 'vitest';

function createTempRoot(name: string): string {
  const root = path.join(process.cwd(), '.memory', 'tests', name);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  return root;
}

afterEach(() => {
  rmSync(path.join(process.cwd(), '.memory', 'tests'), { recursive: true, force: true });
});

describe('detectExistingConfig', () => {
  it('returns defaults when config does not exist', () => {
    const root = createTempRoot('detect-no-config');
    const result = detectExistingConfig(root);

    expect(result.exists).toBe(false);
    expect(result.selection).toEqual(getDefaultInstallSelection());
  });

  it('detects existing gstack.json fallback when gstack.jsonc is absent', () => {
    const root = createTempRoot('detect-json-fallback');
    const configDir = path.join(root, '.config', 'opencode');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      path.join(configDir, 'gstack.json'),
      JSON.stringify({
        agents: {
          ceo: { model: 'github-copilot/claude-opus-4.6' },
        },
      }),
      'utf-8'
    );

    const result = detectExistingConfig(root);

    expect(result.exists).toBe(true);
    expect(result.selection.hasCopilot).toBe(true);
  });

  it('extracts selection from install_selection field', () => {
    const root = createTempRoot('detect-install-selection');
    const configDir = path.join(root, '.config', 'opencode');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      path.join(configDir, 'gstack.jsonc'),
      JSON.stringify({
        install_selection: {
          claude_plan: 'max',
          has_openai: true,
          has_gemini: false,
          has_copilot: true,
          has_opencode_zen: false,
          has_zai_coding_plan: false,
          has_kimi_for_coding: false,
          has_opencode_go: false,
        },
      }),
      'utf-8'
    );

    const result = detectExistingConfig(root);

    expect(result.exists).toBe(true);
    expect(result.selection.claudePlan).toBe('max');
    expect(result.selection.hasOpenAI).toBe(true);
    expect(result.selection.hasCopilot).toBe(true);
    expect(result.selection.hasGemini).toBe(false);
  });

  it('infers selection from agent model prefixes when no install_selection', () => {
    const root = createTempRoot('detect-infer-models');
    const configDir = path.join(root, '.config', 'opencode');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      path.join(configDir, 'gstack.jsonc'),
      JSON.stringify({
        agents: {
          ceo: { model: 'github-copilot/claude-opus-4.6' },
          builder: { model: 'openai/gpt-5.4' },
        },
      }),
      'utf-8'
    );

    const result = detectExistingConfig(root);

    expect(result.exists).toBe(true);
    expect(result.selection.hasCopilot).toBe(true);
    expect(result.selection.hasOpenAI).toBe(true);
  });

  it('returns defaults for empty config file', () => {
    const root = createTempRoot('detect-empty-file');
    const configDir = path.join(root, '.config', 'opencode');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(path.join(configDir, 'gstack.jsonc'), '', 'utf-8');

    const result = detectExistingConfig(root);

    expect(result.exists).toBe(false);
    expect(result.selection).toEqual(getDefaultInstallSelection());
  });
});
