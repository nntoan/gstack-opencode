import type { GateResult } from '../../types/quality-gate.ts';

export interface CompanyBlockerPromptInput {
  goal: string;
  currentStep: string;
  gateResults: GateResult[];
  nextPhase: string;
  checkpointId?: string;
  workflowId?: string;
  attemptCount?: number;
}

const CONSEQUENCE_BY_PHASE: Record<string, string> = {
  plan: 'The Company will hold at the current step until direction is confirmed.',
  build: 'The Company will hold at the current step until the blocker is resolved.',
  review: 'The Company will hold at the current step until the blocker is resolved.',
  test: 'The Company will hold at the current step until the issue is addressed.',
  ship: 'The Company will hold at the current step until it is safe to continue.',
};

function getConsequenceText(nextPhase: string, hasBlock: boolean): string {
  if (hasBlock) {
    return (
      CONSEQUENCE_BY_PHASE[nextPhase] ??
      'The Company will hold at the current step until the blocker is resolved.'
    );
  }
  return (
    CONSEQUENCE_BY_PHASE[nextPhase] ??
    'The Company will hold at the current step until direction is confirmed.'
  );
}

export function buildCompanyBlockerPrompt(input: CompanyBlockerPromptInput): string {
  const activeResults = input.gateResults.filter(
    (r) => r.verdict === 'block' || r.verdict === 'warn'
  );

  const hasBlock = activeResults.some((r) => r.verdict === 'block');
  const recommendation = hasBlock
    ? 'Resolve the blocker before continuing.'
    : 'Confirm the recommendation before continuing.';

  const consequence = getConsequenceText(input.nextPhase, hasBlock);

  const lines: string[] = [
    '## Company Decision Required',
    '',
    `**Goal:** ${input.goal}`,
    `**Current step:** ${input.currentStep}`,
    `**Recommendation:** ${recommendation}`,
    `**Consequence:** ${consequence}`,
    '',
    '### Why The Company paused',
    '',
  ];

  for (const result of activeResults) {
    lines.push(`- ${result.message}`);
  }

  return lines.join('\n');
}
