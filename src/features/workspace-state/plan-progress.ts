import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { getPlansDir } from '../../shared/path-helpers.ts';
import type { PlanProgress } from './types.ts';

export function getPlanProgress(planPath: string): PlanProgress {
  if (!existsSync(planPath)) {
    return { total: 0, completed: 0, isComplete: true };
  }

  try {
    const content = readFileSync(planPath, 'utf-8');
    const uncheckedMatches = content.match(/^\s*[-*]\s*\[\s*\]/gm) ?? [];
    const checkedMatches = content.match(/^\s*[-*]\s*\[[xX]\]/gm) ?? [];

    const total = uncheckedMatches.length + checkedMatches.length;
    const completed = checkedMatches.length;

    return {
      total,
      completed,
      isComplete: total === 0 || total === completed,
    };
  } catch {
    return { total: 0, completed: 0, isComplete: true };
  }
}

export function getPlanName(planPath: string): string {
  return basename(planPath, '.md');
}

export function findPlans(directory: string): string[] {
  const plansDir = getPlansDir(directory);
  if (!existsSync(plansDir)) {
    return [];
  }

  try {
    const files = readdirSync(plansDir)
      .filter((fileName) => fileName.endsWith('.md'))
      .map((fileName) => join(plansDir, fileName));

    return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  } catch {
    return [];
  }
}
