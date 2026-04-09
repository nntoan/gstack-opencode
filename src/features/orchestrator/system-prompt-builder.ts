import type { AgentSurfaceMode } from '../../types/config.ts';
import { buildCompanySystemPrompt } from '../company/company-prompt-builder.ts';
import type { DelegationResult } from './delegation-engine.ts';

export interface SystemPromptBuildOptions {
  mode?: AgentSurfaceMode;
}

export function buildDelegationSystemPrompt(
  result: DelegationResult,
  options: SystemPromptBuildOptions = {}
): string {
  const { mode = 'legacy-multi' } = options;

  if (mode === 'company') {
    return buildCompanySystemPrompt({
      phase: result.phase,
      skills: result.skills.map(({ name, description }) => ({ name, description })),
      specialistInstructions: result.agent.instructions,
    });
  }

  const lines: string[] = [];

  lines.push('## Active Agent Context');
  lines.push('');
  lines.push(`**Agent:** ${result.agent.name} (${result.agent.role})`);
  lines.push(`**Sprint Phase:** ${result.phase}`);
  lines.push(`**Reasoning:** ${result.reasoning}`);
  lines.push('');

  if (result.agent.instructions) {
    lines.push('### Agent Instructions');
    lines.push('');
    lines.push(result.agent.instructions);
    lines.push('');
  }

  if (result.skills.length > 0) {
    lines.push('### Active Skills');
    lines.push('');
    for (const skill of result.skills) {
      lines.push(`#### /${skill.name}`);
      lines.push(skill.description);
      lines.push('');
    }
  }

  return lines.join('\n');
}
