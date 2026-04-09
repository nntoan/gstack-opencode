import { describe, expect, it } from 'vitest';
import { applyAmbiguityPolicy } from './company-ambiguity-policy.ts';
import type { ClassifiedIntent } from '../orchestrator/types.ts';

function makeClassifiedIntent(overrides: Partial<ClassifiedIntent> = {}): ClassifiedIntent {
  return {
    phase: 'build',
    confidence: 0.8,
    suggestedAgent: 'builder',
    suggestedSkills: ['implement'],
    reasoning: 'Matched 2 patterns for build',
    ...overrides,
  };
}

describe('applyAmbiguityPolicy', () => {
  it('delegates immediately for explicit commands with confidence 1.0', () => {
    const classified = makeClassifiedIntent({
      confidence: 1,
      reasoning: 'Explicit skill /ship selected',
    });
    const decision = applyAmbiguityPolicy(classified);

    expect(decision).toEqual({ action: 'delegate', classified });
  });

  it('returns ask for low confidence and keeps the prompt in Company voice', () => {
    const decision = applyAmbiguityPolicy(
      makeClassifiedIntent({ confidence: 0.4, phase: 'review', suggestedAgent: 'reviewer' })
    );

    expect(decision.action).toBe('ask');
    if (decision.action === 'ask') {
      expect(decision.questionPrompt).toContain('I want to route this correctly');
      expect(decision.questionPrompt).toContain('**review**');
      expect(decision.questionPrompt).not.toContain('reviewer');
    }
  });

  it('returns confirm for middling confidence with a Company recommendation prompt', () => {
    const classified = makeClassifiedIntent({
      confidence: 0.5,
      phase: 'ship',
      suggestedAgent: 'release-engineer',
    });
    const decision = applyAmbiguityPolicy(classified);

    expect(decision.action).toBe('confirm');
    if (decision.action === 'confirm') {
      expect(decision.confirmationPrompt).toContain(
        `I'm ready to proceed with the **${classified.phase}** phase`
      );
      expect(decision.confirmationPrompt).toContain('Is that direction correct?');
      expect(decision.confirmationPrompt).not.toContain('release-engineer');
    }
  });

  it('delegates immediately when confidence is at least 0.85', () => {
    const classified = makeClassifiedIntent({ confidence: 0.85, phase: 'review' });
    expect(applyAmbiguityPolicy(classified)).toEqual({ action: 'delegate', classified });
  });

  it('offers closest safe alternatives after a rejected recommendation', () => {
    const decision = applyAmbiguityPolicy(
      makeClassifiedIntent({ confidence: 0.6, phase: 'build' }),
      {
        priorDecision: 'rejected',
        alternativePhases: ['review', 'test'],
      }
    );

    expect(decision.action).toBe('ask');
    if (decision.action === 'ask') {
      expect(decision.questionPrompt).toContain(
        'closest safe alternatives are **review**, **test**'
      );
      expect(decision.questionPrompt).not.toContain('builder');
    }
  });

  it('builds a sequence prompt for multi-phase matches', () => {
    const decision = applyAmbiguityPolicy(
      makeClassifiedIntent({
        confidence: 0.4,
        phase: 'build',
        reasoning: 'Multiple phase matches: build, review, ship',
      })
    );

    expect(decision.action).toBe('ask');
    if (decision.action === 'ask') {
      expect(decision.questionPrompt).toContain(
        'I can handle this in sequence: first **build**, then **review, ship**'
      );
    }
  });

  it('offers an expert or debug path only after repeated clarification stalls', () => {
    const early = applyAmbiguityPolicy(makeClassifiedIntent({ confidence: 0.4 }), {
      clarificationStallCount: 1,
    });
    const stalled = applyAmbiguityPolicy(makeClassifiedIntent({ confidence: 0.4 }), {
      clarificationStallCount: 2,
    });

    expect(early.action).toBe('ask');
    expect(stalled.action).toBe('ask');

    if (early.action === 'ask' && stalled.action === 'ask') {
      expect(early.questionPrompt).not.toContain('expert or debug trace path');
      expect(stalled.questionPrompt).toContain('expert or debug trace path');
    }
  });
});
