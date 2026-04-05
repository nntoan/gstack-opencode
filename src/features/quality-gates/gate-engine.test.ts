import { describe, it, expect, beforeEach } from 'bun:test';
import { createGateEngine } from './gate-engine.ts';
import type { GateContext, GateDefinition, GateEngine } from '../../types/quality-gate.ts';

const makeContext = (overrides?: Partial<GateContext>): GateContext => ({
  fromPhase: 'think',
  toPhase: 'plan',
  sessionID: 'sess-1',
  metadata: {},
  ...overrides,
});

const makeGate = (overrides?: Partial<GateDefinition>): GateDefinition => ({
  name: 'test-gate',
  transition: 'think->plan',
  description: 'A test gate',
  evaluate: () => ({ gateName: 'test-gate', verdict: 'pass', message: 'ok' }),
  ...overrides,
});

describe('createGateEngine', () => {
  let engine: GateEngine;

  beforeEach(() => {
    engine = createGateEngine();
  });

  it('returns an engine with register, evaluate, and getGatesForTransition', () => {
    expect(typeof engine.register).toBe('function');
    expect(typeof engine.evaluate).toBe('function');
    expect(typeof engine.getGatesForTransition).toBe('function');
  });

  it('empty engine returns empty results for any transition', () => {
    const results = engine.evaluate(makeContext());
    expect(results).toEqual([]);
  });

  it('getGatesForTransition returns empty array when no gates registered', () => {
    const gates = engine.getGatesForTransition('think->plan');
    expect(gates).toEqual([]);
  });

  it('registers a gate and evaluates it for matching transition', () => {
    const gate = makeGate();
    engine.register(gate);

    const results = engine.evaluate(makeContext({ fromPhase: 'think', toPhase: 'plan' }));
    expect(results).toHaveLength(1);
    expect(results[0].gateName).toBe('test-gate');
    expect(results[0].verdict).toBe('pass');
  });

  it('non-matching transition returns empty results', () => {
    engine.register(makeGate({ transition: 'think->plan' }));

    const results = engine.evaluate(makeContext({ fromPhase: 'plan', toPhase: 'build' }));
    expect(results).toEqual([]);
  });

  it('evaluates all gates — does not short-circuit on first block', () => {
    const evaluated: string[] = [];

    engine.register(
      makeGate({
        name: 'gate-1',
        transition: 'build->review',
        evaluate: () => {
          evaluated.push('gate-1');
          return { gateName: 'gate-1', verdict: 'block', message: 'blocked' };
        },
      })
    );
    engine.register(
      makeGate({
        name: 'gate-2',
        transition: 'build->review',
        evaluate: () => {
          evaluated.push('gate-2');
          return { gateName: 'gate-2', verdict: 'pass', message: 'ok' };
        },
      })
    );
    engine.register(
      makeGate({
        name: 'gate-3',
        transition: 'build->review',
        evaluate: () => {
          evaluated.push('gate-3');
          return { gateName: 'gate-3', verdict: 'warn', message: 'warning' };
        },
      })
    );

    const ctx = makeContext({ fromPhase: 'build', toPhase: 'review' });
    const results = engine.evaluate(ctx);

    expect(evaluated).toEqual(['gate-1', 'gate-2', 'gate-3']);
    expect(results).toHaveLength(3);
  });

  it('getGatesForTransition returns registered gates for a transition', () => {
    const gate1 = makeGate({ name: 'gate-a', transition: 'plan->build' });
    const gate2 = makeGate({ name: 'gate-b', transition: 'plan->build' });
    const gate3 = makeGate({ name: 'gate-c', transition: 'build->review' });

    engine.register(gate1);
    engine.register(gate2);
    engine.register(gate3);

    const planBuild = engine.getGatesForTransition('plan->build');
    expect(planBuild).toHaveLength(2);
    expect(planBuild[0].name).toBe('gate-a');
    expect(planBuild[1].name).toBe('gate-b');

    const buildReview = engine.getGatesForTransition('build->review');
    expect(buildReview).toHaveLength(1);
    expect(buildReview[0].name).toBe('gate-c');
  });

  it('multiple gates on same transition all run in registration order', () => {
    const order: number[] = [];

    for (let i = 1; i <= 4; i++) {
      const idx = i;
      engine.register(
        makeGate({
          name: `gate-${idx}`,
          transition: 'test->ship',
          evaluate: () => {
            order.push(idx);
            return { gateName: `gate-${idx}`, verdict: 'pass', message: 'ok' };
          },
        })
      );
    }

    const results = engine.evaluate(makeContext({ fromPhase: 'test', toPhase: 'ship' }));

    expect(order).toEqual([1, 2, 3, 4]);
    expect(results).toHaveLength(4);
  });

  it('gates for different transitions do not interfere', () => {
    engine.register(
      makeGate({
        name: 'think-plan-gate',
        transition: 'think->plan',
        evaluate: () => ({ gateName: 'think-plan-gate', verdict: 'pass', message: 'ok' }),
      })
    );
    engine.register(
      makeGate({
        name: 'plan-build-gate',
        transition: 'plan->build',
        evaluate: () => ({ gateName: 'plan-build-gate', verdict: 'warn', message: 'careful' }),
      })
    );

    const thinkPlanResults = engine.evaluate(makeContext({ fromPhase: 'think', toPhase: 'plan' }));
    expect(thinkPlanResults).toHaveLength(1);
    expect(thinkPlanResults[0].gateName).toBe('think-plan-gate');

    const planBuildResults = engine.evaluate(makeContext({ fromPhase: 'plan', toPhase: 'build' }));
    expect(planBuildResults).toHaveLength(1);
    expect(planBuildResults[0].gateName).toBe('plan-build-gate');
  });
});
