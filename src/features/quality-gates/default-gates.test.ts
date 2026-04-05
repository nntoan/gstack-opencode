import { describe, it, expect } from 'bun:test';
import { createDefaultGates } from './default-gates.ts';
import type { GateContext } from '../../types/quality-gate.ts';

const makeContext = (overrides?: Partial<GateContext>): GateContext => ({
  fromPhase: 'think',
  toPhase: 'plan',
  sessionID: 'sess-1',
  metadata: {},
  ...overrides,
});

describe('createDefaultGates', () => {
  it('returns exactly 3 gates', () => {
    const gates = createDefaultGates();
    expect(gates).toHaveLength(3);
  });

  it('all gates have non-empty names and descriptions', () => {
    const gates = createDefaultGates();
    for (const gate of gates) {
      expect(typeof gate.name).toBe('string');
      expect(gate.name.length).toBeGreaterThan(0);
      expect(typeof gate.description).toBe('string');
      expect(gate.description.length).toBeGreaterThan(0);
    }
  });

  it('gate names are unique', () => {
    const gates = createDefaultGates();
    const names = gates.map((g) => g.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  describe('require-user-confirmation (think->plan)', () => {
    it('warns when user_confirmed is missing', () => {
      const gates = createDefaultGates();
      const gate = gates.find((g) => g.name === 'require-user-confirmation');
      expect(gate).toBeDefined();
      expect(gate!.transition).toBe('think->plan');

      const result = gate!.evaluate(
        makeContext({ fromPhase: 'think', toPhase: 'plan', metadata: {} })
      );
      expect(result.verdict).toBe('warn');
      expect(result.gateName).toBe('require-user-confirmation');
      expect(result.message).toContain('ask for confirmation');
    });

    it('warns when user_confirmed is false', () => {
      const gates = createDefaultGates();
      const gate = gates.find((g) => g.name === 'require-user-confirmation')!;

      const result = gate.evaluate(
        makeContext({ fromPhase: 'think', toPhase: 'plan', metadata: { user_confirmed: false } })
      );
      expect(result.verdict).toBe('warn');
    });

    it('passes when user_confirmed is true', () => {
      const gates = createDefaultGates();
      const gate = gates.find((g) => g.name === 'require-user-confirmation')!;

      const result = gate.evaluate(
        makeContext({ fromPhase: 'think', toPhase: 'plan', metadata: { user_confirmed: true } })
      );
      expect(result.verdict).toBe('pass');
      expect(result.message).toContain('confirmed direction');
    });
  });

  describe('require-approved-plan (plan->build)', () => {
    it('warns when plan_approved is missing', () => {
      const gates = createDefaultGates();
      const gate = gates.find((g) => g.name === 'require-approved-plan');
      expect(gate).toBeDefined();
      expect(gate!.transition).toBe('plan->build');

      const result = gate!.evaluate(
        makeContext({ fromPhase: 'plan', toPhase: 'build', metadata: {} })
      );
      expect(result.verdict).toBe('warn');
      expect(result.gateName).toBe('require-approved-plan');
      expect(result.message).toContain('present a plan');
    });

    it('warns when plan_approved is false', () => {
      const gates = createDefaultGates();
      const gate = gates.find((g) => g.name === 'require-approved-plan')!;

      const result = gate.evaluate(
        makeContext({ fromPhase: 'plan', toPhase: 'build', metadata: { plan_approved: false } })
      );
      expect(result.verdict).toBe('warn');
    });

    it('passes when plan_approved is true', () => {
      const gates = createDefaultGates();
      const gate = gates.find((g) => g.name === 'require-approved-plan')!;

      const result = gate.evaluate(
        makeContext({ fromPhase: 'plan', toPhase: 'build', metadata: { plan_approved: true } })
      );
      expect(result.verdict).toBe('pass');
      expect(result.message).toContain('approved');
    });
  });

  describe('require-passing-tests (build->review)', () => {
    it('warns when tests_passed is missing', () => {
      const gates = createDefaultGates();
      const gate = gates.find((g) => g.name === 'require-passing-tests');
      expect(gate).toBeDefined();
      expect(gate!.transition).toBe('build->review');

      const result = gate!.evaluate(
        makeContext({ fromPhase: 'build', toPhase: 'review', metadata: {} })
      );
      expect(result.verdict).toBe('warn');
      expect(result.gateName).toBe('require-passing-tests');
      expect(result.message).toContain('run tests');
    });

    it('warns when tests_passed is false', () => {
      const gates = createDefaultGates();
      const gate = gates.find((g) => g.name === 'require-passing-tests')!;

      const result = gate.evaluate(
        makeContext({ fromPhase: 'build', toPhase: 'review', metadata: { tests_passed: false } })
      );
      expect(result.verdict).toBe('warn');
    });

    it('passes when tests_passed is true', () => {
      const gates = createDefaultGates();
      const gate = gates.find((g) => g.name === 'require-passing-tests')!;

      const result = gate.evaluate(
        makeContext({ fromPhase: 'build', toPhase: 'review', metadata: { tests_passed: true } })
      );
      expect(result.verdict).toBe('pass');
      expect(result.message).toContain('passing');
    });
  });
});
