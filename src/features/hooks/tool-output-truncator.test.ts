import { describe, it, expect } from 'bun:test';
import { createToolOutputTruncator, MAX_TOOL_OUTPUT_LENGTH } from './tool-output-truncator.ts';

describe('createToolOutputTruncator', () => {
  it('exports MAX_TOOL_OUTPUT_LENGTH as 50_000', () => {
    expect(MAX_TOOL_OUTPUT_LENGTH).toBe(50_000);
  });

  it('output under limit is untouched', async () => {
    const hook = createToolOutputTruncator();
    const output = { title: 'grep results', output: 'short output', metadata: null };
    await hook.handler({ tool: 'grep', sessionID: '', callID: '', args: {} }, output);
    expect(output.output).toBe('short output');
  });

  it('output over limit is truncated with message', async () => {
    const hook = createToolOutputTruncator();
    const longOutput = 'x'.repeat(MAX_TOOL_OUTPUT_LENGTH + 1000);
    const output = { title: 'grep results', output: longOutput, metadata: null };
    await hook.handler({ tool: 'grep', sessionID: '', callID: '', args: {} }, output);

    expect(output.output.length).toBeLessThan(longOutput.length);
    expect(output.output).toContain(`[Output truncated`);
    expect(output.output).toContain(`${MAX_TOOL_OUTPUT_LENGTH} chars`);
    expect(output.output.startsWith('x'.repeat(MAX_TOOL_OUTPUT_LENGTH))).toBe(true);
  });

  it('truncation message contains original and truncated char counts', async () => {
    const hook = createToolOutputTruncator();
    const original = 'a'.repeat(MAX_TOOL_OUTPUT_LENGTH + 500);
    const output = { title: '', output: original, metadata: null };
    await hook.handler({ tool: 'bash', sessionID: '', callID: '', args: {} }, output);

    expect(output.output).toContain(`${original.length} chars`);
    expect(output.output).toContain(`${MAX_TOOL_OUTPUT_LENGTH} chars`);
  });

  it('output exactly at limit is untouched', async () => {
    const hook = createToolOutputTruncator();
    const exactOutput = 'y'.repeat(MAX_TOOL_OUTPUT_LENGTH);
    const output = { title: '', output: exactOutput, metadata: null };
    await hook.handler({ tool: 'glob', sessionID: '', callID: '', args: {} }, output);
    expect(output.output).toBe(exactOutput);
  });

  it('hook has correct event and toolFilter', () => {
    const hook = createToolOutputTruncator();
    expect(hook.event).toBe('tool.execute.after');
    expect(Array.isArray(hook.toolFilter)).toBe(true);
    expect((hook.toolFilter as string[]).includes('grep')).toBe(true);
    expect((hook.toolFilter as string[]).includes('glob')).toBe(true);
    expect((hook.toolFilter as string[]).includes('bash')).toBe(true);
    expect((hook.toolFilter as string[]).includes('Grep')).toBe(true);
    expect((hook.toolFilter as string[]).includes('Glob')).toBe(true);
    expect((hook.toolFilter as string[]).includes('Bash')).toBe(true);
  });

  it('output is not a string — skips truncation', async () => {
    const hook = createToolOutputTruncator();
    const output = { title: '', output: null as unknown as string, metadata: null };
    await expect(
      hook.handler({ tool: 'bash', sessionID: '', callID: '', args: {} }, output)
    ).resolves.toBeUndefined();
  });
});
