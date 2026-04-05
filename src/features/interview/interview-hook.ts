import type {
  HookDefinition,
  SystemTransformInput,
  SystemTransformOutput,
} from '../../types/hooks.ts';
import type { SprintPhase } from '../../types/agent.ts';
import { getInterviewInstructions, getQuestionToolGuidance } from './interview-prompts.ts';

const DEFAULT_PHASE: SprintPhase = 'think';

export function createInterviewModeHook(params: {
  getCurrentPhase: (sessionID: string) => SprintPhase | undefined;
}): HookDefinition {
  return {
    name: 'interview-mode-injector',
    event: 'system.transform',
    handler: async (input: unknown, output: unknown): Promise<void> => {
      const typedInput = input as SystemTransformInput;
      const typedOutput = output as SystemTransformOutput;

      const phase = params.getCurrentPhase(typedInput.sessionID ?? '') ?? DEFAULT_PHASE;

      const instructions = getInterviewInstructions(phase);
      const guidance = getQuestionToolGuidance();

      typedOutput.system.push(`## Interview Mode\n\n${instructions}\n\n${guidance}`);
    },
  };
}
