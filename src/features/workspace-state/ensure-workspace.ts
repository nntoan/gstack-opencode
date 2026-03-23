import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ANALYTICS_DIR,
  BROWSER_DIR,
  DESIGN_DOCS_DIR,
  EVIDENCE_DIR,
  GSTACK_DIR,
  NOTEPADS_DIR,
  ORCHESTRATOR_DIR,
  PLANS_DIR,
  REVIEWS_DIR,
  RULES_DIR,
  SESSIONS_DIR,
} from './constants.ts';

const WORKSPACE_SUBDIRS = [
  ORCHESTRATOR_DIR,
  SESSIONS_DIR,
  REVIEWS_DIR,
  NOTEPADS_DIR,
  PLANS_DIR,
  EVIDENCE_DIR,
  DESIGN_DOCS_DIR,
  RULES_DIR,
  BROWSER_DIR,
  ANALYTICS_DIR,
];

function ensureGitignoreEntry(directory: string): void {
  const gitignorePath = join(directory, '.gitignore');
  const requiredLine = '.gstack/';

  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, `${requiredLine}\n`, 'utf-8');
    return;
  }

  const content = readFileSync(gitignorePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  if (lines.includes(requiredLine)) {
    return;
  }

  const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
  writeFileSync(gitignorePath, `${content}${separator}${requiredLine}\n`, 'utf-8');
}

export function ensureSubdir(directory: string, subdir: string): string {
  const fullPath = join(directory, GSTACK_DIR, subdir);
  mkdirSync(fullPath, { recursive: true });
  return fullPath;
}

export function ensureWorkspaceDir(directory: string): void {
  const gstackRoot = join(directory, GSTACK_DIR);
  mkdirSync(gstackRoot, { recursive: true });

  for (const subdir of WORKSPACE_SUBDIRS) {
    ensureSubdir(directory, subdir);
  }

  ensureGitignoreEntry(directory);
}
