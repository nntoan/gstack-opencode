import type { InstallSelection } from './model-defaults.ts';

export async function promptInstallSelection(
  io: {
    write: (chunk: string) => unknown;
    read: () => Promise<string>;
  },
  defaults: InstallSelection
): Promise<InstallSelection> {
  const claudePlan = await promptChoice(
    io,
    'Claude subscription [none/pro/max]',
    ['none', 'pro', 'max'],
    defaults.claudePlan
  );

  const hasOpenAI = await promptBoolean(
    io,
    'OpenAI/ChatGPT Plus available? [y/N]',
    defaults.hasOpenAI
  );
  const hasGemini = await promptBoolean(io, 'Google Gemini available? [y/N]', defaults.hasGemini);
  const hasCopilot = await promptBoolean(
    io,
    'GitHub Copilot available? [y/N]',
    defaults.hasCopilot
  );
  const hasOpencodeZen = await promptBoolean(
    io,
    'OpenCode Zen (opencode/*) available? [y/N]',
    defaults.hasOpencodeZen
  );
  const hasZaiCodingPlan = await promptBoolean(
    io,
    'Z.ai Coding Plan available? [y/N]',
    defaults.hasZaiCodingPlan
  );
  const hasKimiForCoding = await promptBoolean(
    io,
    'Kimi For Coding available? [y/N]',
    defaults.hasKimiForCoding
  );
  const hasOpencodeGo = await promptBoolean(
    io,
    'OpenCode Go available? [y/N]',
    defaults.hasOpencodeGo
  );

  return {
    claudePlan,
    hasOpenAI,
    hasGemini,
    hasCopilot,
    hasOpencodeZen,
    hasZaiCodingPlan,
    hasKimiForCoding,
    hasOpencodeGo,
  };
}

async function promptChoice(
  io: { write: (chunk: string) => unknown; read: () => Promise<string> },
  question: string,
  options: string[],
  defaultValue: string
): Promise<'none' | 'pro' | 'max'> {
  io.write(`${question} (default: ${defaultValue}): `);
  const answer = (await io.read()).trim().toLowerCase();
  const value = answer === '' ? defaultValue : answer;
  return (options.includes(value) ? value : defaultValue) as 'none' | 'pro' | 'max';
}

async function promptBoolean(
  io: { write: (chunk: string) => unknown; read: () => Promise<string> },
  question: string,
  defaultValue: boolean
): Promise<boolean> {
  io.write(`${question} `);
  const answer = (await io.read()).trim().toLowerCase();
  if (!answer) return defaultValue;
  return ['y', 'yes', 'true', '1'].includes(answer);
}
