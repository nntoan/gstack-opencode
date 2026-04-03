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

function parseBooleanFlagWithDefault(
  explicitValue: string | undefined,
  fallbackValue: string | undefined
): boolean | undefined {
  const fromExplicit = parseBooleanFlag(explicitValue);
  if (fromExplicit !== undefined) return fromExplicit;
  return parseBooleanFlag(fallbackValue);
}

function parseClaudePlanWithDefault(
  explicitValue: string | undefined,
  fallbackValue: string | undefined
): 'none' | 'pro' | 'max' | undefined {
  const fromExplicit = parseClaudePlan(explicitValue);
  if (fromExplicit !== undefined) return fromExplicit;
  return parseClaudePlan(fallbackValue);
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

  const claudePlan = parseClaudePlanWithDefault(args.claude, process.env.GSTACK_INSTALL_CLAUDE);
  const hasOpenAI = parseBooleanFlagWithDefault(args.openai, process.env.GSTACK_INSTALL_OPENAI);
  const hasGemini = parseBooleanFlagWithDefault(args.gemini, process.env.GSTACK_INSTALL_GEMINI);
  const hasCopilot = parseBooleanFlagWithDefault(args.copilot, process.env.GSTACK_INSTALL_COPILOT);
  const hasOpencodeZen = parseBooleanFlagWithDefault(
    args.opencodeZen,
    process.env.GSTACK_INSTALL_OPENCODE_ZEN
  );
  const hasZaiCodingPlan = parseBooleanFlagWithDefault(
    args.zaiCodingPlan,
    process.env.GSTACK_INSTALL_ZAI_CODING_PLAN
  );
  const hasKimiForCoding = parseBooleanFlagWithDefault(
    args.kimiForCoding,
    process.env.GSTACK_INSTALL_KIMI_FOR_CODING
  );
  const hasOpencodeGo = parseBooleanFlagWithDefault(
    args.opencodeGo,
    process.env.GSTACK_INSTALL_OPENCODE_GO
  );

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
