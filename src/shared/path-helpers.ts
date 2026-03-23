import { mkdir } from 'node:fs/promises';

export function getGstackDir(projectDir: string): string {
  return `${projectDir}/.gstack`;
}

export function getBrowserDir(projectDir: string): string {
  return `${projectDir}/.gstack/browser`;
}

export function getOrchestratorDir(projectDir: string): string {
  return `${projectDir}/.gstack/orchestrator`;
}

export function getPlansDir(projectDir: string): string {
  return `${projectDir}/.gstack/plans`;
}

export function getNotepadsDir(projectDir: string, planName: string): string {
  return `${projectDir}/.gstack/notepads/${planName}`;
}

export function getEvidenceDir(projectDir: string): string {
  return `${projectDir}/.gstack/evidence`;
}

export function getReviewsDir(projectDir: string): string {
  return `${projectDir}/.gstack/reviews`;
}

export function getSessionsDir(projectDir: string): string {
  return `${projectDir}/.gstack/sessions`;
}

export function getAnalyticsDir(projectDir: string): string {
  return `${projectDir}/.gstack/analytics`;
}

export function getRulesDir(projectDir: string): string {
  return `${projectDir}/.gstack/rules`;
}

export function getDesignDocsDir(projectDir: string): string {
  return `${projectDir}/.gstack/design-docs`;
}

export function getBrowseStatePath(projectDir: string): string {
  return `${projectDir}/.gstack/browser/browse.json`;
}

export function getBoulderPath(projectDir: string): string {
  return `${projectDir}/.gstack/orchestrator/boulder.json`;
}

export function getStatePath(projectDir: string): string {
  return `${projectDir}/.gstack/orchestrator/state.json`;
}

export function getSprintLogPath(projectDir: string): string {
  return `${projectDir}/.gstack/orchestrator/sprint-log.jsonl`;
}

export function getBacklogDir(projectDir: string): string {
  return `${projectDir}/.backlog`;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}
