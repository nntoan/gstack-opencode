import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { getBoulderPath } from '../../shared/path-helpers.ts';
import { getPlanName } from './plan-progress.ts';
import type { BoulderState, TaskSessionState } from './types.ts';

const RESERVED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export interface UpsertTaskSessionInput {
  taskKey: string;
  taskLabel: string;
  taskTitle: string;
  sessionId: string;
  agent?: string;
  category?: string;
}

export function getBoulderFilePath(directory: string): string {
  return getBoulderPath(directory);
}

export function readBoulderState(directory: string): BoulderState | null {
  const filePath = getBoulderFilePath(directory);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const candidate = parsed as BoulderState;
    if (!Array.isArray(candidate.session_ids)) {
      candidate.session_ids = [];
    }

    if (
      !candidate.task_sessions ||
      typeof candidate.task_sessions !== 'object' ||
      Array.isArray(candidate.task_sessions)
    ) {
      candidate.task_sessions = {};
    }

    return candidate;
  } catch {
    return null;
  }
}

export function writeBoulderState(directory: string, state: BoulderState): boolean {
  const filePath = getBoulderFilePath(directory);

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

export function appendSessionId(directory: string, sessionId: string): BoulderState | null {
  const state = readBoulderState(directory);
  if (!state) {
    return null;
  }

  if (state.session_ids.includes(sessionId)) {
    return state;
  }

  const previous = [...state.session_ids];
  state.session_ids.push(sessionId);

  if (writeBoulderState(directory, state)) {
    return state;
  }

  state.session_ids = previous;
  return null;
}

export function clearBoulderState(directory: string): boolean {
  const filePath = getBoulderFilePath(directory);

  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    return true;
  } catch {
    return false;
  }
}

export function createBoulderState(
  planPath: string,
  sessionId: string,
  agent?: string
): BoulderState {
  return {
    active_plan: planPath,
    started_at: new Date().toISOString(),
    session_ids: [sessionId],
    plan_name: getPlanName(planPath),
    ...(agent !== undefined ? { agent } : {}),
  };
}

export function upsertTaskSessionState(
  directory: string,
  input: UpsertTaskSessionInput
): BoulderState | null {
  if (RESERVED_KEYS.has(input.taskKey)) {
    return null;
  }

  const state = readBoulderState(directory);
  if (!state) {
    return null;
  }

  const taskSessions: Record<string, TaskSessionState> = state.task_sessions ?? {};
  taskSessions[input.taskKey] = {
    task_key: input.taskKey,
    task_label: input.taskLabel,
    task_title: input.taskTitle,
    session_id: input.sessionId,
    ...(input.agent !== undefined ? { agent: input.agent } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    updated_at: new Date().toISOString(),
  };

  state.task_sessions = taskSessions;
  if (writeBoulderState(directory, state)) {
    return state;
  }

  return null;
}
