import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  appendCompanyLogEntry,
  archiveDecisionWaitInState,
  getLatestSafeCheckpointId,
  markDecisionWaitStaleInState,
  recordRetryAttemptInState,
  registerDecisionAnswerInState,
  registerSafeRetryCheckpoint,
  readCompanyCheckpoint,
  readCompanyLogEntries,
  readCompanyState,
  resolveDecisionWaitInState,
  writeDecisionWaitToState,
  writeCompanyCheckpoint,
  writeCompanyState,
} from './storage.ts';
import { createDecisionWait } from './company-decision-wait.ts';
import type { CompanyCheckpoint, CompanyLogEntry, CompanyState } from './types.ts';
import { COMPANY_ARTIFACT_OWNERSHIP } from './types.ts';

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'gstack-company-storage-test-'));
}

function makeCanonicalState(overrides: Partial<CompanyState> = {}): CompanyState {
  return {
    version: 1,
    visible_agent: 'company',
    source: 'canonical',
    started_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    session_ids: ['sess-1'],
    ownership: COMPANY_ARTIFACT_OWNERSHIP,
    ...overrides,
  };
}

describe('company/storage', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  describe('readCompanyState / writeCompanyState', () => {
    it('writes state.json and reads back the same typed snapshot', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const state = makeCanonicalState({ session_ids: ['sess-a', 'sess-b'] });
      const written = writeCompanyState(dir, state);
      expect(written).toBe(true);

      const readBack = readCompanyState(dir);
      expect(readBack).not.toBeNull();
      expect(readBack?.version).toBe(1);
      expect(readBack?.visible_agent).toBe('company');
      expect(readBack?.source).toBe('canonical');
      expect(readBack?.session_ids).toEqual(['sess-a', 'sess-b']);
      expect(readBack?.ownership.snapshot).toBe('state.json');
      expect(readBack?.ownership.log).toBe('sprint-log.jsonl');
      expect(readBack?.ownership.checkpoints).toBe('checkpoints/');
    });

    it('writes to .gstack/orchestrator/state.json', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const state = makeCanonicalState();
      writeCompanyState(dir, state);

      const expectedPath = join(dir, '.gstack', 'orchestrator', 'state.json');
      expect(existsSync(expectedPath)).toBe(true);
    });

    it('returns null when state.json does not exist', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const result = readCompanyState(dir);
      expect(result).toBeNull();
    });

    it('returns null when state.json is malformed JSON', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      mkdirSync(join(dir, '.gstack', 'orchestrator'), { recursive: true });
      writeFileSync(join(dir, '.gstack', 'orchestrator', 'state.json'), '{bad json', 'utf-8');

      const result = readCompanyState(dir);
      expect(result).toBeNull();
    });

    it('returns null when state.json contains unexpected shape', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      mkdirSync(join(dir, '.gstack', 'orchestrator'), { recursive: true });
      writeFileSync(
        join(dir, '.gstack', 'orchestrator', 'state.json'),
        JSON.stringify([1, 2, 3]),
        'utf-8'
      );

      const result = readCompanyState(dir);
      expect(result).toBeNull();
    });
  });

  describe('appendCompanyLogEntry / readCompanyLogEntries', () => {
    it('appends entries to sprint-log.jsonl without truncating previous entries', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const entry1: CompanyLogEntry = { ts: '2026-01-01T00:00:01Z', event: 'started' };
      const entry2: CompanyLogEntry = {
        ts: '2026-01-01T00:00:02Z',
        event: 'delegated',
        data: { specialist: 'builder' },
      };

      appendCompanyLogEntry(dir, entry1);
      appendCompanyLogEntry(dir, entry2);

      const entries = readCompanyLogEntries(dir);
      expect(entries).toHaveLength(2);
      expect(entries[0].event).toBe('started');
      expect(entries[1].event).toBe('delegated');
      expect(entries[1].data?.specialist).toBe('builder');
    });

    it('writes to .gstack/orchestrator/sprint-log.jsonl', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      appendCompanyLogEntry(dir, { ts: '2026-01-01T00:00:00Z', event: 'test' });

      const expectedPath = join(dir, '.gstack', 'orchestrator', 'sprint-log.jsonl');
      expect(existsSync(expectedPath)).toBe(true);
    });

    it('returns empty array when log does not exist', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const entries = readCompanyLogEntries(dir);
      expect(entries).toEqual([]);
    });

    it('grows the file on each append and never truncates', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      for (let i = 0; i < 5; i++) {
        appendCompanyLogEntry(dir, { ts: new Date().toISOString(), event: `event-${i}` });
      }

      const entries = readCompanyLogEntries(dir);
      expect(entries).toHaveLength(5);
    });
  });

  describe('decision wait persistence helpers', () => {
    it('writeDecisionWaitToState stores a pending record and updates updated_at', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const initial = makeCanonicalState({
        workflow_id: 'workflow-1',
        updated_at: '2026-01-01T00:00:00Z',
      });
      writeCompanyState(dir, initial);

      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'The Company needs your approval to continue.',
        phase: 'build',
        createdAt: '2026-01-01T00:01:00Z',
      });

      expect(writeDecisionWaitToState(dir, wait)).toBe(true);

      const updated = readCompanyState(dir);
      expect(updated?.pending_decision_wait).toEqual(wait);
      expect(updated?.updated_at).not.toBe('2026-01-01T00:00:00Z');
    });

    it('resolveDecisionWaitInState resolves only the matching wait and ignores duplicate answers', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'The Company needs your approval to continue.',
        phase: 'build',
      });

      writeCompanyState(
        dir,
        makeCanonicalState({ workflow_id: 'workflow-1', pending_decision_wait: wait })
      );

      expect(resolveDecisionWaitInState(dir, wait.id, 'approved')).toBe(true);
      const once = readCompanyState(dir);
      expect(once?.pending_decision_wait?.status).toBe('answered');
      expect(once?.pending_decision_wait?.answer).toBe('approved');

      expect(resolveDecisionWaitInState(dir, wait.id, 'rejected')).toBe(true);
      const twice = readCompanyState(dir);
      expect(twice?.pending_decision_wait?.answer).toBe('approved');
    });

    it('archiveDecisionWaitInState moves answered waits into append-only history', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'The Company needs your approval to continue.',
        phase: 'build',
      });

      writeCompanyState(
        dir,
        makeCanonicalState({ workflow_id: 'workflow-1', pending_decision_wait: wait })
      );
      resolveDecisionWaitInState(dir, wait.id, 'approved');

      expect(archiveDecisionWaitInState(dir, wait.id)).toBe(true);

      const updated = readCompanyState(dir);
      expect(updated?.pending_decision_wait).toBeUndefined();
      expect(updated?.archived_decision_waits).toHaveLength(1);
      expect(updated?.archived_decision_waits?.[0]?.status).toBe('archived');
      expect(updated?.workflow_id).toBe('workflow-1');
    });

    it('registerSafeRetryCheckpoint appends a checkpoint id exactly once', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      writeCompanyState(
        dir,
        makeCanonicalState({
          workflow_id: 'workflow-1',
          current_attempt: 1,
          retry_lineage: {
            parent_workflow_id: 'workflow-1',
            current_attempt: 1,
            child_attempt_ids: [],
            safe_retry_checkpoint_ids: [],
          },
        })
      );

      expect(registerSafeRetryCheckpoint(dir, 'checkpoint-1')).toBe(true);
      expect(registerSafeRetryCheckpoint(dir, 'checkpoint-1')).toBe(true);

      const updated = readCompanyState(dir);
      expect(updated?.retry_lineage?.safe_retry_checkpoint_ids).toEqual(['checkpoint-1']);
    });

    it('recordRetryAttemptInState increments attempt and records retry lineage', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      writeCompanyState(
        dir,
        makeCanonicalState({
          workflow_id: 'workflow-1',
          current_attempt: 1,
          retry_lineage: {
            parent_workflow_id: 'workflow-1',
            current_attempt: 1,
            child_attempt_ids: [],
            safe_retry_checkpoint_ids: ['checkpoint-1'],
          },
        })
      );

      expect(recordRetryAttemptInState(dir, 'checkpoint-1')).toBe(true);

      const updated = readCompanyState(dir);
      expect(updated?.current_attempt).toBe(2);
      expect(updated?.retry_lineage?.current_attempt).toBe(2);
      expect(updated?.retry_lineage?.child_attempt_ids).toEqual(['workflow-1:attempt:2']);
      expect(updated?.retry_lineage?.last_retry_checkpoint_id).toBe('checkpoint-1');
    });
  });

  describe('writeCompanyCheckpoint / readCompanyCheckpoint', () => {
    it('writes checkpoint JSON and reads back the same envelope', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const checkpoint: CompanyCheckpoint = {
        id: 'cp-001',
        captured_at: '2026-01-01T00:05:00Z',
        state: makeCanonicalState(),
        reason: 'pre-delegation snapshot',
      };

      const written = writeCompanyCheckpoint(dir, checkpoint);
      expect(written).toBe(true);

      const readBack = readCompanyCheckpoint(dir, 'cp-001');
      expect(readBack).not.toBeNull();
      expect(readBack?.id).toBe('cp-001');
      expect(readBack?.reason).toBe('pre-delegation snapshot');
      expect(readBack?.state.visible_agent).toBe('company');
    });

    it('writes checkpoint under .gstack/orchestrator/checkpoints/', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const checkpoint: CompanyCheckpoint = {
        id: 'cp-002',
        captured_at: '2026-01-01T00:06:00Z',
        state: makeCanonicalState(),
      };

      writeCompanyCheckpoint(dir, checkpoint);

      const expectedPath = join(dir, '.gstack', 'orchestrator', 'checkpoints', 'cp-002.json');
      expect(existsSync(expectedPath)).toBe(true);
    });

    it('returns null when checkpoint does not exist', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const result = readCompanyCheckpoint(dir, 'nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when checkpoint file contains malformed JSON', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      mkdirSync(join(dir, '.gstack', 'orchestrator', 'checkpoints'), { recursive: true });
      writeFileSync(
        join(dir, '.gstack', 'orchestrator', 'checkpoints', 'bad.json'),
        '{corrupt',
        'utf-8'
      );

      const result = readCompanyCheckpoint(dir, 'bad');
      expect(result).toBeNull();
    });
  });

  describe('markDecisionWaitStaleInState', () => {
    it('marks the active wait as stale without deleting audit history', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'Approve?',
        phase: 'build',
      });

      writeCompanyState(
        dir,
        makeCanonicalState({ workflow_id: 'workflow-1', pending_decision_wait: wait })
      );

      const result = markDecisionWaitStaleInState(dir, wait.id, 'superseded', 'checkpoint-2');
      expect(result).toBe(true);

      const updated = readCompanyState(dir);
      expect(updated?.pending_decision_wait?.status).toBe('stale');
      expect(updated?.pending_decision_wait?.stale_reason).toBe('superseded');
      expect(updated?.pending_decision_wait?.superseded_by_checkpoint_id).toBe('checkpoint-2');
      expect(updated?.pending_decision_wait?.id).toBe(wait.id);
    });

    it('leaves archived waits intact and does not invent a new workflow id', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const archivedWait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-0',
        question: 'Old question?',
        phase: 'build',
      });

      const activeWait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'Current question?',
        phase: 'build',
      });

      writeCompanyState(
        dir,
        makeCanonicalState({
          workflow_id: 'workflow-1',
          pending_decision_wait: activeWait,
          archived_decision_waits: [{ ...archivedWait, status: 'archived' }],
        })
      );

      markDecisionWaitStaleInState(dir, activeWait.id, 'workflow-mismatch');

      const updated = readCompanyState(dir);
      expect(updated?.workflow_id).toBe('workflow-1');
      expect(updated?.archived_decision_waits).toHaveLength(1);
      expect(updated?.archived_decision_waits?.[0]?.id).toBe(archivedWait.id);
    });

    it('returns false when no matching pending wait exists', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      writeCompanyState(dir, makeCanonicalState({ workflow_id: 'workflow-1' }));

      const result = markDecisionWaitStaleInState(dir, 'nonexistent-id', 'superseded');
      expect(result).toBe(false);
    });
  });

  describe('registerDecisionAnswerInState', () => {
    it('persists a decision-answer key exactly once and returns recorded', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'Approve?',
        phase: 'build',
      });

      writeCompanyState(
        dir,
        makeCanonicalState({ workflow_id: 'workflow-1', pending_decision_wait: wait })
      );

      const result = registerDecisionAnswerInState(dir, wait.id, 'msg-key-001');
      expect(result).toBe('recorded');

      const updated = readCompanyState(dir);
      expect(updated?.pending_decision_wait?.consumed_answer_keys).toContain('msg-key-001');
    });

    it('returns duplicate when the same answer key is already stored', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const wait = createDecisionWait({
        workflowId: 'workflow-1',
        checkpointId: 'checkpoint-1',
        question: 'Approve?',
        phase: 'build',
      });

      writeCompanyState(
        dir,
        makeCanonicalState({ workflow_id: 'workflow-1', pending_decision_wait: wait })
      );

      registerDecisionAnswerInState(dir, wait.id, 'msg-key-001');
      const second = registerDecisionAnswerInState(dir, wait.id, 'msg-key-001');
      expect(second).toBe('duplicate');
    });

    it('returns missing when no pending wait matches the waitId', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      writeCompanyState(dir, makeCanonicalState({ workflow_id: 'workflow-1' }));

      const result = registerDecisionAnswerInState(dir, 'nonexistent-id', 'msg-key-001');
      expect(result).toBe('missing');
    });
  });

  describe('getLatestSafeCheckpointId', () => {
    it('returns the last entry in retry_lineage.safe_retry_checkpoint_ids when present', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      writeCompanyState(
        dir,
        makeCanonicalState({
          workflow_id: 'workflow-1',
          last_checkpoint_id: 'fallback-checkpoint',
          retry_lineage: {
            current_attempt: 1,
            child_attempt_ids: [],
            safe_retry_checkpoint_ids: ['cp-early', 'cp-latest'],
          },
        })
      );

      const result = getLatestSafeCheckpointId(dir);
      expect(result).toBe('cp-latest');
    });

    it('falls back to last_checkpoint_id when no retry-safe checkpoints are registered', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      writeCompanyState(
        dir,
        makeCanonicalState({
          workflow_id: 'workflow-1',
          last_checkpoint_id: 'fallback-checkpoint',
          retry_lineage: {
            current_attempt: 1,
            child_attempt_ids: [],
            safe_retry_checkpoint_ids: [],
          },
        })
      );

      const result = getLatestSafeCheckpointId(dir);
      expect(result).toBe('fallback-checkpoint');
    });

    it('returns null when state has no checkpoint information at all', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      writeCompanyState(dir, makeCanonicalState());

      const result = getLatestSafeCheckpointId(dir);
      expect(result).toBeNull();
    });

    it('returns null when no state file exists', () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const result = getLatestSafeCheckpointId(dir);
      expect(result).toBeNull();
    });
  });
});
