import type { SprintPhase } from './agent.ts';

export type GateVerdict = 'pass' | 'warn' | 'block';

export interface GateResult {
  gateName: string;
  verdict: GateVerdict;
  message: string;
  details?: string;
}

export type GateTransition = `${SprintPhase}->${SprintPhase}`;

export type GateEvaluator = (context: GateContext) => GateResult;

export interface GateContext {
  fromPhase: SprintPhase;
  toPhase: SprintPhase;
  sessionID: string;
  /** Metadata from the session — tests passing, plan approved, etc. */
  metadata: Record<string, unknown>;
}

export interface GateDefinition {
  name: string;
  transition: GateTransition;
  description: string;
  evaluate: GateEvaluator;
}

export interface GateEngine {
  register(gate: GateDefinition): void;
  evaluate(context: GateContext): GateResult[];
  getGatesForTransition(transition: GateTransition): GateDefinition[];
}
