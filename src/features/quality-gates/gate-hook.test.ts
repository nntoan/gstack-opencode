import { describe, it, expect, mock } from 'bun:test';
import { createGateHook, getNextPhases } from './gate-hook.ts';
import { createGateEngine } from './gate-engine.ts';
import type { GateDefinition, GateEngine } from '../../types/quality-gate.ts';
import type { SprintPhase } from '../../types/agent.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import type { DelegationStateManager } from '../orchestrator/index.ts';

const makeGate = (
  overrides: Partial<GateDefinition> & Pick<GateDefinition, 'transition'>
): GateDefinition => ({
  name: 'test-gate',
  description: 'A test gate',
  evaluate: () => ({ gateName: 'test-gate', verdict: 'pass', message: 'ok' }),
  ...overrides,
});

const makeHookParams = (overrides?: {
  gateEngine?: GateEngine;
  currentPhase?: SprintPhase;
  metadata?: Record<string, unknown>;
}) => ({
  gateEngine: overrides?.gateEngine ?? createGateEngine(),
  getCurrentPhase: (_sessionID: string): SprintPhase | undefined => overrides?.currentPhase,
  getSessionMetadata: (_sessionID: string): Record<string, unknown> => overrides?.metadata ?? {},
});

function makeCompanyState(workflowId = 'wf-test-123') {
  return {
    version: 1 as const,
    visible_agent: 'company' as const,
    source: 'canonical' as const,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    session_ids: ['sess-1'],
    workflow_id: workflowId,
    current_phase: 'build' as SprintPhase,
    plan_name: 'Test plan',
    visible_context: {
      current_goal: 'Build the feature',
    },
    ownership: {
      snapshot: 'state.json' as const,
      log: 'sprint-log.jsonl' as const,
      checkpoints: 'checkpoints/' as const,
    },
  };
}

function makeWorkspaceState(companyStateOverride?: ReturnType<typeof makeCompanyState> | null) {
  const capturedCheckpoints: unknown[] = [];
  const capturedWaits: unknown[] = [];

  const ws = {
    company: {
      readResolved: mock(() => companyStateOverride ?? makeCompanyState()),
      write: mock(() => true),
      writeCheckpoint: mock((cp: unknown) => {
        capturedCheckpoints.push(cp);
        return true;
      }),
      writeDecisionWait: mock((wait: unknown) => {
        capturedWaits.push(wait);
        return true;
      }),
    },
    _capturedCheckpoints: capturedCheckpoints,
    _capturedWaits: capturedWaits,
  };
  return ws as unknown as ReturnType<typeof createWorkspaceState> & {
    _capturedCheckpoints: unknown[];
    _capturedWaits: unknown[];
  };
}

function makeDelegationState() {
  const contexts = new Map<string, unknown>();
  return {
    setPendingContext: mock((sessionId: string, context: unknown) => {
      contexts.set(sessionId, context);
    }),
    getPendingContext: mock((sessionId: string) => contexts.get(sessionId) ?? null),
    clearPendingContext: mock((_sessionId: string) => {
      return;
    }),
    _contexts: contexts,
  } as unknown as DelegationStateManager & { _contexts: Map<string, unknown> };
}

