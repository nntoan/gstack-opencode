import { randomUUID } from 'node:crypto';
import type { SprintPhase } from '../../types/agent.ts';
import type {
  DecisionWait,
  DecisionWaitKind,
  DecisionWaitResolutionAction,
  DecisionWaitStaleReason,
} from './types.ts';

export function createDecisionWait(input: {
  workflowId: string;
  checkpointId: string;
  question: string;
  phase: SprintPhase;
  createdAt?: string;
  kind?: DecisionWaitKind;
  resolution_action?: DecisionWaitResolutionAction;
}): DecisionWait {
  return {
    id: randomUUID(),
    workflow_id: input.workflowId,
    checkpoint_id: input.checkpointId,
    question: input.question,
    phase: input.phase,
    status: 'pending',
    created_at: input.createdAt ?? new Date().toISOString(),
    ...(input.kind !== undefined && { kind: input.kind }),
    ...(input.resolution_action !== undefined && { resolution_action: input.resolution_action }),
  };
}

export function resolveDecisionWait(
  wait: DecisionWait,
  answer: string,
  answeredAt?: string
): DecisionWait {
  if (wait.status === 'answered' || wait.status === 'archived' || wait.status === 'stale') {
    return wait;
  }

  return {
    ...wait,
    status: 'answered',
    answer,
    answered_at: answeredAt ?? new Date().toISOString(),
  };
}

export function archiveDecisionWait(wait: DecisionWait): DecisionWait {
  if (wait.status === 'archived') {
    return wait;
  }

  if (wait.status !== 'answered') {
    return wait;
  }

  return {
    ...wait,
    status: 'archived',
  };
}

export function markDecisionWaitStale(
  wait: DecisionWait,
  reason: DecisionWaitStaleReason,
  supersededByCheckpointId?: string,
  staledAt?: string
): DecisionWait {
  if (wait.status === 'answered' || wait.status === 'archived') {
    return wait;
  }

  return {
    ...wait,
    status: 'stale',
    stale_reason: reason,
    staled_at: staledAt ?? new Date().toISOString(),
    ...(supersededByCheckpointId !== undefined && {
      superseded_by_checkpoint_id: supersededByCheckpointId,
    }),
  };
}

export function registerDecisionAnswerKey(
  wait: DecisionWait,
  answerKey: string
): DecisionWait | false {
  const existing = wait.consumed_answer_keys ?? [];

  if (existing.includes(answerKey)) {
    return false;
  }

  return {
    ...wait,
    consumed_answer_keys: [...existing, answerKey],
  };
}
