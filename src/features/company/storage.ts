import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  getOrchestratorCheckpointsDir,
  getSprintLogPath,
  getStatePath,
} from '../../shared/path-helpers.ts';
import {
  archiveDecisionWait,
  markDecisionWaitStale,
  registerDecisionAnswerKey,
  resolveDecisionWait,
} from './company-decision-wait.ts';
import type {
  CompanyCheckpoint,
  CompanyLogEntry,
  CompanyState,
  DecisionWaitStaleReason,
} from './types.ts';

export function readCompanyState(directory: string): CompanyState | null {
  const filePath = getStatePath(directory);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed as CompanyState;
  } catch {
    return null;
  }
}

export function writeCompanyState(directory: string, state: CompanyState): boolean {
  const filePath = getStatePath(directory);

  try {
    const targetDir = dirname(filePath);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function writeDecisionWaitToState(
  directory: string,
  wait: NonNullable<CompanyState['pending_decision_wait']>
): boolean {
  const state = readCompanyState(directory);
  if (!state) {
    return false;
  }

  return writeCompanyState(directory, {
    ...state,
    pending_decision_wait: wait,
    updated_at: new Date().toISOString(),
  });
}

export function resolveDecisionWaitInState(
  directory: string,
  waitId: string,
  answer: string
): boolean {
  const state = readCompanyState(directory);
  if (!state?.pending_decision_wait || state.pending_decision_wait.id !== waitId) {
    return false;
  }

  const resolved = resolveDecisionWait(state.pending_decision_wait, answer);
  return writeCompanyState(directory, {
    ...state,
    pending_decision_wait: resolved,
    updated_at: new Date().toISOString(),
  });
}

export function archiveDecisionWaitInState(directory: string, waitId: string): boolean {
  const state = readCompanyState(directory);
  if (!state?.pending_decision_wait || state.pending_decision_wait.id !== waitId) {
    return false;
  }

  const archived = archiveDecisionWait(state.pending_decision_wait);
  if (archived.status !== 'archived') {
    return false;
  }

  return writeCompanyState(directory, {
    ...state,
    pending_decision_wait: undefined,
    archived_decision_waits: [...(state.archived_decision_waits ?? []), archived],
    updated_at: new Date().toISOString(),
  });
}

export function registerSafeRetryCheckpoint(directory: string, checkpointId: string): boolean {
  const state = readCompanyState(directory);
  if (!state) {
    return false;
  }

  const retryLineage = state.retry_lineage ?? {
    parent_workflow_id: state.workflow_id,
    current_attempt: state.current_attempt ?? 1,
    child_attempt_ids: [],
    safe_retry_checkpoint_ids: [],
  };

  const safeRetryCheckpointIds = retryLineage.safe_retry_checkpoint_ids.includes(checkpointId)
    ? retryLineage.safe_retry_checkpoint_ids
    : [...retryLineage.safe_retry_checkpoint_ids, checkpointId];

  return writeCompanyState(directory, {
    ...state,
    retry_lineage: {
      ...retryLineage,
      safe_retry_checkpoint_ids: safeRetryCheckpointIds,
    },
    updated_at: new Date().toISOString(),
  });
}

export function recordRetryAttemptInState(directory: string, checkpointId: string): boolean {
  const state = readCompanyState(directory);
  if (!state?.workflow_id) {
    return false;
  }

  const retryLineage = state.retry_lineage;
  if (!retryLineage || !retryLineage.safe_retry_checkpoint_ids.includes(checkpointId)) {
    return false;
  }

  const nextAttempt = retryLineage.current_attempt + 1;

  return writeCompanyState(directory, {
    ...state,
    current_attempt: nextAttempt,
    retry_lineage: {
      ...retryLineage,
      current_attempt: nextAttempt,
      child_attempt_ids: [
        ...retryLineage.child_attempt_ids,
        `${state.workflow_id}:attempt:${nextAttempt}`,
      ],
      last_retry_checkpoint_id: checkpointId,
    },
    updated_at: new Date().toISOString(),
  });
}

export function appendCompanyLogEntry(directory: string, entry: CompanyLogEntry): void {
  const filePath = getSprintLogPath(directory);

  const targetDir = dirname(filePath);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf-8');
}

export function readCompanyLogEntries(directory: string): CompanyLogEntry[] {
  const filePath = getSprintLogPath(directory);

  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);
    return lines.map((line) => JSON.parse(line) as CompanyLogEntry);
  } catch {
    return [];
  }
}

export function writeCompanyCheckpoint(directory: string, checkpoint: CompanyCheckpoint): boolean {
  const checkpointsDir = getOrchestratorCheckpointsDir(directory);
  const filePath = `${checkpointsDir}/${checkpoint.id}.json`;

  try {
    if (!existsSync(checkpointsDir)) {
      mkdirSync(checkpointsDir, { recursive: true });
    }

    writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function readCompanyCheckpoint(
  directory: string,
  checkpointId: string
): CompanyCheckpoint | null {
  const checkpointsDir = getOrchestratorCheckpointsDir(directory);
  const filePath = `${checkpointsDir}/${checkpointId}.json`;

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed as CompanyCheckpoint;
  } catch {
    return null;
  }
}

export function markDecisionWaitStaleInState(
  directory: string,
  waitId: string,
  reason: DecisionWaitStaleReason,
  supersededByCheckpointId?: string
): boolean {
  const state = readCompanyState(directory);
  if (!state?.pending_decision_wait || state.pending_decision_wait.id !== waitId) {
    return false;
  }

  const staled = markDecisionWaitStale(
    state.pending_decision_wait,
    reason,
    supersededByCheckpointId
  );

  return writeCompanyState(directory, {
    ...state,
    pending_decision_wait: staled,
    updated_at: new Date().toISOString(),
  });
}

export function registerDecisionAnswerInState(
  directory: string,
  waitId: string,
  answerKey: string
): 'recorded' | 'duplicate' | 'missing' {
  const state = readCompanyState(directory);
  if (!state?.pending_decision_wait || state.pending_decision_wait.id !== waitId) {
    return 'missing';
  }

  const result = registerDecisionAnswerKey(state.pending_decision_wait, answerKey);

  if (result === false) {
    return 'duplicate';
  }

  const written = writeCompanyState(directory, {
    ...state,
    pending_decision_wait: result,
    updated_at: new Date().toISOString(),
  });

  return written ? 'recorded' : 'missing';
}

export function getLatestSafeCheckpointId(directory: string): string | null {
  const state = readCompanyState(directory);
  if (!state) {
    return null;
  }

  const safeIds = state.retry_lineage?.safe_retry_checkpoint_ids;
  if (safeIds && safeIds.length > 0) {
    return safeIds[safeIds.length - 1] ?? null;
  }

  return state.last_checkpoint_id ?? null;
}