describe('createGateHook (Company mode)', () => {
  it('Test 1: in Company mode, a block gate writes a fresh checkpoint before prompt is pushed to system output', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        name: 'block-gate',
        transition: 'build->review',
        evaluate: () => ({
          gateName: 'block-gate',
          verdict: 'block',
          message: 'Tests are not passing',
        }),
      })
    );

    const ws = makeWorkspaceState();
    const ds = makeDelegationState();

    const hook = createGateHook({
      ...makeHookParams({ gateEngine: engine, currentPhase: 'build' }),
      workspaceState: ws,
      delegationState: ds,
      companyMode: true,
    });

    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(ws.company.writeCheckpoint).toHaveBeenCalledTimes(1);
    expect(ws._capturedCheckpoints).toHaveLength(1);
    expect(output.system).toHaveLength(1);
    expect(output.system[0]).toContain('## Company Decision Required');
  });

  it('Test 1: in Company mode, a warn gate writes a fresh checkpoint before prompt is pushed to system output', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        name: 'warn-gate',
        transition: 'think->plan',
        evaluate: () => ({
          gateName: 'warn-gate',
          verdict: 'warn',
          message: 'Please confirm direction',
        }),
      })
    );

    const ws = makeWorkspaceState();
    const ds = makeDelegationState();

    const hook = createGateHook({
      ...makeHookParams({ gateEngine: engine, currentPhase: 'think' }),
      workspaceState: ws,
      delegationState: ds,
      companyMode: true,
    });

    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(ws.company.writeCheckpoint).toHaveBeenCalledTimes(1);
    expect(output.system[0]).toContain('## Company Decision Required');
    expect(output.system[0]).toContain('Confirm the recommendation before continuing.');
  });

  it('Test 2: in Company mode, creates an approval decision wait with resolution_action continue-same-workflow', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        name: 'block-gate',
        transition: 'plan->build',
        evaluate: () => ({
          gateName: 'block-gate',
          verdict: 'block',
          message: 'Plan not approved',
        }),
      })
    );

    const ws = makeWorkspaceState();
    const ds = makeDelegationState();

    const hook = createGateHook({
      ...makeHookParams({ gateEngine: engine, currentPhase: 'plan' }),
      workspaceState: ws,
      delegationState: ds,
      companyMode: true,
    });

    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(ws.company.writeDecisionWait).toHaveBeenCalledTimes(1);
    expect(ws._capturedWaits).toHaveLength(1);

    const wait = ws._capturedWaits[0] as Record<string, unknown>;
    expect(wait['kind']).toBe('approval');
    expect(wait['resolution_action']).toBe('continue-same-workflow');
    expect(wait['status']).toBe('pending');
  });

  it('Test 2: in Company mode, stores pending context for the session with source gate', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        name: 'warn-gate',
        transition: 'build->review',
        evaluate: () => ({
          gateName: 'warn-gate',
          verdict: 'warn',
          message: 'Run tests before review',
        }),
      })
    );

    const ws = makeWorkspaceState();
    const ds = makeDelegationState();

    const hook = createGateHook({
      ...makeHookParams({ gateEngine: engine, currentPhase: 'build' }),
      workspaceState: ws,
      delegationState: ds,
      companyMode: true,
    });

    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(ds.setPendingContext).toHaveBeenCalledTimes(1);
    const callArgs = (ds.setPendingContext as ReturnType<typeof mock>).mock.calls[0];
    const context = callArgs[1] as Record<string, unknown>;
    expect(context['source']).toBe('gate');
    expect(context['approvalAction']).toBe('continue-same-workflow');
    expect(context['kind']).toBe('approval');
  });

  it('Test 3: non-Company mode preserves existing read-only warning behavior', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        name: 'warn-gate',
        transition: 'think->plan',
        evaluate: () => ({
          gateName: 'warn-gate',
          verdict: 'warn',
          message: 'please confirm',
        }),
      })
    );

    const ws = makeWorkspaceState();
    const ds = makeDelegationState();

    const hook = createGateHook({
      ...makeHookParams({ gateEngine: engine, currentPhase: 'think' }),
      workspaceState: ws,
      delegationState: ds,
      companyMode: false,
    });

    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(ws.company.writeCheckpoint).not.toHaveBeenCalled();
    expect(ws.company.writeDecisionWait).not.toHaveBeenCalled();
    expect(ds.setPendingContext).not.toHaveBeenCalled();
    expect(output.system).toHaveLength(1);
    expect(output.system[0]).toContain('⚠️');
    expect(output.system[0]).toContain('please confirm');
  });

  it('Test 4: repeated renders for the same session do not create duplicate checkpoints', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        name: 'block-gate',
        transition: 'build->review',
        evaluate: () => ({
          gateName: 'block-gate',
          verdict: 'block',
          message: 'Tests not passing',
        }),
      })
    );

    const ws = makeWorkspaceState();
    const ds = makeDelegationState();

    const hook = createGateHook({
      ...makeHookParams({ gateEngine: engine, currentPhase: 'build' }),
      workspaceState: ws,
      delegationState: ds,
      companyMode: true,
    });

    const output1 = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output1);

    const capturedWait = ws._capturedWaits[0] as Record<string, unknown>;
    const pendingWaitId = capturedWait['id'] as string;

    const pendingContext = (ds.setPendingContext as ReturnType<typeof mock>).mock
      .calls[0][1] as Record<string, unknown>;
    expect(pendingContext['pendingWaitId']).toBe(pendingWaitId);

    (ds.getPendingContext as ReturnType<typeof mock>).mockImplementation(() => pendingContext);

    const output2 = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output2);

    expect(ws.company.writeCheckpoint).toHaveBeenCalledTimes(1);
    expect(ws._capturedCheckpoints).toHaveLength(1);
  });

  it('does not write checkpoint when no warn/block gates trigger', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        name: 'pass-gate',
        transition: 'build->review',
        evaluate: () => ({ gateName: 'pass-gate', verdict: 'pass', message: 'all good' }),
      })
    );

    const ws = makeWorkspaceState();
    const ds = makeDelegationState();

    const hook = createGateHook({
      ...makeHookParams({ gateEngine: engine, currentPhase: 'build' }),
      workspaceState: ws,
      delegationState: ds,
      companyMode: true,
    });

    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(ws.company.writeCheckpoint).not.toHaveBeenCalled();
    expect(ws.company.writeDecisionWait).not.toHaveBeenCalled();
    expect(output.system).toEqual([]);
  });

  it('falls back to non-Company behavior when workspaceState is not provided', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        name: 'warn-gate',
        transition: 'think->plan',
        evaluate: () => ({ gateName: 'warn-gate', verdict: 'warn', message: 'a warning' }),
      })
    );

    const hook = createGateHook({
      ...makeHookParams({ gateEngine: engine, currentPhase: 'think' }),
    });

    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(output.system).toHaveLength(1);
    expect(output.system[0]).toContain('⚠️');
  });
});

