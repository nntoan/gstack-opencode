import { describe, it, expect } from 'bun:test';
import {
  getGstackDir,
  getBrowserDir,
  getOrchestratorDir,
  getPlansDir,
  getNotepadsDir,
  getEvidenceDir,
  getReviewsDir,
  getSessionsDir,
  getAnalyticsDir,
  getRulesDir,
  getDesignDocsDir,
  getBrowseStatePath,
  getBoulderPath,
  getStatePath,
  getSprintLogPath,
  getBacklogDir,
} from './path-helpers.ts';

describe('path-helpers', () => {
  const projectDir = '/test/project';

  it('getGstackDir returns correct path', () => {
    const result = getGstackDir(projectDir);
    expect(result).toBe('/test/project/.gstack');
  });

  it('getBrowserDir returns correct path', () => {
    const result = getBrowserDir(projectDir);
    expect(result).toBe('/test/project/.gstack/browser');
  });

  it('getOrchestratorDir returns correct path', () => {
    const result = getOrchestratorDir(projectDir);
    expect(result).toBe('/test/project/.gstack/orchestrator');
  });

  it('getPlansDir returns correct path', () => {
    const result = getPlansDir(projectDir);
    expect(result).toBe('/test/project/.gstack/plans');
  });

  it('getNotepadsDir returns correct path with plan name', () => {
    const result = getNotepadsDir(projectDir, 'my-plan');
    expect(result).toBe('/test/project/.gstack/notepads/my-plan');
  });

  it('getEvidenceDir returns correct path', () => {
    const result = getEvidenceDir(projectDir);
    expect(result).toBe('/test/project/.gstack/evidence');
  });

  it('getReviewsDir returns correct path', () => {
    const result = getReviewsDir(projectDir);
    expect(result).toBe('/test/project/.gstack/reviews');
  });

  it('getSessionsDir returns correct path', () => {
    const result = getSessionsDir(projectDir);
    expect(result).toBe('/test/project/.gstack/sessions');
  });

  it('getAnalyticsDir returns correct path', () => {
    const result = getAnalyticsDir(projectDir);
    expect(result).toBe('/test/project/.gstack/analytics');
  });

  it('getRulesDir returns correct path', () => {
    const result = getRulesDir(projectDir);
    expect(result).toBe('/test/project/.gstack/rules');
  });

  it('getDesignDocsDir returns correct path', () => {
    const result = getDesignDocsDir(projectDir);
    expect(result).toBe('/test/project/.gstack/design-docs');
  });

  it('getBrowseStatePath returns correct path', () => {
    const result = getBrowseStatePath(projectDir);
    expect(result).toBe('/test/project/.gstack/browser/browse.json');
  });

  it('getBoulderPath returns correct path', () => {
    const result = getBoulderPath(projectDir);
    expect(result).toBe('/test/project/.gstack/orchestrator/boulder.json');
  });

  it('getStatePath returns correct path', () => {
    const result = getStatePath(projectDir);
    expect(result).toBe('/test/project/.gstack/orchestrator/state.json');
  });

  it('getSprintLogPath returns correct path', () => {
    const result = getSprintLogPath(projectDir);
    expect(result).toBe('/test/project/.gstack/orchestrator/sprint-log.jsonl');
  });

  it('getBacklogDir returns correct path outside gstack', () => {
    const result = getBacklogDir(projectDir);
    expect(result).toBe('/test/project/.backlog');
  });
});
