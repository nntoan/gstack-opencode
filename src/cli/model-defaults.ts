import type { AgentRole } from '../types/agent.ts';
import { ROLE_FALLBACKS } from './model-default-chains.ts';
import { transformModelForProvider } from './model-id-transform.ts';

export interface InstallSelection {
  claudePlan: 'none' | 'pro' | 'max';
  hasOpenAI: boolean;
  hasGemini: boolean;
  hasCopilot: boolean;
  hasOpencodeZen: boolean;
  hasZaiCodingPlan: boolean;
  hasKimiForCoding: boolean;
  hasOpencodeGo: boolean;
}

interface ProviderAvailability {
  native: {
    claude: boolean;
    openai: boolean;
    gemini: boolean;
  };
  opencodeZen: boolean;
  copilot: boolean;
  zai: boolean;
  kimiForCoding: boolean;
  opencodeGo: boolean;
}

const ULTIMATE_FALLBACK_MODEL = 'opencode/gpt-5-nano';

function toAvailability(selection: InstallSelection): ProviderAvailability {
  return {
    native: {
      claude: selection.claudePlan !== 'none',
      openai: selection.hasOpenAI,
      gemini: selection.hasGemini,
    },
    opencodeZen: selection.hasOpencodeZen,
    copilot: selection.hasCopilot,
    zai: selection.hasZaiCodingPlan,
    kimiForCoding: selection.hasKimiForCoding,
    opencodeGo: selection.hasOpencodeGo,
  };
}

function isProviderAvailable(provider: string, availability: ProviderAvailability): boolean {
  const mapping: Record<string, boolean> = {
    anthropic: availability.native.claude,
    openai: availability.native.openai,
    google: availability.native.gemini,
    'github-copilot': availability.copilot,
    opencode: availability.opencodeZen,
    'zai-coding-plan': availability.zai,
    'kimi-for-coding': availability.kimiForCoding,
    'opencode-go': availability.opencodeGo,
  };
  return mapping[provider] ?? false;
}

function resolveModel(
  chain: (typeof ROLE_FALLBACKS)[AgentRole],
  availability: ProviderAvailability
): string {
  for (const entry of chain) {
    for (const provider of entry.providers) {
      if (isProviderAvailable(provider, availability)) {
        const transformed = transformModelForProvider(provider, entry.model);
        return `${provider}/${transformed}`;
      }
    }
  }

  return ULTIMATE_FALLBACK_MODEL;
}

export function getDefaultInstallSelection(): InstallSelection {
  return {
    claudePlan: 'none',
    hasOpenAI: false,
    hasGemini: false,
    hasCopilot: false,
    hasOpencodeZen: false,
    hasZaiCodingPlan: false,
    hasKimiForCoding: false,
    hasOpencodeGo: false,
  };
}

export function resolveAgentModelDefaults(selection: InstallSelection): Record<AgentRole, string> {
  const availability = toAvailability(selection);
  const defaults = {} as Record<AgentRole, string>;

  const roles = Object.keys(ROLE_FALLBACKS) as AgentRole[];
  for (const role of roles) {
    defaults[role] = resolveModel(ROLE_FALLBACKS[role], availability);
  }

  return defaults;
}
