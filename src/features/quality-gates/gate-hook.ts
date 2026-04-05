import type { SprintPhase } from '../../types/agent.ts';
import type {
  HookDefinition,
  SystemTransformInput,
  SystemTransformOutput,
} from '../../types/hooks.ts';
import type { GateEngine } from '../../types/quality-gate.ts';

export function getNextPhases(current: SprintPhase): SprintPhase[] {
  const transitions: Partial<Record<SprintPhase, SprintPhase[]>> = {
    think: ['plan'],
    plan: ['build'],
    build: ['review'],
    review: ['test'],
    test: ['ship'],
  };
  return transitions[current] ?? [];
}

export function createGateHook(params: {
  gateEngine: GateEngine;
  getCurrentPhase: (sessionID: string) => SprintPhase | undefined;
  getSessionMetadata: (sessionID: string) => Record<string, unknown>;
}): HookDefinition {
  return {
    name: 'quality-gate-checker',
    event: 'system.transform',
    handler: async (input: unknown, output: unknown): Promise<void> => {
      const typedInput = input as SystemTransformInput;
      const typedOutput = output as SystemTransformOutput;

      const currentPhase = params.getCurrentPhase(typedInput.sessionID ?? '');
      if (!currentPhase) return;

      const nextPhases = getNextPhases(currentPhase);
      if (nextPhases.length === 0) return;

      const warnings: string[] = [];

      for (const nextPhase of nextPhases) {
        const results = params.gateEngine.evaluate({
          fromPhase: currentPhase,
          toPhase: nextPhase,
          sessionID: typedInput.sessionID ?? '',
          metadata: params.getSessionMetadata(typedInput.sessionID ?? ''),
        });

        const blocking = results.filter((r) => r.verdict === 'block');
        const warning = results.filter((r) => r.verdict === 'warn');

        if (blocking.length > 0) {
          warnings.push(`⛔ BLOCKED: Cannot transition to ${nextPhase} phase:`);
          for (const b of blocking) warnings.push(`  - ${b.message}`);
        }
        if (warning.length > 0) {
          warnings.push(`⚠️ Before transitioning to ${nextPhase} phase:`);
          for (const w of warning) warnings.push(`  - ${w.message}`);
        }
      }

      if (warnings.length > 0) {
        typedOutput.system.push(`## Quality Gates\n\n${warnings.join('\n')}`);
      }
    },
  };
}
