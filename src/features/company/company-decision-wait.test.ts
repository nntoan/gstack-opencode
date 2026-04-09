import { describe, expect, it } from 'vitest';
import {
  archiveDecisionWait,
  createDecisionWait,
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
