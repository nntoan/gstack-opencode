import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  getOrchestratorCheckpointsDir,
  getSprintLogPath,
  getStatePath,
} from '../../shared/path-helpers.ts';
import type { CompanyCheckpoint, CompanyLogEntry, CompanyState } from './types.ts';

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
