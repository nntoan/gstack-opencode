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
  createWorkspaceState,
  ensureWorkspaceDir,
  getBoulderFilePath,
  getPlanProgress,
  readBoulderState,
  upsertTaskSessionState,
  writeBoulderState,
} from './index.ts';
import { getBoulderPath, getSessionsDir, getStatePath } from '../../shared/path-helpers.ts';
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

describe('createWorkspaceState - company facade', () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('company.read() returns canonical state.json when present', () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);

    const orchestratorDir = join(directory, '.gstack', 'orchestrator');
    mkdirSync(orchestratorDir, { recursive: true });

    const canonicalState = {
      version: 1,
      visible_agent: 'company',
      source: 'canonical',
      started_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-04-08T12:00:00Z',
      session_ids: ['sess-1'],
      ownership: { snapshot: 'state.json', log: 'sprint-log.jsonl', checkpoints: 'checkpoints/' },
    };
    writeFileSync(getStatePath(directory), JSON.stringify(canonicalState, null, 2), 'utf-8');

    const ws = createWorkspaceState(directory);
    const result = ws.company.read();

    expect(result).not.toBeNull();
    expect(result?.version).toBe(1);
    expect(result?.visible_agent).toBe('company');
    expect(result?.source).toBe('canonical');
  });

  it('company.readResolved() falls back to migrated BoulderState when state.json is absent', () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);

    const orchestratorDir = join(directory, '.gstack', 'orchestrator');
    mkdirSync(orchestratorDir, { recursive: true });

    const boulder = {
      active_plan: '.gstack/plans/sprint.md',
      plan_name: 'sprint',
      started_at: '2026-02-01T08:00:00Z',
      session_ids: ['sess-a'],
      agent: 'builder',
    };
    writeFileSync(getBoulderPath(directory), JSON.stringify(boulder, null, 2), 'utf-8');

    expect(existsSync(getStatePath(directory))).toBe(false);

    const ws = createWorkspaceState(directory);
    const result = ws.company.readResolved();

    expect(result).not.toBeNull();
    expect(result?.source).toBe('legacy-boulder');
    expect(result?.visible_agent).toBe('company');
    expect(result?.active_specialist).toBe('builder');
  });

  it('company.write() persists canonical state without deleting existing boulder.json', () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);

    const orchestratorDir = join(directory, '.gstack', 'orchestrator');
    mkdirSync(orchestratorDir, { recursive: true });

    const boulder = {
      active_plan: '.gstack/plans/test.md',
      plan_name: 'test',
      started_at: '2026-03-01T09:00:00Z',
      session_ids: [],
    };
    writeFileSync(getBoulderPath(directory), JSON.stringify(boulder, null, 2), 'utf-8');

    const ws = createWorkspaceState(directory);
    const stateToWrite = {
      version: 1 as const,
      visible_agent: 'company' as const,
      source: 'canonical' as const,
      started_at: '2026-03-01T09:00:00Z',
      updated_at: '2026-04-08T12:00:00Z',
      session_ids: ['sess-new'],
      ownership: {
        snapshot: 'state.json' as const,
        log: 'sprint-log.jsonl' as const,
        checkpoints: 'checkpoints/' as const,
      },
    };

    const writeResult = ws.company.write(stateToWrite);
    expect(writeResult).toBe(true);

    expect(existsSync(getStatePath(directory))).toBe(true);
    expect(existsSync(getBoulderPath(directory))).toBe(true);

    const written = JSON.parse(readFileSync(getStatePath(directory), 'utf-8'));
    expect(written.source).toBe('canonical');
  });

  it('company.appendLog() and company.readLog() delegate to Company storage helpers', () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);

    const ws = createWorkspaceState(directory);
    const entry = {
      ts: '2026-04-08T12:00:00Z',
      event: 'migration',
      data: { kind: 'migration', source_artifact: 'boulder.json', session_id: 'sess-1' },
    };

    ws.company.appendLog(entry);

    const entries = ws.company.readLog();
    expect(entries).toHaveLength(1);
    expect(entries[0].event).toBe('migration');
    expect(entries[0].data?.source_artifact).toBe('boulder.json');
  });

  it('company.writeCheckpoint() and company.readCheckpoint() delegate to Company storage helpers', () => {
    const directory = createTempProjectDir();
    tempDirs.push(directory);

    const ws = createWorkspaceState(directory);
    const checkpoint = {
      id: 'cp-001',
      captured_at: '2026-04-08T12:00:00Z',
      state: {
        version: 1 as const,
        visible_agent: 'company' as const,
        source: 'canonical' as const,
        started_at: '2026-04-08T10:00:00Z',
        updated_at: '2026-04-08T12:00:00Z',
        session_ids: [],
        ownership: {
          snapshot: 'state.json' as const,
          log: 'sprint-log.jsonl' as const,
          checkpoints: 'checkpoints/' as const,
        },
      },
      reason: 'test checkpoint',
    };

    const writeResult = ws.company.writeCheckpoint(checkpoint);
    expect(writeResult).toBe(true);

    const readBack = ws.company.readCheckpoint('cp-001');
    expect(readBack).not.toBeNull();
    expect(readBack?.id).toBe('cp-001');
    expect(readBack?.reason).toBe('test checkpoint');
  });
});
