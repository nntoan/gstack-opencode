import type {
  HookDefinition,
  ToolExecuteAfterInput,
  ToolExecuteAfterOutput,
} from '../../types/hooks.ts';

export const MAX_TOOL_OUTPUT_LENGTH = 50_000;

const TOOL_FILTER = ['grep', 'glob', 'bash', 'Grep', 'Glob', 'Bash'];

export function createToolOutputTruncator(): HookDefinition {
  return {
    name: 'tool-output-truncator',
    event: 'tool.execute.after',
    toolFilter: TOOL_FILTER,
    handler: async (input: unknown, output: unknown): Promise<void> => {
      const _input = input as ToolExecuteAfterInput;
      const typedOutput = output as ToolExecuteAfterOutput;

      if (typeof typedOutput.output !== 'string') return;
      if (typedOutput.output.length <= MAX_TOOL_OUTPUT_LENGTH) return;

      const original = typedOutput.output.length;
      typedOutput.output =
        typedOutput.output.slice(0, MAX_TOOL_OUTPUT_LENGTH) +
        `\n\n[Output truncated — ${original} chars → ${MAX_TOOL_OUTPUT_LENGTH} chars]`;
      void _input;
    },
  };
}
