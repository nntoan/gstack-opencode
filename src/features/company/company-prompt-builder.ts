import type { SprintPhase } from '../../types/agent.ts';
import type { BuiltinSkill } from '../../types/skill.ts';

export interface CompanyPromptInput {
  phase: SprintPhase;
  skills: Pick<BuiltinSkill, 'name' | 'description'>[];
  specialistInstructions?: string;
  runtimeSummary?: string;
}

const PERSONA_LABELS: RegExp[] = [/\bYou are\s+/gi, /\bRole:\s*/gi, /\bAgent:\s*/gi];

const HIDDEN_SPECIALIST_TOKENS: RegExp[] = [
  /\bbuilder\b/gi,
  /\bqa-lead\b/gi,
  /\bceo\b/gi,
  /\beng-manager\b/gi,
  /\bdesigner\b/gi,
  /\breviewer\b/gi,
  /\bdebugger\b/gi,
  /\brelease-engineer\b/gi,
  /\bdoc-engineer\b/gi,
  /\bretro-lead\b/gi,
  /\bsafety-guard\b/gi,
  /\bupgrader\b/gi,
  /\bsession-manager\b/gi,
];

function sanitizeInstructionText(value: string): string {
  let sanitized = value;

  for (const label of PERSONA_LABELS) {
    sanitized = sanitized.replace(label, '');
  }

  for (const token of HIDDEN_SPECIALIST_TOKENS) {
    sanitized = sanitized.replace(token, 'specialist');
  }

  return sanitized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

export function buildCompanySystemPrompt(input: CompanyPromptInput): string {
  const lines: string[] = ['## The Company — Active Context', '', `**Phase:** ${input.phase}`];

  if (input.runtimeSummary) {
    lines.push(`**Status:** ${input.runtimeSummary}`);
  }

  const sanitizedInstructions = input.specialistInstructions
    ? sanitizeInstructionText(input.specialistInstructions)
    : '';

  if (sanitizedInstructions) {
    lines.push('', '### Execution Guidance', '', sanitizedInstructions);
  }

  if (input.skills.length > 0) {
    lines.push('', '### Available Capabilities', '');
    for (const skill of input.skills) {
      lines.push(`- **/${skill.name}**: ${skill.description}`);
    }
  }

  return lines.join('\n');
}
