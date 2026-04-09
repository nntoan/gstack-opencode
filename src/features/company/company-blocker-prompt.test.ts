import { describe, it, expect } from 'bun:test';
import { buildCompanyBlockerPrompt } from './company-blocker-prompt.ts';
import type { GateResult } from '../../types/quality-gate.ts';

const makeBlockInput = (overrides?: {
  goal?: string;
  currentStep?: string;
  gateResults?: GateResult[];
  nextPhase?: string;
}) => ({
  goal: overrides?.goal ?? 'Implement the authentication module',
  currentStep: overrides?.currentStep ?? 'build phase',
  gateResults: overrides?.gateResults ?? [
    {
      gateName: 'require-approved-plan',
      verdict: 'block' as const,
      message: 'No approved plan found',
    },
  ],
  nextPhase: overrides?.nextPhase ?? 'review',
});

const makeWarnInput = (overrides?: {
  goal?: string;
  currentStep?: string;
  gateResults?: GateResult[];
  nextPhase?: string;
}) => ({
  goal: overrides?.goal ?? 'Review the authentication module',
  currentStep: overrides?.currentStep ?? 'think phase',
  gateResults: overrides?.gateResults ?? [
    {
      gateName: 'require-user-confirmation',
      verdict: 'warn' as const,
      message: 'User has not confirmed direction',
    },
  ],
  nextPhase: overrides?.nextPhase ?? 'plan',
});

describe('buildCompanyBlockerPrompt', () => {
  it('Test 1: blocker prompts contain goal, current step, Company recommendation, and consequence', () => {
    const prompt = buildCompanyBlockerPrompt(makeBlockInput());

    expect(prompt).toContain('## Company Decision Required');
    expect(prompt).toContain('**Goal:**');
    expect(prompt).toContain('Implement the authentication module');
    expect(prompt).toContain('**Current step:**');
    expect(prompt).toContain('build phase');
    expect(prompt).toContain('**Recommendation:**');
    expect(prompt).toContain('**Consequence:**');
  });

  it('Test 2: blocker prompts render warn/block messages without specialist names, checkpoint ids, or attempt counters', () => {
    const prompt = buildCompanyBlockerPrompt({
      goal: 'Complete the task',
      currentStep: 'plan phase',
      gateResults: [{ gateName: 'test-gate', verdict: 'block', message: 'Something is blocked' }],
      nextPhase: 'build',
      checkpointId: 'chk-abc123-internal',
      attemptCount: 3,
      workflowId: 'wf-def456-internal',
    });

    expect(prompt).not.toContain('chk-abc123-internal');
    expect(prompt).not.toContain('attempt');
    expect(prompt).not.toContain('Attempt');
    expect(prompt).not.toContain('wf-def456-internal');
    expect(prompt).not.toContain('builder');
    expect(prompt).not.toContain('qa-lead');
    expect(prompt).not.toContain('ceo');
    expect(prompt).not.toContain('eng-manager');
    expect(prompt).toContain('Something is blocked');
  });

  it('Test 3: block verdict uses block-specific recommendation wording', () => {
    const prompt = buildCompanyBlockerPrompt(makeBlockInput());

    expect(prompt).toContain('Resolve the blocker before continuing.');
  });

  it('Test 3: warn verdict uses warn-specific recommendation wording', () => {
    const prompt = buildCompanyBlockerPrompt(makeWarnInput());

    expect(prompt).toContain('Confirm the recommendation before continuing.');
  });

  it('uses Company-voiced language for consequences of block verdicts', () => {
    const prompt = buildCompanyBlockerPrompt(makeBlockInput({ nextPhase: 'review' }));

    expect(prompt).toContain('**Consequence:**');
    expect(prompt).not.toContain('builder');
    expect(prompt).not.toContain('qa-lead');
  });

  it('includes ### Why The Company paused section with gate messages', () => {
    const prompt = buildCompanyBlockerPrompt({
      goal: 'Build the feature',
      currentStep: 'build phase',
      gateResults: [
        { gateName: 'gate-1', verdict: 'block', message: 'Tests have not been verified' },
        { gateName: 'gate-2', verdict: 'warn', message: 'Plan has not been confirmed' },
      ],
      nextPhase: 'review',
    });

    expect(prompt).toContain('### Why The Company paused');
    expect(prompt).toContain('Tests have not been verified');
    expect(prompt).toContain('Plan has not been confirmed');
  });

  it('handles multiple block results in a single prompt', () => {
    const prompt = buildCompanyBlockerPrompt({
      goal: 'Ship the release',
      currentStep: 'test phase',
      gateResults: [
        { gateName: 'gate-a', verdict: 'block', message: 'Blocker A' },
        { gateName: 'gate-b', verdict: 'block', message: 'Blocker B' },
      ],
      nextPhase: 'ship',
    });

    expect(prompt).toContain('Blocker A');
    expect(prompt).toContain('Blocker B');
    expect(prompt).toContain('Resolve the blocker before continuing.');
  });

  it('does not include checkpoint ids in the prompt output', () => {
    const prompt = buildCompanyBlockerPrompt({
      goal: 'Complete the work',
      currentStep: 'plan phase',
      gateResults: [{ gateName: 'test-gate', verdict: 'warn', message: 'A soft warning' }],
      nextPhase: 'build',
      checkpointId: 'ckpt-00000000-1111-2222-3333-444444444444',
    });

    expect(prompt).not.toContain('ckpt-00000000-1111-2222-3333-444444444444');
  });

  it('does not include attempt counters even when provided', () => {
    const prompt = buildCompanyBlockerPrompt({
      goal: 'Continue the workflow',
      currentStep: 'build phase',
      gateResults: [{ gateName: 'test-gate', verdict: 'block', message: 'Blocked progress' }],
      nextPhase: 'review',
      attemptCount: 5,
    });

    expect(prompt).not.toContain('5');
    expect(prompt).not.toContain('attempt');
    expect(prompt).not.toContain('Attempt');
  });
});
