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
