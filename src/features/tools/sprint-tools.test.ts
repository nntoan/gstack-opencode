import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createWorkspaceState } from '../workspace-state/index.ts';
import { createAnalytics } from '../analytics/index.ts';
import { getAnalyticsDir, getPlansDir } from '../../shared/path-helpers.ts';
import type { Managers } from '../../create-managers.ts';
import {
  createSavePlanTool,
  createLoadPlanTool,
  createPlanProgressTool,
  createNotepadTool,
  createSprintStatusTool,
  createRecordReviewTool,
  createShipReadinessTool,
} from './sprint-tools.ts';
import { createBoulderState } from '../workspace-state/index.ts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'gstack-tools-test-'));
}

function makeManagers(directory: string): Pick<Managers, 'workspaceState' | 'analytics'> {
  return {
    workspaceState: createWorkspaceState(directory),
    analytics: createAnalytics({
      analyticsDir: getAnalyticsDir(directory),
      enabled: false,
    }),
  };
}

/**
 * Minimal ToolContext that satisfies the execute() signature.
 * Only `directory` is used by any of these tools.
 */
function makeContext(directory: string) {
  return {
    sessionID: 'test-session',
    messageID: 'test-msg',
    agent: 'builder',
    directory,
    worktree: directory,
    abort: AbortSignal.abort(),
    metadata: () => {},
    ask: async () => {},
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('sprint-tools', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  // ── save-plan ──────────────────────────────────────────────────────────────

  describe('save-plan', () => {
    it('writes plan to correct path and returns confirmation', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const savePlan = createSavePlanTool(directory, managers);
      const result = await savePlan.execute(
        { name: 'my-feature', content: '# Plan\n- [ ] task one\n' },
        makeContext(directory)
      );

      expect(result).toBe('Plan saved: .gstack/plans/my-feature.md');

      const filePath = join(getPlansDir(directory), 'my-feature.md');
      const written = readFileSync(filePath, 'utf-8');
      expect(written).toBe('# Plan\n- [ ] task one\n');
    });

    it('creates plans directory if it does not exist', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const savePlan = createSavePlanTool(directory, managers);
      await savePlan.execute({ name: 'new-plan', content: '# New' }, makeContext(directory));

      const filePath = join(getPlansDir(directory), 'new-plan.md');
      expect(readFileSync(filePath, 'utf-8')).toBe('# New');
    });

    it('initializes boulder state on first plan save', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const savePlan = createSavePlanTool(directory, managers);
      await savePlan.execute(
        { name: 'first-plan', content: '# First Plan' },
        makeContext(directory)
      );

      const boulder = managers.workspaceState.boulder.read();
      expect(boulder).not.toBeNull();
      expect(boulder?.plan_name).toBe('first-plan');
    });

    it('does not overwrite existing boulder state', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const plansDir = getPlansDir(directory);
      mkdirSync(plansDir, { recursive: true });
      const firstPlanPath = join(plansDir, 'existing.md');
      writeFileSync(firstPlanPath, '# Existing', 'utf-8');
      managers.workspaceState.boulder.write(createBoulderState(firstPlanPath, 'session-0'));

      const savePlan = createSavePlanTool(directory, managers);
      await savePlan.execute({ name: 'second-plan', content: '# Second' }, makeContext(directory));

      const boulder = managers.workspaceState.boulder.read();
      expect(boulder?.plan_name).toBe('existing');
    });

    it('rejects path traversal attempts', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const savePlan = createSavePlanTool(directory, managers);
      const result = await savePlan.execute(
        { name: '../../malicious', content: 'hacked' },
        makeContext(directory)
      );

      expect(result).toContain('path traversal detected');
    });
  });

  // ── load-plan ──────────────────────────────────────────────────────────────

  describe('load-plan', () => {
    it('reads plan content when name is provided', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const plansDir = getPlansDir(directory);
      mkdirSync(plansDir, { recursive: true });
      writeFileSync(join(plansDir, 'feature-x.md'), '# Feature X\n- [x] done\n', 'utf-8');

      const loadPlan = createLoadPlanTool(directory);
      const result = await loadPlan.execute({ name: 'feature-x' }, makeContext(directory));

      expect(result).toBe('# Feature X\n- [x] done\n');
    });

    it('returns not-found message when plan does not exist', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const loadPlan = createLoadPlanTool(directory);
      const result = await loadPlan.execute({ name: 'missing' }, makeContext(directory));

      expect(result).toBe('Plan not found: .gstack/plans/missing.md');
    });

    it('lists all plans when no name provided', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const plansDir = getPlansDir(directory);
      mkdirSync(plansDir, { recursive: true });
      writeFileSync(join(plansDir, 'alpha.md'), '# Alpha', 'utf-8');
      writeFileSync(join(plansDir, 'beta.md'), '# Beta', 'utf-8');

      const loadPlan = createLoadPlanTool(directory);
      const result = await loadPlan.execute({}, makeContext(directory));

      expect(result).toContain('Available plans:');
      expect(result).toContain('alpha');
      expect(result).toContain('beta');
    });

    it('returns empty message when plans directory does not exist', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const loadPlan = createLoadPlanTool(directory);
      const result = await loadPlan.execute({}, makeContext(directory));

      expect(result).toContain('No plans directory found');
    });

    it('rejects path traversal attempts', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const loadPlan = createLoadPlanTool(directory);
      const result = await loadPlan.execute(
        { name: '../../../etc/passwd' },
        makeContext(directory)
      );

      expect(result).toContain('path traversal detected');
    });
  });

  // ── plan-progress ──────────────────────────────────────────────────────────

  describe('plan-progress', () => {
    it('returns correct counts for a plan with mixed checkboxes', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const plansDir = getPlansDir(directory);
      mkdirSync(plansDir, { recursive: true });
      writeFileSync(
        join(plansDir, 'sprint.md'),
        '- [x] done\n- [x] also done\n- [ ] todo\n',
        'utf-8'
      );

      const managers = makeManagers(directory) as Managers;
      const progressTool = createPlanProgressTool(managers);
      const result = await progressTool.execute({ name: 'sprint' }, makeContext(directory));

      expect(result).toContain('2/3 tasks completed');
      expect(result).toContain('67%');
    });

    it('returns complete message when all tasks are done', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const plansDir = getPlansDir(directory);
      mkdirSync(plansDir, { recursive: true });
      writeFileSync(join(plansDir, 'done.md'), '- [x] task\n- [X] task2\n', 'utf-8');

      const managers = makeManagers(directory) as Managers;
      const progressTool = createPlanProgressTool(managers);
      const result = await progressTool.execute({ name: 'done' }, makeContext(directory));

      expect(result).toContain('COMPLETE');
    });

    it('reports no checkboxes for missing plan', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const progressTool = createPlanProgressTool(managers);
      const result = await progressTool.execute({ name: 'ghost' }, makeContext(directory));

      expect(result).toContain('no checkboxes found');
    });
  });

  // ── notepad ────────────────────────────────────────────────────────────────

  describe('notepad', () => {
    it('write then read round-trips content', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const notepadTool = createNotepadTool(managers);
      const ctx = makeContext(directory);

      await notepadTool.execute(
        { action: 'write', plan: 'my-plan', category: 'learnings', content: 'line one' },
        ctx
      );
      const result = await notepadTool.execute(
        { action: 'read', plan: 'my-plan', category: 'learnings' },
        ctx
      );

      expect(result).toContain('line one');
    });

    it('list returns categories', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const notepadTool = createNotepadTool(managers);
      const ctx = makeContext(directory);

      await notepadTool.execute(
        { action: 'write', plan: 'p1', category: 'risks', content: 'risk note' },
        ctx
      );
      const result = await notepadTool.execute({ action: 'list', plan: 'p1' }, ctx);

      expect(result).toContain('risks');
    });

    it('returns error when category missing for read', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const notepadTool = createNotepadTool(managers);
      const result = await notepadTool.execute(
        { action: 'read', plan: 'p1' },
        makeContext(directory)
      );

      expect(result).toContain('category is required');
    });

    it('returns error when content missing for write', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const notepadTool = createNotepadTool(managers);
      const result = await notepadTool.execute(
        { action: 'write', plan: 'p1', category: 'x' },
        makeContext(directory)
      );

      expect(result).toContain('content is required');
    });
  });

  // ── sprint-status ──────────────────────────────────────────────────────────

  describe('sprint-status', () => {
    it('shows no active sprint when boulder state is absent', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const statusTool = createSprintStatusTool(managers);
      const result = await statusTool.execute({}, makeContext(directory));

      expect(result).toContain('No active sprint');
    });

    it('reads boulder state when present', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;

      // Write boulder state directly
      const plansDir = getPlansDir(directory);
      mkdirSync(plansDir, { recursive: true });
      writeFileSync(join(plansDir, 'phase4.md'), '# phase4\n', 'utf-8');
      managers.workspaceState.boulder.write({
        active_plan: join(plansDir, 'phase4.md'),
        started_at: '2026-01-01T00:00:00.000Z',
        session_ids: ['s1'],
        plan_name: 'phase4',
        current_phase: 'build',
        agent: 'builder',
      });

      const statusTool = createSprintStatusTool(managers);
      const result = await statusTool.execute({}, makeContext(directory));

      expect(result).toContain('phase4');
      expect(result).toContain('build');
      expect(result).toContain('builder');
    });
  });

  // ── record-review ──────────────────────────────────────────────────────────

  describe('record-review', () => {
    it('records review and returns updated status', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const recordReview = createRecordReviewTool(managers);

      const result = await recordReview.execute(
        {
          reviewType: 'eng',
          status: 'passed',
          reviewer: 'alice',
          findings: 'looks good, nice tests',
        },
        makeContext(directory)
      );

      expect(result).toContain('eng — passed');
      expect(result).toContain('Total reviews: 1');
      expect(result).toContain('Ship-ready');
    });

    it('records failed review and shows not-ready status', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const recordReview = createRecordReviewTool(managers);

      const result = await recordReview.execute(
        { reviewType: 'design', status: 'failed' },
        makeContext(directory)
      );

      expect(result).toContain('design — failed');
      expect(result).toContain('Not ready');
    });
  });

  // ── ship-readiness ─────────────────────────────────────────────────────────

  describe('ship-readiness', () => {
    it('reports not ready when no reviews exist', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      const shipReadiness = createShipReadinessTool(managers);
      const result = await shipReadiness.execute({}, makeContext(directory));

      expect(result).toContain('Not ready to ship');
      expect(result).toContain('eng:passed');
    });

    it('reports ready after eng:passed review is recorded', async () => {
      const directory = createTempDir();
      tempDirs.push(directory);

      const managers = makeManagers(directory) as Managers;
      await managers.workspaceState.reviews.record({
        reviewType: 'eng',
        status: 'passed',
        timestamp: new Date().toISOString(),
      });

      const shipReadiness = createShipReadinessTool(managers);
      const result = await shipReadiness.execute({}, makeContext(directory));

      expect(result).toContain('Ready to ship');
    });
  });
});
