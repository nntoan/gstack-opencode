import * as p from '@clack/prompts';
import type { InstallSelection } from './model-defaults.ts';

/**
 * Prompt the user interactively for provider subscriptions using @clack/prompts.
 * Returns the selected configuration, or `null` if the user cancelled (Ctrl+C).
 */
export async function promptInstallSelection(
  defaults: InstallSelection
): Promise<InstallSelection | null> {
  const claudePlan = await selectOrCancel<'none' | 'pro' | 'max'>({
    message: 'Do you have a Claude Pro/Max subscription?',
    options: [
      { value: 'none', label: 'No', hint: 'Will use other configured providers' },
      { value: 'pro', label: 'Yes (standard)', hint: 'Claude Pro subscription' },
      {
        value: 'max',
        label: 'Yes (max20 mode)',
        hint: 'Full power with Claude Opus 4.6 for CEO',
      },
    ],
    initialValue: defaults.claudePlan,
  });
  if (claudePlan === null) return null;

  const hasOpenAI = await selectBooleanOrCancel({
    message: 'Do you have an OpenAI/ChatGPT Plus subscription?',
    initialValue: defaults.hasOpenAI,
    noHint: 'Will use other configured providers',
  });
  if (hasOpenAI === null) return null;

  const hasGemini = await selectBooleanOrCancel({
    message: 'Will you integrate Google Gemini?',
    initialValue: defaults.hasGemini,
    noHint: 'Will use other configured providers',
  });
  if (hasGemini === null) return null;

  const hasCopilot = await selectBooleanOrCancel({
    message: 'Do you have a GitHub Copilot subscription?',
    initialValue: defaults.hasCopilot,
    noHint: 'Will use other configured providers',
  });
  if (hasCopilot === null) return null;

  const hasOpencodeZen = await selectBooleanOrCancel({
    message: 'Do you have access to OpenCode Zen (opencode/ models)?',
    initialValue: defaults.hasOpencodeZen,
    noHint: 'Will use other configured providers',
  });
  if (hasOpencodeZen === null) return null;

  const hasZaiCodingPlan = await selectBooleanOrCancel({
    message: 'Do you have a Z.ai Coding Plan subscription?',
    initialValue: defaults.hasZaiCodingPlan,
    noHint: 'Will use other configured providers',
  });
  if (hasZaiCodingPlan === null) return null;

  const hasKimiForCoding = await selectBooleanOrCancel({
    message: 'Do you have a Kimi For Coding subscription?',
    initialValue: defaults.hasKimiForCoding,
    noHint: 'Will use other configured providers',
  });
  if (hasKimiForCoding === null) return null;

  const hasOpencodeGo = await selectBooleanOrCancel({
    message: 'Do you have access to OpenCode Go?',
    initialValue: defaults.hasOpencodeGo,
    noHint: 'Will use other configured providers',
  });
  if (hasOpencodeGo === null) return null;

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

type Primitive = string | boolean | number;

interface SelectParams<T extends Primitive> {
  message: string;
  options: Array<{ value: T; label?: string; hint?: string }>;
  initialValue?: T;
}

async function selectOrCancel<T extends Primitive>(params: SelectParams<T>): Promise<T | null> {
  const value = await p.select<T>({
    message: params.message,
    options: params.options as Parameters<typeof p.select<T>>[0]['options'],
    initialValue: params.initialValue,
  });

  if (p.isCancel(value)) {
    p.cancel('Installation cancelled.');
    return null;
  }

  return value as T;
}

interface BooleanSelectParams {
  message: string;
  initialValue: boolean;
  noHint?: string;
}

async function selectBooleanOrCancel(params: BooleanSelectParams): Promise<boolean | null> {
  return selectOrCancel<boolean>({
    message: params.message,
    options: [
      { value: false, label: 'No', hint: params.noHint },
      { value: true, label: 'Yes' },
    ],
    initialValue: params.initialValue,
  });
}
