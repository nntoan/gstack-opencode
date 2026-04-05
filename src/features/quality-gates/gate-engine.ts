import type {
  GateContext,
  GateDefinition,
  GateEngine,
  GateResult,
  GateTransition,
} from '../../types/quality-gate.ts';

export function createGateEngine(): GateEngine {
  const gates = new Map<GateTransition, GateDefinition[]>();

  function register(gate: GateDefinition): void {
    const existing = gates.get(gate.transition) ?? [];
    existing.push(gate);
    gates.set(gate.transition, existing);
  }

  function evaluate(context: GateContext): GateResult[] {
    const transition: GateTransition = `${context.fromPhase}->${context.toPhase}`;
    const registered = gates.get(transition);

    if (!registered || registered.length === 0) return [];

    return registered.map((gate) => gate.evaluate(context));
  }

  function getGatesForTransition(transition: GateTransition): GateDefinition[] {
    return gates.get(transition) ?? [];
  }

  return { register, evaluate, getGatesForTransition };
}
