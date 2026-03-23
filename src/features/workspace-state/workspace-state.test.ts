import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  appendSessionId,
  clearBoulderState,
  createBoulderState,
  createNotepadManager,
  createReviewDashboard,
  createSessionTracker,
  ensureWorkspaceDir,
  getBoulderFilePath,
  getPlanProgress,
  readBoulderState,
  upsertTaskSessionState,
  writeBoulderState,
} from './index.ts';
import { getSessionsDir } from '../../shared/path-helpers.ts';
function createTempProjectDir(): string {
  return mkdtempSync(join(tmpdir(), 'gstack-workspace-state-test-'));
}
describe('workspace-state', () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });
  it('boulder CRUD works across create/write/read/append/clear', () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);
    const planPath = join(directory, '.gstack', 'plans', 'demo-plan.md');
    mkdirSync(join(directory, '.gstack', 'plans'), { recursive: true });
    writeFileSync(planPath, '- [ ] demo\n', 'utf-8');
    const created = createBoulderState(planPath, 'session-1', 'builder');
    expect(writeBoulderState(directory, created)).toBe(true);
    expect(getBoulderFilePath(directory)).toBe(
      join(directory, '.gstack', 'orchestrator', 'boulder.json')
    );
    const readBack = readBoulderState(directory);
    expect(readBack?.plan_name).toBe('demo-plan');
    expect(readBack?.session_ids).toEqual(['session-1']);
    const appended = appendSessionId(directory, 'session-2');
    expect(appended?.session_ids).toEqual(['session-1', 'session-2']);
    expect(clearBoulderState(directory)).toBe(true);
    expect(readBoulderState(directory)).toBeNull();
  });
  it('upsertTaskSessionState rejects reserved keys', () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);
    const state = createBoulderState('/tmp/p.md', 'session-1');
    writeBoulderState(directory, state);
    const result = upsertTaskSessionState(directory, {
      taskKey: '__proto__',
      taskLabel: '1',
      taskTitle: 'reserved',
      sessionId: 'session-1',
    });
    expect(result).toBeNull();
  });
  it('getPlanProgress counts markdown checkboxes', () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);
    const planPath = join(directory, 'plan.md');
    writeFileSync(planPath, '- [ ] todo\n- [x] done\n* [X] done2\n', 'utf-8');
    const progress = getPlanProgress(planPath);
    expect(progress).toEqual({ total: 3, completed: 2, isComplete: false });
  });
  it('session tracker supports start/complete/getActive lifecycle', async () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);
    const tracker = createSessionTracker(directory);
    await tracker.start('sess-a', 'build', 'builder');
    const activeBefore = await tracker.getActive();
    expect(activeBefore.map((s) => s.sessionId)).toContain('sess-a');
    const completed = await tracker.complete('sess-a');
    expect(completed?.status).toBe('completed');
    const activeAfter = await tracker.getActive();
    expect(activeAfter).toHaveLength(0);
  });
  it('session tracker cleanup removes old session files', async () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);
    const tracker = createSessionTracker(directory);
    await tracker.start('old-session', 'build', 'builder');
    await tracker.start('new-session', 'build', 'builder');
    const oldPath = join(getSessionsDir(directory), 'old-session.json');
    const oldTimestampSeconds = (Date.now() - 10_000) / 1000;
    utimesSync(oldPath, oldTimestampSeconds, oldTimestampSeconds);
    const removed = await tracker.cleanup(5_000);
    expect(removed).toBe(1);
    expect(existsSync(oldPath)).toBe(false);
    expect(existsSync(join(getSessionsDir(directory), 'new-session.json'))).toBe(true);
  });
  it('review dashboard record/getStatus round-trips entries', async () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);
    const dashboard = createReviewDashboard(directory);
    await dashboard.record({
      reviewType: 'eng',
      status: 'passed',
      reviewer: 'alice',
      timestamp: new Date().toISOString(),
      findings: ['ok'],
    });
    const status = await dashboard.getStatus();
    expect(status).toHaveLength(1);
    expect(status[0].reviewType).toBe('eng');
    expect(status[0].status).toBe('passed');
  });
  it('review dashboard requires eng:passed for ship readiness', async () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);
    const dashboard = createReviewDashboard(directory);
    expect(await dashboard.isShipReady()).toEqual({ ready: false, missing: ['eng:passed'] });
    await dashboard.record({
      reviewType: 'design',
      status: 'failed',
      timestamp: new Date().toISOString(),
    });
    expect(await dashboard.isShipReady()).toEqual({ ready: false, missing: ['eng:passed'] });
    await dashboard.record({
      reviewType: 'eng',
      status: 'passed',
      timestamp: new Date().toISOString(),
    });
    expect(await dashboard.isShipReady()).toEqual({ ready: true, missing: [] });
  });
  it('notepad manager write/read round-trips content', async () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);
    const notepads = createNotepadManager(directory, 'plan-a');
    await notepads.write('learnings', 'first line');
    await notepads.write('learnings', 'second line');
    const content = await notepads.read('learnings');
    expect(content).toContain('first line\n');
    expect(content).toContain('second line\n');
    const files = await notepads.list();
    expect(files).toContain('learnings.md');
  });
  it('ensureWorkspaceDir creates .gstack and appends .gstack/ to .gitignore', () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);
    writeFileSync(join(directory, '.gitignore'), 'node_modules/\n', 'utf-8');
    ensureWorkspaceDir(directory);
    const gstackDir = join(directory, '.gstack');
    expect(existsSync(gstackDir)).toBe(true);
    expect(statSync(join(gstackDir, 'orchestrator')).isDirectory()).toBe(true);
    expect(statSync(join(gstackDir, 'sessions')).isDirectory()).toBe(true);
    const gitignoreContent = readFileSync(join(directory, '.gitignore'), 'utf-8');
    expect(gitignoreContent).toContain('.gstack/');
  });
});
