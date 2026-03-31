import { describe, it, expect } from 'vitest';
import { resolveInstallSelectionFromCli } from './install-options.ts';

describe('resolveInstallSelectionFromCli', () => {
  it('returns null when no provider flags are provided', () => {
    const result = resolveInstallSelectionFromCli({});
    expect(result).toBeNull();
  });

  it('maps CLI flags into normalized install selection', () => {
    const result = resolveInstallSelectionFromCli({
      claude: 'max20',
      openai: 'yes',
      gemini: 'yes',
      copilot: 'no',
      opencodeZen: 'yes',
      zaiCodingPlan: 'no',
      kimiForCoding: 'yes',
      opencodeGo: 'yes',
    });

    expect(result).toEqual({
      claudePlan: 'max',
      hasOpenAI: true,
      hasGemini: true,
      hasCopilot: false,
      hasOpencodeZen: true,
      hasZaiCodingPlan: false,
      hasKimiForCoding: true,
      hasOpencodeGo: true,
    });
  });
});
