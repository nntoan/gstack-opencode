import type { DelegationResult } from './delegation-engine.ts';

export function buildDelegationSystemPrompt(result: DelegationResult): string {
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
