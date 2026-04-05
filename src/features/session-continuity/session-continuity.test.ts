import { describe, it, expect } from 'vitest';
import { createBoulderHook } from './boulder-hook.ts';
import { createProgressHook } from './progress-hook.ts';
import { createRecoveryHook } from './recovery-hook.ts';
import type {
  BoulderState,
  PlanProgress,
  SessionRecord,
  ReviewDashboardEntry,
} from '../workspace-state/index.ts';
import type { ShipReadiness } from '../workspace-state/review-dashboard.ts';
import type { DelegationResult } from '../orchestrator/index.ts';
import type { GstackAgent } from '../../types/agent.ts';

// --- Fakes ---

function makeAgent(role: string = 'builder'): GstackAgent {
  return {
    role: role as GstackAgent['role'],
    name: role,
    description: '',
    sprintPhase: 'build',
    skills: [],
    instructions: '',
  };
}

function makeDelegation(phase: string = 'build', role: string = 'builder'): DelegationResult {
  return {
    agent: makeAgent(role),
    skills: [],
    phase: phase as DelegationResult['phase'],
    reasoning: 'test',
  };
}

interface FakeWorkspaceStateOpts {
  boulderState?: BoulderState | null;
  progress?: PlanProgress;
  writtenStates?: BoulderState[];
  appendedIds?: string[];
}

function makeFakeWorkspaceState(opts: FakeWorkspaceStateOpts = {}) {
  let currentBoulder = opts.boulderState ?? null;
  const writtenStates = opts.writtenStates ?? [];
  const appendedIds = opts.appendedIds ?? [];
  const progress: PlanProgress = opts.progress ?? { total: 5, completed: 2, isComplete: false };

  const fakeRecord: SessionRecord = {
    sessionId: 'fake',
    startedAt: new Date().toISOString(),
    phase: 'build',
    agent: 'builder',
    status: 'active',
  };

  return {
    boulder: {
      read: () => currentBoulder,
      write: (state: BoulderState) => {
        currentBoulder = state;
        writtenStates.push(state);
        return true;
      },
      append: (sessionId: string) => {
        appendedIds.push(sessionId);
        return currentBoulder;
      },
      clear: () => true,
      upsert: () => null,
    },
    plans: {
      getProgress: (_planPath: string): PlanProgress => progress,
      getName: (_planPath: string) => 'test-plan',
      find: () => [],
    },
    sessions: {
      start: async (): Promise<SessionRecord> => fakeRecord,
      complete: async (): Promise<SessionRecord | null> => null,
      getActive: async (): Promise<SessionRecord[]> => [],
      cleanup: async (): Promise<number> => 0,
    },
    reviews: {
      record: async (): Promise<ReviewDashboardEntry[]> => [],
      getStatus: async (): Promise<ReviewDashboardEntry[]> => [],
      isShipReady: async (): Promise<ShipReadiness> => ({ ready: false, missing: ['eng:passed'] }),
    },
    notepads: () => ({
      write: async () => {},
      read: async () => '',
      list: async () => [] as string[],
    }),
    ensureDir: () => {},
    writtenStates,
    appendedIds,
  };
}

interface FakeDelegationStateOpts {
  delegations?: Map<string, DelegationResult>;
}

function makeFakeDelegationState(opts: FakeDelegationStateOpts = {}) {
  const delegations = opts.delegations ?? new Map<string, DelegationResult>();
  return {
    getDelegation: (sessionId: string): DelegationResult | null =>
      delegations.get(sessionId) ?? null,
    setDelegation: (sessionId: string, result: DelegationResult): void => {
      delegations.set(sessionId, result);
    },
    clearSession: (sessionId: string): void => {
      delegations.delete(sessionId);
    },
    clearAll: (): void => {
      delegations.clear();
    },
  };
}

// --- Boulder Hook Tests ---

