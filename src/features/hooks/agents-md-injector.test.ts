import { describe, it, expect } from 'bun:test';
import { createAgentsMdInjector } from './agents-md-injector.ts';

describe('createAgentsMdInjector', () => {
  it('injects gstack context when args path ends with AGENTS.md', async () => {
    const hook = createAgentsMdInjector({ orchestrationMode: 'multi-agent' });
    const output = { title: '', output: '# AGENTS\nsome content', metadata: null };
    await hook.handler(
      { tool: 'read', sessionID: '', callID: '', args: { filePath: '/project/AGENTS.md' } },
      output
    );

    expect(output.output).toContain('<!-- gstack:context -->');
    expect(output.output).toContain('<!-- /gstack:context -->');
    expect(output.output).toContain('[gstack] Sprint lifecycle active.');
    expect(output.output).toContain('multi-agent');
  });

  it('injects gstack context when title contains AGENTS.md', async () => {
    const hook = createAgentsMdInjector({ orchestrationMode: 'skills-only' });
    const output = { title: 'Read AGENTS.md', output: '# Content', metadata: null };
    await hook.handler({ tool: 'Read', sessionID: '', callID: '', args: {} }, output);

    expect(output.output).toContain('<!-- gstack:context -->');
    expect(output.output).toContain('skills-only');
  });

  it('does not inject for other files', async () => {
    const hook = createAgentsMdInjector({ orchestrationMode: 'multi-agent' });
    const originalOutput = '# README\nsome content';
    const output = { title: 'Read README.md', output: originalOutput, metadata: null };
    await hook.handler(
      { tool: 'read', sessionID: '', callID: '', args: { filePath: '/project/README.md' } },
      output
    );

    expect(output.output).toBe(originalOutput);
    expect(output.output).not.toContain('<!-- gstack:context -->');
  });

  it('does not inject when args has no filePath', async () => {
    const hook = createAgentsMdInjector({ orchestrationMode: 'multi-agent' });
    const originalOutput = 'some content';
    const output = { title: 'Read file', output: originalOutput, metadata: null };
    await hook.handler({ tool: 'read', sessionID: '', callID: '', args: {} }, output);

    expect(output.output).toBe(originalOutput);
  });

  it('includes orchestration mode in injected text', async () => {
    const hook = createAgentsMdInjector({ orchestrationMode: 'skills-only' });
    const output = { title: '', output: 'content', metadata: null };
    await hook.handler(
      { tool: 'read', sessionID: '', callID: '', args: { filePath: '/app/AGENTS.md' } },
      output
    );

    expect(output.output).toContain('skills-only');
  });

  it('includes sprint phase lifecycle in injected text', async () => {
    const hook = createAgentsMdInjector({ orchestrationMode: 'multi-agent' });
    const output = { title: '', output: 'content', metadata: null };
    await hook.handler(
      { tool: 'read', sessionID: '', callID: '', args: { filePath: '/app/AGENTS.md' } },
      output
    );

    expect(output.output).toContain('think → plan → build → review → test → ship → reflect');
  });

  it('appends to existing output, does not replace', async () => {
    const hook = createAgentsMdInjector({ orchestrationMode: 'multi-agent' });
    const originalContent = '# Original AGENTS content';
    const output = { title: '', output: originalContent, metadata: null };
    await hook.handler(
      { tool: 'read', sessionID: '', callID: '', args: { filePath: '/AGENTS.md' } },
      output
    );

    expect(output.output.startsWith(originalContent)).toBe(true);
    expect(output.output.length).toBeGreaterThan(originalContent.length);
  });

  it('hook has correct event and toolFilter', () => {
    const hook = createAgentsMdInjector({ orchestrationMode: 'multi-agent' });
    expect(hook.event).toBe('tool.execute.after');
    expect(Array.isArray(hook.toolFilter)).toBe(true);
    expect((hook.toolFilter as string[]).includes('read')).toBe(true);
    expect((hook.toolFilter as string[]).includes('Read')).toBe(true);
  });

  it('does not inject when args is not an object', async () => {
    const hook = createAgentsMdInjector({ orchestrationMode: 'multi-agent' });
    const originalOutput = 'some content';
    const output = { title: 'Read file', output: originalOutput, metadata: null };
    await hook.handler({ tool: 'read', sessionID: '', callID: '', args: 'not-an-object' }, output);

    expect(output.output).toBe(originalOutput);
  });
});
