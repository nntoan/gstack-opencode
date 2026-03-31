import { getDefaultInstallSelection, type InstallSelection } from './model-defaults.ts';

export interface InstallCliArgs {
  claude?: string;
  openai?: string;
  gemini?: string;
  copilot?: string;
  opencodeZen?: string;
  zaiCodingPlan?: string;
  kimiForCoding?: string;
  opencodeGo?: string;
  nonInteractive?: boolean;
}

function parseBooleanFlag(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(normalized)) return true;
  if (['no', 'n', 'false', '0'].includes(normalized)) return false;
  return undefined;
}

function parseClaudePlan(value: string | undefined): 'none' | 'pro' | 'max' | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['none', 'no'].includes(normalized)) return 'none';
  if (['pro', 'yes', 'standard'].includes(normalized)) return 'pro';
  if (['max', 'max20'].includes(normalized)) return 'max';
  return undefined;
}

export function resolveInstallSelectionFromCli(args: InstallCliArgs): InstallSelection | null {
  const selection = getDefaultInstallSelection();

  const claudePlan = parseClaudePlan(args.claude);
  const hasOpenAI = parseBooleanFlag(args.openai);
  const hasGemini = parseBooleanFlag(args.gemini);
  const hasCopilot = parseBooleanFlag(args.copilot);
  const hasOpencodeZen = parseBooleanFlag(args.opencodeZen);
  const hasZaiCodingPlan = parseBooleanFlag(args.zaiCodingPlan);
  const hasKimiForCoding = parseBooleanFlag(args.kimiForCoding);
  const hasOpencodeGo = parseBooleanFlag(args.opencodeGo);

  const hasAnyArg =
    claudePlan !== undefined ||
    hasOpenAI !== undefined ||
    hasGemini !== undefined ||
    hasCopilot !== undefined ||
    hasOpencodeZen !== undefined ||
    hasZaiCodingPlan !== undefined ||
    hasKimiForCoding !== undefined ||
    hasOpencodeGo !== undefined;

  if (!hasAnyArg) return null;

  return {
    claudePlan: claudePlan ?? selection.claudePlan,
    hasOpenAI: hasOpenAI ?? selection.hasOpenAI,
    hasGemini: hasGemini ?? selection.hasGemini,
    hasCopilot: hasCopilot ?? selection.hasCopilot,
    hasOpencodeZen: hasOpencodeZen ?? selection.hasOpencodeZen,
    hasZaiCodingPlan: hasZaiCodingPlan ?? selection.hasZaiCodingPlan,
    hasKimiForCoding: hasKimiForCoding ?? selection.hasKimiForCoding,
    hasOpencodeGo: hasOpencodeGo ?? selection.hasOpencodeGo,
  };
}
