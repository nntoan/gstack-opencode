import type {
  HookDefinition,
  ToolExecuteAfterInput,
  ToolExecuteAfterOutput,
} from '../../types/hooks.ts';

const TOOL_FILTER = ['read', 'Read'];

export function createAgentsMdInjector(config: { orchestrationMode: string }): HookDefinition {
  return {
    name: 'agents-md-injector',
    event: 'tool.execute.after',
    toolFilter: TOOL_FILTER,
    handler: async (input: unknown, output: unknown): Promise<void> => {
      const typedInput = input as ToolExecuteAfterInput;
      const typedOutput = output as ToolExecuteAfterOutput;

      const titleHasAgentsMd =
        typeof typedOutput.title === 'string' && typedOutput.title.includes('AGENTS.md');
      const argsHasAgentsMd =
        typedInput.args !== null &&
        typedInput.args !== undefined &&
        typeof typedInput.args === 'object' &&
        'filePath' in (typedInput.args as Record<string, unknown>) &&
        typeof (typedInput.args as Record<string, unknown>).filePath === 'string' &&
        ((typedInput.args as Record<string, unknown>).filePath as string).endsWith('AGENTS.md');

      if (!titleHasAgentsMd && !argsHasAgentsMd) return;

      const injected =
        `\n\n<!-- gstack:context -->\n` +
        `[gstack] Sprint lifecycle active. Current orchestration mode: ${config.orchestrationMode}.\n` +
        `Phases: think → plan → build → review → test → ship → reflect\n` +
        `<!-- /gstack:context -->`;

      if (typeof typedOutput.output === 'string') {
        typedOutput.output += injected;
      }
    },
  };
}
