import { describe, expect, it } from 'vitest';
import { createDecisionWait } from './company-decision-wait.ts';
import { deriveCompanyResumeOffer, deriveStaleAnswerRecovery } from './company-resume.ts';
import { COMPANY_ARTIFACT_OWNERSHIP } from './types.ts';
import type { CompanyCheckpoint, CompanyState } from './types.ts';

function makeCompanyState(overrides: Partial<CompanyState> = {}): CompanyState {
  return {
    version: 1,
    visible_agent: 'company',
    source: 'canonical',
    started_at: '2026-04-09T00:00:00.000Z',
    updated_at: '2026-04-09T00:00:00.000Z',
    session_ids: ['sess-resume'],
    workflow_id: 'wf-resume',
    current_attempt: 3,
    current_phase: 'build',
    visible_context: {
      current_goal: 'Ship the reviewed change',
      current_step: 'Waiting for a safe resume decision',
      status_summary: 'The Company preserved the workflow.',
      deferred_request_text: 'Ship the reviewed change',
    },
    execution_context: {
      specialist_role: 'builder',
      classified_phase: 'build',
      confidence: 0.88,
      trace_visibility: 'hidden',
      retry_safe: true,
      deferred_classified_intent: {
        phase: 'build',
        confidence: 0.88,
        suggested_agent: 'builder',
        suggested_skills: ['implement'],
        reasoning: 'Resume saved Company workflow',
      },
    },
    retry_lineage: {
      parent_workflow_id: 'wf-resume',
      current_attempt: 3,
      child_attempt_ids: ['wf-resume:attempt:2', 'wf-resume:attempt:3'],
      safe_retry_checkpoint_ids: [],
    },
    ownership: COMPANY_ARTIFACT_OWNERSHIP,
    ...overrides,
  };
}

function makeCheckpoint(id: string, stateOverrides: Partial<CompanyState> = {}): CompanyCheckpoint {
  return {
    id,
    captured_at: '2026-04-09T00:10:00.000Z',
    reason: 'resume-test',
    state: makeCompanyState({
      last_checkpoint_id: id,
      visible_context: {
        current_goal: 'Ship the reviewed change',
        current_step: 'Review is complete and ready to ship',
        status_summary: 'Paused after review',
        deferred_request_text: 'Ship the reviewed change',
      },
      ...stateOverrides,
    }),
  };
}

describe('company-resume', () => {
  it('selects the latest safe checkpoint when retry-safe checkpoints exist', () => {
    const state = makeCompanyState({
      last_checkpoint_id: 'cp-fallback',
      retry_lineage: {
        parent_workflow_id: 'wf-resume',
        current_attempt: 3,
        child_attempt_ids: ['wf-resume:attempt:2'],
        safe_retry_checkpoint_ids: ['cp-earlier', 'cp-latest'],
      },
    });

    const offer = deriveCompanyResumeOffer(state, makeCheckpoint('cp-latest'));

    expect(offer.targetCheckpointId).toBe('cp-latest');
    expect(offer.recommendation).toContain('latest safe checkpoint');
  });

  it('falls back to last_checkpoint_id when no retry-safe checkpoints exist', () => {
    const state = makeCompanyState({
      last_checkpoint_id: 'cp-fallback',
      retry_lineage: {
        parent_workflow_id: 'wf-resume',
        current_attempt: 3,
        child_attempt_ids: [],
        safe_retry_checkpoint_ids: [],
      },
    });

    const offer = deriveCompanyResumeOffer(state, makeCheckpoint('cp-fallback'));

    expect(offer.targetCheckpointId).toBe('cp-fallback');
    expect(offer.recommendation).toContain('last saved checkpoint');
  });

  it('returns Company-voiced user fields without exposing checkpoint ids or attempt counters', () => {
    const offer = deriveCompanyResumeOffer(
      makeCompanyState({
        last_checkpoint_id: 'cp-safe-123',
        retry_lineage: {
          parent_workflow_id: 'wf-resume',
          current_attempt: 3,
          child_attempt_ids: ['wf-resume:attempt:2'],
          safe_retry_checkpoint_ids: ['cp-safe-123'],
        },
      }),
      makeCheckpoint('cp-safe-123')
    );

    expect(offer.goal).toBe('Ship the reviewed change');
    expect(offer.currentStep).toBe('Review is complete and ready to ship');
    expect(offer.nextSafeStep).toContain('Approve the recommended resume');

    const userFacingText = [
      offer.goal,
      offer.currentStep,
      offer.recommendation,
      offer.consequence,
      offer.nextSafeStep,
    ].join(' ');

    expect(userFacingText).not.toContain('cp-safe-123');
    expect(userFacingText).not.toContain('attempt:2');
    expect(userFacingText).not.toContain('current_attempt');
  });

  it('stale-answer recovery offers resume or a fresh direction from the matching checkpoint context', () => {
    const state = makeCompanyState({
      last_checkpoint_id: 'cp-safe-9',
      retry_lineage: {
        parent_workflow_id: 'wf-resume',
        current_attempt: 3,
        child_attempt_ids: [],
        safe_retry_checkpoint_ids: ['cp-safe-9'],
      },
    });
    const staleWait = createDecisionWait({
      workflowId: 'wf-resume',
      checkpointId: 'cp-old-4',
      question: 'Proceed with the earlier route?',
      phase: 'build',
    });

    const offer = deriveStaleAnswerRecovery(state, staleWait, makeCheckpoint('cp-safe-9'));

    expect(offer.goal).toBe('Ship the reviewed change');
    expect(offer.currentStep).toBe('Review is complete and ready to ship');
    expect(offer.recommendation).toContain('stale');
    expect(offer.nextSafeStep).toContain('fresh direction');
    expect(offer.targetCheckpointId).toBe('cp-safe-9');
  });
});
