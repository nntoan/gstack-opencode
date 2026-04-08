import { describe, expect, it } from 'vitest';
import { createCompanyMigrationLogEntry, migrateBoulderStateToCompanyState } from './migration.ts';
import type { BoulderState } from '../workspace-state/types.ts';

describe('migrateBoulderStateToCompanyState', () => {
  it('converts a full BoulderState into a canonical Company state', () => {
    const boulder: BoulderState = {
      active_plan: '.gstack/plans/sprint-1.md',
      plan_name: 'sprint-1',
      started_at: '2026-01-01T10:00:00Z',
      session_ids: ['sess-a', 'sess-b'],
      agent: 'builder',
      current_phase: 'build',
    };
    const nowIso = '2026-04-08T12:00:00Z';
    const result = migrateBoulderStateToCompanyState(boulder, nowIso);

    expect(result.version).toBe(1);
    expect(result.visible_agent).toBe('company');
    expect(result.source).toBe('legacy-boulder');
    expect(result.started_at).toBe('2026-01-01T10:00:00Z');
    expect(result.updated_at).toBe(nowIso);
    expect(result.session_ids).toEqual(['sess-a', 'sess-b']);
    expect(result.active_plan).toBe('.gstack/plans/sprint-1.md');
    expect(result.plan_name).toBe('sprint-1');
    expect(result.current_phase).toBe('build');
    expect(result.active_specialist).toBe('builder');
    expect(result.ownership).toBeDefined();
    expect(result.ownership.snapshot).toBe('state.json');
  });

  it('produces valid canonical Company state with empty-safe defaults for missing optional fields', () => {
    const boulder: BoulderState = {
      active_plan: '.gstack/plans/test.md',
      plan_name: 'test',
      started_at: '2026-02-01T08:00:00Z',
      session_ids: [],
    };
    const nowIso = '2026-04-08T13:00:00Z';
    const result = migrateBoulderStateToCompanyState(boulder, nowIso);

    expect(result.version).toBe(1);
    expect(result.visible_agent).toBe('company');
    expect(result.source).toBe('legacy-boulder');
    expect(result.session_ids).toEqual([]);
    expect(result.active_specialist).toBeUndefined();
    expect(result.current_phase).toBeUndefined();
    expect(result.ownership).toBeDefined();
  });

  it('preserves active_plan, plan_name, and current_phase exactly when present', () => {
    const boulder: BoulderState = {
      active_plan: '/path/to/plan.md',
      plan_name: 'my-plan',
      started_at: '2026-03-01T09:00:00Z',
      session_ids: ['s1'],
      current_phase: 'review',
    };
    const nowIso = '2026-04-08T14:00:00Z';
    const result = migrateBoulderStateToCompanyState(boulder, nowIso);

    expect(result.active_plan).toBe('/path/to/plan.md');
    expect(result.plan_name).toBe('my-plan');
    expect(result.current_phase).toBe('review');
  });
});

describe('createCompanyMigrationLogEntry', () => {
  it('creates a log entry with kind "migration" that references boulder.json', () => {
    const nowIso = '2026-04-08T12:00:00Z';
    const entry = createCompanyMigrationLogEntry('sess-a', nowIso);

    expect(entry.ts).toBe(nowIso);
    expect(entry.event).toBe('migration');
    expect(entry.data).toBeDefined();
    expect(entry.data?.kind).toBe('migration');
    expect(entry.data?.source_artifact).toBe('boulder.json');
    expect(entry.data?.session_id).toBe('sess-a');
  });

  it('includes source_artifact boulder.json in the log envelope', () => {
    const entry = createCompanyMigrationLogEntry('sess-x', '2026-04-08T15:00:00Z');
    expect(String(entry.data?.source_artifact)).toContain('boulder.json');
  });
});
