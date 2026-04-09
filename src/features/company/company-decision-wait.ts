import { randomUUID } from 'node:crypto';
import type { SprintPhase } from '../../types/agent.ts';
import type { DecisionWait } from './types.ts';

export function createDecisionWait(input: {
  workflowId: string;
  checkpointId: string;
  question: string;
  phase: SprintPhase;
  createdAt?: string;
}): DecisionWait {
  return {
    id: randomUUID(),
    workflow_id: input.workflowId,
    checkpoint_id: input.checkpointId,
    question: input.question,
    phase: input.phase,
    status: 'pending',
    created_at: input.createdAt ?? new Date().toISOString(),
  };
}

export function resolveDecisionWait(
  wait: DecisionWait,
  answer: string,
  answeredAt?: string
): DecisionWait {
  if (wait.status === 'answered' || wait.status === 'archived') {
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
