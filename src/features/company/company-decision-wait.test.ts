import { describe, expect, it } from 'vitest';
import {
  archiveDecisionWait,
  createDecisionWait,
  markDecisionWaitStale,
  registerDecisionAnswerKey,
  resolveDecisionWait,
} from './company-decision-wait.ts';
import type { CompanyState } from './types.ts';
import { COMPANY_ARTIFACT_OWNERSHIP } from './types.ts';

describe('company-decision-wait', () => {
  it('createDecisionWait returns a pending record with workflow and checkpoint identity', () => {
    const wait = createDecisionWait({
      workflowId: 'workflow-1',
      checkpointId: 'checkpoint-1',
      question: 'The Company needs your approval to continue.',
      phase: 'build',
      createdAt: '2026-04-09T00:00:00.000Z',
    });

    expect(wait.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(wait.status).toBe('pending');
    expect(wait.workflow_id).toBe('workflow-1');
    expect(wait.checkpoint_id).toBe('checkpoint-1');
    expect(wait.question).toContain('The Company');
  });

  it('resolveDecisionWait is idempotent and preserves the first answer', () => {
    const wait = createDecisionWait({
      workflowId: 'workflow-1',
      checkpointId: 'checkpoint-1',
      question: 'The Company needs your approval to continue.',
      phase: 'build',
      createdAt: '2026-04-09T00:00:00.000Z',
    });

    const resolved = resolveDecisionWait(wait, 'approved', '2026-04-09T00:01:00.000Z');
    const duplicate = resolveDecisionWait(resolved, 'rejected', '2026-04-09T00:02:00.000Z');

    expect(resolved.status).toBe('answered');
    expect(resolved.answer).toBe('approved');
    expect(resolved.answered_at).toBe('2026-04-09T00:01:00.000Z');
    expect(duplicate).toEqual(resolved);
  });

  it('archiveDecisionWait archives only answered records', () => {
    const pending = createDecisionWait({
      workflowId: 'workflow-1',
      checkpointId: 'checkpoint-1',
      question: 'The Company needs your approval to continue.',
      phase: 'build',
    });
    const answered = resolveDecisionWait(pending, 'approved', '2026-04-09T00:01:00.000Z');

    expect(archiveDecisionWait(pending)).toEqual(pending);

    const archived = archiveDecisionWait(answered);
    expect(archived.status).toBe('archived');
    expect(archived.answer).toBe('approved');
  });

  describe('markDecisionWaitStale', () => {
    it('marks a pending wait as stale with a recorded reason and superseding checkpoint', () => {
      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'The Company needs your approval to continue.',
        phase: 'build',
        createdAt: '2026-04-09T00:00:00.000Z',
      });

      const staled = markDecisionWaitStale(
        wait,
        'superseded',
        'checkpoint-2',
        '2026-04-09T01:00:00.000Z'
      );

      expect(staled.status).toBe('stale');
      expect(staled.stale_reason).toBe('superseded');
      expect(staled.superseded_by_checkpoint_id).toBe('checkpoint-2');
      expect(staled.staled_at).toBe('2026-04-09T01:00:00.000Z');
      expect(staled.id).toBe(wait.id);
      expect(staled.workflow_id).toBe('workflow-1');
      expect(staled.checkpoint_id).toBe('checkpoint-1');
    });

    it('does not overwrite an already answered or archived wait via stale marking', () => {
      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'Approve?',
        phase: 'build',
      });
      const answered = resolveDecisionWait(wait, 'approved', '2026-04-09T00:01:00.000Z');
      const archived = archiveDecisionWait(answered);

      const staledFromAnswered = markDecisionWaitStale(answered, 'superseded', 'checkpoint-2');
      expect(staledFromAnswered).toEqual(answered);

      const staledFromArchived = markDecisionWaitStale(archived, 'superseded', 'checkpoint-2');
      expect(staledFromArchived).toEqual(archived);
    });
  });

  describe('registerDecisionAnswerKey', () => {
    it('records a control-answer key on the wait and returns the updated wait', () => {
      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'Approve?',
        phase: 'build',
      });

      const updated = registerDecisionAnswerKey(wait, 'msg-abc-123');

      expect(updated).not.toBe(false);
      if (updated !== false) {
        expect(updated.consumed_answer_keys).toContain('msg-abc-123');
      }
    });

    it('rejects duplicate answer-key registration and returns false on second attempt', () => {
      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'Approve?',
        phase: 'build',
      });

      const firstResult = registerDecisionAnswerKey(wait, 'msg-abc-123');
      expect(firstResult).not.toBe(false);

      const secondResult = registerDecisionAnswerKey(
        firstResult as ReturnType<typeof createDecisionWait>,
        'msg-abc-123'
      );
      expect(secondResult).toBe(false);
    });
  });

  describe('approval wait metadata for resolution routing', () => {
    it('approval waits can carry kind and resolution_action metadata for routing decisions', () => {
      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'The Company needs your approval to continue with deployment.',
        phase: 'build',
        kind: 'approval',
        resolution_action: 'continue-same-workflow',
      });

      expect(wait.kind).toBe('approval');
      expect(wait.resolution_action).toBe('continue-same-workflow');
      expect(wait.status).toBe('pending');
    });

    it('resume waits can carry offer-resume resolution action', () => {
      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-2',
        question: 'The Company found paused work. Do you want to resume it?',
        phase: 'build',
        kind: 'resume',
        resolution_action: 'offer-resume',
      });

      expect(wait.kind).toBe('resume');
      expect(wait.resolution_action).toBe('offer-resume');
    });
  });

  it('company state can persist deferred request text and classified intent needed for resume', () => {
    const state: CompanyState = {
      version: 1,
      visible_agent: 'company',
      source: 'canonical',
      started_at: '2026-04-09T00:00:00.000Z',
      updated_at: '2026-04-09T00:00:00.000Z',
      session_ids: ['sess-1'],
      workflow_id: 'workflow-1',
      current_attempt: 1,
      visible_context: {
        deferred_request_text: 'Please review and then ship this change',
      },
      execution_context: {
        classified_phase: 'review',
        confidence: 0.6,
        trace_visibility: 'hidden',
        deferred_classified_intent: {
          phase: 'review',
          confidence: 0.6,
          suggested_agent: 'reviewer',
          suggested_skills: ['review'],
          reasoning: 'Multiple phase matches: review, ship',
        },
      },
      retry_lineage: {
        current_attempt: 1,
        child_attempt_ids: [],
        safe_retry_checkpoint_ids: [],
      },
      ownership: COMPANY_ARTIFACT_OWNERSHIP,
    };

    expect(state.visible_context?.deferred_request_text).toBe(
      'Please review and then ship this change'
    );
    expect(state.execution_context?.deferred_classified_intent?.suggested_agent).toBe('reviewer');
  });
});