describe('createGateHook', () => {
  it('returns a hook with name quality-gate-checker', () => {
    const hook = createGateHook(makeHookParams());
    expect(hook.name).toBe('quality-gate-checker');
  });

  it('returns a hook with event system.transform', () => {
    const hook = createGateHook(makeHookParams());
    expect(hook.event).toBe('system.transform');
  });

  it('does nothing when no phase is available for session', async () => {
    const hook = createGateHook(makeHookParams({ currentPhase: undefined }));
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);
    expect(output.system).toEqual([]);
  });

  it('does nothing when current phase has no natural next phases', async () => {
    const hook = createGateHook(makeHookParams({ currentPhase: 'reflect' }));
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);
    expect(output.system).toEqual([]);
  });

  it('does nothing when no gates are registered for the transition', async () => {
    const engine = createGateEngine();
    const hook = createGateHook(makeHookParams({ gateEngine: engine, currentPhase: 'think' }));
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);
    expect(output.system).toEqual([]);
  });

  it('injects warning with ⚠️ prefix for warn verdicts', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        name: 'warn-gate',
        transition: 'think->plan',
        evaluate: () => ({ gateName: 'warn-gate', verdict: 'warn', message: 'please confirm' }),
      })
    );

    const hook = createGateHook(makeHookParams({ gateEngine: engine, currentPhase: 'think' }));
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(output.system).toHaveLength(1);
    expect(output.system[0]).toContain('⚠️');
    expect(output.system[0]).toContain('plan');
    expect(output.system[0]).toContain('please confirm');
  });

  it('injects warning with ⛔ prefix for block verdicts', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        name: 'block-gate',
        transition: 'plan->build',
        evaluate: () => ({ gateName: 'block-gate', verdict: 'block', message: 'no plan approved' }),
      })
    );

    const hook = createGateHook(makeHookParams({ gateEngine: engine, currentPhase: 'plan' }));
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(output.system).toHaveLength(1);
    expect(output.system[0]).toContain('⛔');
    expect(output.system[0]).toContain('BLOCKED');
    expect(output.system[0]).toContain('no plan approved');
  });

  it('pushes to system array without replacing existing entries', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        transition: 'build->review',
        evaluate: () => ({ gateName: 'test-gate', verdict: 'warn', message: 'run tests first' }),
      })
    );

    const hook = createGateHook(makeHookParams({ gateEngine: engine, currentPhase: 'build' }));
    const output = { system: ['## Existing Context\n\nsome instructions'] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(output.system).toHaveLength(2);
    expect(output.system[0]).toBe('## Existing Context\n\nsome instructions');
    expect(output.system[1]).toContain('Quality Gates');
  });

  it('includes ## Quality Gates heading in injected content', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        transition: 'think->plan',
        evaluate: () => ({ gateName: 'test-gate', verdict: 'warn', message: 'a warning' }),
      })
    );

    const hook = createGateHook(makeHookParams({ gateEngine: engine, currentPhase: 'think' }));
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(output.system[0]).toContain('## Quality Gates');
  });

  it('handles sessionID being undefined gracefully', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        transition: 'think->plan',
        evaluate: () => ({ gateName: 'test-gate', verdict: 'warn', message: 'warning' }),
      })
    );

    const hook = createGateHook(makeHookParams({ gateEngine: engine, currentPhase: 'think' }));
    const output = { system: [] as string[] };
    await hook.handler({}, output);

    expect(output.system).toHaveLength(1);
  });

  it('handles both block and warn gates in the same transition', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        name: 'block-gate',
        transition: 'review->test',
        evaluate: () => ({
          gateName: 'block-gate',
          verdict: 'block',
          message: 'critical blocker',
        }),
      })
    );
    engine.register(
      makeGate({
        name: 'warn-gate',
        transition: 'review->test',
        evaluate: () => ({ gateName: 'warn-gate', verdict: 'warn', message: 'soft warning' }),
      })
    );

    const hook = createGateHook(makeHookParams({ gateEngine: engine, currentPhase: 'review' }));
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    const injected = output.system[0];
    expect(injected).toContain('⛔');
    expect(injected).toContain('critical blocker');
    expect(injected).toContain('⚠️');
    expect(injected).toContain('soft warning');
  });

  it('pass verdicts do not add any warnings to output', async () => {
    const engine = createGateEngine();
    engine.register(
      makeGate({
        transition: 'think->plan',
        evaluate: () => ({ gateName: 'test-gate', verdict: 'pass', message: 'all good' }),
      })
    );

    const hook = createGateHook(makeHookParams({ gateEngine: engine, currentPhase: 'think' }));
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);

    expect(output.system).toEqual([]);
  });
});

describe('getNextPhases', () => {
  it('think -> [plan]', () => expect(getNextPhases('think')).toEqual(['plan']));
  it('plan -> [build]', () => expect(getNextPhases('plan')).toEqual(['build']));
  it('build -> [review]', () => expect(getNextPhases('build')).toEqual(['review']));
  it('review -> [test]', () => expect(getNextPhases('review')).toEqual(['test']));
  it('test -> [ship]', () => expect(getNextPhases('test')).toEqual(['ship']));
  it('ship -> [] (terminal)', () => expect(getNextPhases('ship')).toEqual([]));
  it('reflect -> [] (terminal)', () => expect(getNextPhases('reflect')).toEqual([]));
  it('cross-cutting -> [] (no linear next)', () =>
    expect(getNextPhases('cross-cutting')).toEqual([]));
  it('utility -> [] (no linear next)', () => expect(getNextPhases('utility')).toEqual([]));
});