describe('createBoulderHook', () => {
  it('has correct name and event', () => {
    const hook = createBoulderHook({
      workspaceState: makeFakeWorkspaceState() as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    expect(hook.name).toBe('boulder-state-tracker');
    expect(hook.event).toBe('system.transform');
  });

  it('does nothing when sessionID is absent', async () => {
    const ws = makeFakeWorkspaceState({ boulderState: null });
    const hook = createBoulderHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({}, {});
    expect(ws.writtenStates).toHaveLength(0);
    expect(ws.appendedIds).toHaveLength(0);
  });

  it('does nothing when no delegation for session', async () => {
    const ws = makeFakeWorkspaceState({
      boulderState: {
        active_plan: '/path/plan.md',
        started_at: new Date().toISOString(),
        session_ids: [],
        plan_name: 'test-plan',
        current_phase: 'plan',
      },
    });
    const hook = createBoulderHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(ws.writtenStates).toHaveLength(0);
  });

  it('does nothing when boulder state is null', async () => {
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build'));
    const ws = makeFakeWorkspaceState({ boulderState: null });
    const hook = createBoulderHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState: makeFakeDelegationState({
        delegations,
      }) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(ws.writtenStates).toHaveLength(0);
  });

  it('updates boulder when phase changes', async () => {
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build', 'builder'));
    const boulderState: BoulderState = {
      active_plan: '/path/plan.md',
      started_at: new Date().toISOString(),
      session_ids: [],
      plan_name: 'test-plan',
      current_phase: 'plan', // different from delegation phase 'build'
    };
    const ws = makeFakeWorkspaceState({ boulderState });
    const hook = createBoulderHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState: makeFakeDelegationState({
        delegations,
      }) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(ws.writtenStates).toHaveLength(1);
    expect(ws.writtenStates[0].current_phase).toBe('build');
    expect(ws.writtenStates[0].agent).toBe('builder');
  });

  it('appends session ID after processing', async () => {
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build'));
    const boulderState: BoulderState = {
      active_plan: '/path/plan.md',
      started_at: new Date().toISOString(),
      session_ids: [],
      plan_name: 'test-plan',
      current_phase: 'build', // same as delegation — no write
    };
    const ws = makeFakeWorkspaceState({ boulderState });
    const hook = createBoulderHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState: makeFakeDelegationState({
        delegations,
      }) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(ws.appendedIds).toContain('sess-1');
  });

  it('does not write when phase and agent are unchanged', async () => {
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build'));
    const boulderState: BoulderState = {
      active_plan: '/path/plan.md',
      started_at: new Date().toISOString(),
      session_ids: [],
      plan_name: 'test-plan',
      current_phase: 'build', // same
      agent: 'builder', // same
    };
    const ws = makeFakeWorkspaceState({ boulderState });
    const hook = createBoulderHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState: makeFakeDelegationState({
        delegations,
      }) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(ws.writtenStates).toHaveLength(0);
  });

  it('writes when agent changes within the same phase', async () => {
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build', 'debugger'));
    const boulderState: BoulderState = {
      active_plan: '/path/plan.md',
      started_at: new Date().toISOString(),
      session_ids: [],
      plan_name: 'test-plan',
      current_phase: 'build',
      agent: 'builder', // different from delegation's 'debugger'
    };
    const ws = makeFakeWorkspaceState({ boulderState });
    const hook = createBoulderHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState: makeFakeDelegationState({
        delegations,
      }) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(ws.writtenStates).toHaveLength(1);
    expect(ws.writtenStates[0]?.agent).toBe('debugger');
  });
});

// --- Progress Hook Tests ---

describe('createProgressHook', () => {
  it('has correct name and event', () => {
    const hook = createProgressHook({
      workspaceState: makeFakeWorkspaceState() as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
    });
    expect(hook.name).toBe('plan-progress-injector');
    expect(hook.event).toBe('system.transform');
  });

  it('does nothing when output has no system array', async () => {
    const ws = makeFakeWorkspaceState({ boulderState: null });
    const hook = createProgressHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
    });
    const output = {};
    await hook.handler({}, output);
    expect(output).toEqual({});
  });

  it('does nothing when no boulder state', async () => {
    const ws = makeFakeWorkspaceState({ boulderState: null });
    const hook = createProgressHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
    });
    const output = { system: [] as string[] };
    await hook.handler({}, output);
    expect(output.system).toHaveLength(0);
  });

  it('does nothing when progress total is 0', async () => {
    const ws = makeFakeWorkspaceState({
      boulderState: {
        active_plan: '/path/plan.md',
        started_at: new Date().toISOString(),
        session_ids: [],
        plan_name: 'test-plan',
      },
      progress: { total: 0, completed: 0, isComplete: false },
    });
    const hook = createProgressHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
    });
    const output = { system: [] as string[] };
    await hook.handler({}, output);
    expect(output.system).toHaveLength(0);
  });

  it('injects progress line when boulder has active plan', async () => {
    const ws = makeFakeWorkspaceState({
      boulderState: {
        active_plan: '/path/plan.md',
        started_at: new Date().toISOString(),
        session_ids: [],
        plan_name: 'My Plan',
        current_phase: 'build',
        agent: 'builder',
      },
      progress: { total: 10, completed: 4, isComplete: false },
    });
    const hook = createProgressHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
    });
    const output = { system: [] as string[] };
    await hook.handler({}, output);
    expect(output.system).toHaveLength(1);
    expect(output.system[0]).toContain('## Sprint Progress');
    expect(output.system[0]).toContain('My Plan');
    expect(output.system[0]).toContain('4/10');
    expect(output.system[0]).toContain('40%');
    expect(output.system[0]).toContain('build');
    expect(output.system[0]).toContain('builder');
  });

  it('shows COMPLETE status when plan is complete', async () => {
    const ws = makeFakeWorkspaceState({
      boulderState: {
        active_plan: '/path/plan.md',
        started_at: new Date().toISOString(),
        session_ids: [],
        plan_name: 'Done Plan',
      },
      progress: { total: 5, completed: 5, isComplete: true },
    });
    const hook = createProgressHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
    });
    const output = { system: [] as string[] };
    await hook.handler({}, output);
    expect(output.system[0]).toContain('COMPLETE');
    expect(output.system[0]).toContain('5/5');
  });

  it('preserves existing system entries', async () => {
    const ws = makeFakeWorkspaceState({
      boulderState: {
        active_plan: '/path/plan.md',
        started_at: new Date().toISOString(),
        session_ids: [],
        plan_name: 'My Plan',
      },
      progress: { total: 3, completed: 1, isComplete: false },
    });
    const hook = createProgressHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
    });
    const output = { system: ['## Existing'] as string[] };
    await hook.handler({}, output);
    expect(output.system).toHaveLength(2);
    expect(output.system[0]).toBe('## Existing');
  });
});

