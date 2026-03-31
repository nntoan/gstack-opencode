import { describe, it, expect } from 'vitest';
import { promptInstallSelection } from './install-selection-prompts.ts';
import { getDefaultInstallSelection } from './model-defaults.ts';

function createIo(answers: string[]): {
  output: string[];
  io: { write: (chunk: string) => unknown; read: () => Promise<string> };
} {
  const output: string[] = [];
  let index = 0;

  return {
    output,
    io: {
      write: (chunk: string): unknown => output.push(chunk),
      read: async (): Promise<string> => {
        const answer = answers[index] ?? '';
        index += 1;
        return answer;
      },
    },
  };
}

describe('promptInstallSelection', () => {
  it('uses defaults when answers are empty', async () => {
    const defaults = getDefaultInstallSelection();
    const { io } = createIo([]);

    const selection = await promptInstallSelection(io, defaults);
    expect(selection).toEqual(defaults);
  });

  it('parses explicit answers for full provider selection', async () => {
    const defaults = getDefaultInstallSelection();
    const { io } = createIo(['max', 'yes', 'y', '1', 'true', 'yes', 'yes', 'yes']);

    const selection = await promptInstallSelection(io, defaults);
    expect(selection).toEqual({
      claudePlan: 'max',
      hasOpenAI: true,
      hasGemini: true,
      hasCopilot: true,
      hasOpencodeZen: true,
      hasZaiCodingPlan: true,
      hasKimiForCoding: true,
      hasOpencodeGo: true,
    });
  });
});
