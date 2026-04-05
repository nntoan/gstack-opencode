import { describe, it, expect } from 'bun:test';
import { createGateHook, getNextPhases } from './gate-hook.ts';
import { createGateEngine } from './gate-engine.ts';
import type { GateDefinition, GateEngine } from '../../types/quality-gate.ts';
import type { SprintPhase } from '../../types/agent.ts';

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
    // Pass input without sessionID
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
