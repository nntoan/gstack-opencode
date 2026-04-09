import {
  appendSessionId,
  clearBoulderState,
  readBoulderState,
  upsertTaskSessionState,
  writeBoulderState,
} from './boulder-storage.ts';
import { ensureWorkspaceDir } from './ensure-workspace.ts';
import { findPlans, getPlanName, getPlanProgress } from './plan-progress.ts';
import { createNotepadManager } from './notepad-manager.ts';
import { createReviewDashboard } from './review-dashboard.ts';
import { createSessionTracker } from './session-tracker.ts';
import {
  appendCompanyLogEntry,
  archiveDecisionWaitInState,
  migrateBoulderStateToCompanyState,
  recordRetryAttemptInState,
  registerSafeRetryCheckpoint,
  readCompanyCheckpoint,
  readCompanyLogEntries,
  readCompanyState,
  resolveDecisionWaitInState,
  writeDecisionWaitToState,
  writeCompanyCheckpoint,
  writeCompanyState,
} from '../company/index.ts';
import type { CompanyCheckpoint, CompanyLogEntry, CompanyState } from '../company/index.ts';

export type {
  BoulderState,
  PlanProgress,
  ReviewDashboardEntry,
  SessionRecord,
  TaskSessionState,
} from './types.ts';
export * from './constants.ts';
export * from './boulder-storage.ts';
export * from './plan-progress.ts';
export * from './session-tracker.ts';
export * from './review-dashboard.ts';
export * from './notepad-manager.ts';
export * from './ensure-workspace.ts';

export function createWorkspaceState(directory: string) {
  return {
    boulder: {
      read: () => readBoulderState(directory),
      write: (state: Parameters<typeof writeBoulderState>[1]) =>
        writeBoulderState(directory, state),
      append: (sessionId: string) => appendSessionId(directory, sessionId),
      clear: () => clearBoulderState(directory),
      upsert: (input: Parameters<typeof upsertTaskSessionState>[1]) =>
        upsertTaskSessionState(directory, input),
    },
    company: {
      read: (): CompanyState | null => readCompanyState(directory),
      readResolved: (): CompanyState | null => {
        const canonical = readCompanyState(directory);
        if (canonical !== null) {
          return canonical;
        }
        const boulder = readBoulderState(directory);
        if (boulder !== null) {
          return migrateBoulderStateToCompanyState(boulder, new Date().toISOString());
        }
        return null;
      },
      write: (state: CompanyState): boolean => writeCompanyState(directory, state),
      appendLog: (entry: CompanyLogEntry): void => appendCompanyLogEntry(directory, entry),
      readLog: (): CompanyLogEntry[] => readCompanyLogEntries(directory),
      writeCheckpoint: (checkpoint: CompanyCheckpoint): boolean =>
        writeCompanyCheckpoint(directory, checkpoint),
      readCheckpoint: (checkpointId: string): CompanyCheckpoint | null =>
        readCompanyCheckpoint(directory, checkpointId),
      writeDecisionWait: (wait: NonNullable<CompanyState['pending_decision_wait']>): boolean =>
        writeDecisionWaitToState(directory, wait),
      resolveDecisionWait: (waitId: string, answer: string): boolean =>
        resolveDecisionWaitInState(directory, waitId, answer),
      archiveDecisionWait: (waitId: string): boolean =>
        archiveDecisionWaitInState(directory, waitId),
      registerSafeRetryCheckpoint: (checkpointId: string): boolean =>
        registerSafeRetryCheckpoint(directory, checkpointId),
      recordRetryAttempt: (checkpointId: string): boolean =>
        recordRetryAttemptInState(directory, checkpointId),
    },
    plans: {
      getProgress: (planPath: string) => getPlanProgress(planPath),
      getName: (planPath: string) => getPlanName(planPath),
      find: () => findPlans(directory),
    },
    sessions: createSessionTracker(directory),
    reviews: createReviewDashboard(directory),
    notepads: (planName: string) => createNotepadManager(directory, planName),
    ensureDir: () => ensureWorkspaceDir(directory),
  };
}