// --- Recovery Hook Tests ---

describe('createRecoveryHook', () => {
  it('has correct name and event', () => {
    const hook = createRecoveryHook({
      workspaceState: makeFakeWorkspaceState() as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    expect(hook.name).toBe('session-recovery');
    expect(hook.event).toBe('system.transform');
  });

  it('does nothing when output has no system array', async () => {
    const hook = createRecoveryHook({
      workspaceState: makeFakeWorkspaceState() as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = {};
    await hook.handler({ sessionID: 'sess-1' }, output);
    expect(output).toEqual({});
  });

  it('does nothing when sessionID is absent', async () => {
    const hook = createRecoveryHook({
      workspaceState: makeFakeWorkspaceState() as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = { system: [] as string[] };
    await hook.handler({}, output);
    expect(output.system).toHaveLength(0);
  });

  it('does NOT inject when active delegation exists', async () => {
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build'));
    const ws = makeFakeWorkspaceState({
      boulderState: {
        active_plan: '/path/plan.md',
        started_at: new Date().toISOString(),
        session_ids: [],
        plan_name: 'Active Plan',
      },
    });
    const hook = createRecoveryHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState: makeFakeDelegationState({
        delegations,
      }) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);
    expect(output.system).toHaveLength(0);
  });

  it('does nothing when boulder state has no active plan', async () => {
    const hook = createRecoveryHook({
      workspaceState: makeFakeWorkspaceState({ boulderState: null }) as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);
    expect(output.system).toHaveLength(0);
  });

  it('injects recovery context when no delegation and boulder has active plan', async () => {
    const ws = makeFakeWorkspaceState({
      boulderState: {
        active_plan: '/path/plan.md',
        started_at: new Date().toISOString(),
        session_ids: ['old-sess'],
        plan_name: 'My Sprint Plan',
        current_phase: 'review',
        agent: 'reviewer',
      },
      progress: { total: 8, completed: 6, isComplete: false },
    });
    const hook = createRecoveryHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'new-sess' }, output);
    expect(output.system).toHaveLength(1);
    const ctx = output.system[0];
    expect(ctx).toContain('## Session Recovery');
    expect(ctx).toContain('My Sprint Plan');
    expect(ctx).toContain('6/8');
    expect(ctx).toContain('75%');
    expect(ctx).toContain('review');
    expect(ctx).toContain('reviewer');
  });

  it('shows correct progress data including percentage', async () => {
    const ws = makeFakeWorkspaceState({
      boulderState: {
        active_plan: '/path/plan.md',
        started_at: new Date().toISOString(),
        session_ids: [],
        plan_name: 'Plan X',
      },
      progress: { total: 4, completed: 1, isComplete: false },
    });
    const hook = createRecoveryHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'new-sess' }, output);
    expect(output.system[0]).toContain('1/4');
    expect(output.system[0]).toContain('25%');
  });
});
