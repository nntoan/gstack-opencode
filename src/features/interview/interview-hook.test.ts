import { describe, it, expect } from 'bun:test';
import { createInterviewModeHook } from './interview-hook.ts';
import type { SprintPhase } from '../../types/agent.ts';

describe('createInterviewModeHook', () => {
  it('returns a valid HookDefinition with the correct name', () => {
    const hook = createInterviewModeHook({ getCurrentPhase: () => undefined });
    expect(hook.name).toBe('interview-mode-injector');
  });

  it('event is system.transform', () => {
    const hook = createInterviewModeHook({ getCurrentPhase: () => undefined });
    expect(hook.event).toBe('system.transform');
  });

  it('handler is an async function', () => {
    const hook = createInterviewModeHook({ getCurrentPhase: () => undefined });
    expect(typeof hook.handler).toBe('function');
  });

  it('injects interview instructions when a phase is available', async () => {
    const hook = createInterviewModeHook({
      getCurrentPhase: () => 'plan' as SprintPhase,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'session-1' }, output);

    expect(output.system.length).toBe(1);
    expect(output.system[0]).toContain('Interview Mode');
  });

  it('injects phase-specific instructions for the returned phase', async () => {
    const hook = createInterviewModeHook({
      getCurrentPhase: () => 'think' as SprintPhase,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'session-1' }, output);

    // think phase instructions should mention discovery/interview
    expect(output.system[0]).toContain('interview');
  });

  it('defaults to think phase when getCurrentPhase returns undefined', async () => {
    const hook = createInterviewModeHook({
      getCurrentPhase: () => undefined,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'unknown-session' }, output);

    // Should still inject (defaulting to think phase)
    expect(output.system.length).toBe(1);
    expect(output.system[0]).toContain('Interview Mode');
    // think phase instructions emphasise discovery
    expect(output.system[0]).toContain('interview');
  });

  it('defaults to think phase when sessionID is empty string', async () => {
    const hook = createInterviewModeHook({
      getCurrentPhase: (id) => (id === '' ? undefined : ('plan' as SprintPhase)),
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: '' }, output);

    expect(output.system.length).toBe(1);
    expect(output.system[0]).toContain('Interview Mode');
  });

  it('pushes to system array without replacing existing content', async () => {
    const hook = createInterviewModeHook({
      getCurrentPhase: () => 'build' as SprintPhase,
    });
    const existingEntry = 'Existing system instruction';
    const output = { system: [existingEntry] };
    await hook.handler({ sessionID: 'session-2' }, output);

    expect(output.system.length).toBe(2);
    expect(output.system[0]).toBe(existingEntry);
    expect(output.system[1]).toContain('Interview Mode');
  });

  it('also includes Question tool guidance in the injected content', async () => {
    const hook = createInterviewModeHook({
      getCurrentPhase: () => 'think' as SprintPhase,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'session-3' }, output);

    expect(output.system[0]).toContain('Question tool');
  });

  it('works with all valid sprint phases', async () => {
    const phases: SprintPhase[] = [
      'think',
      'plan',
      'build',
      'review',
      'test',
      'ship',
      'reflect',
      'cross-cutting',
      'utility',
    ];

    for (const phase of phases) {
      const hook = createInterviewModeHook({ getCurrentPhase: () => phase });
      const output = { system: [] as string[] };
      await hook.handler({ sessionID: `session-${phase}` }, output);

      expect(output.system.length).toBe(1);
      expect(output.system[0]).toContain('Interview Mode');
    }
  });

  it('calls getCurrentPhase with the sessionID from input', async () => {
    const capturedIds: string[] = [];
    const hook = createInterviewModeHook({
      getCurrentPhase: (id) => {
        capturedIds.push(id);
        return 'build' as SprintPhase;
      },
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'my-session-id' }, output);

    expect(capturedIds).toEqual(['my-session-id']);
  });

  it('handles missing sessionID gracefully (undefined input)', async () => {
    const hook = createInterviewModeHook({ getCurrentPhase: () => undefined });
    const output = { system: [] as string[] };
    // sessionID is optional in SystemTransformInput
    await hook.handler({}, output);

    expect(output.system.length).toBe(1);
    expect(output.system[0]).toContain('Interview Mode');
  });
});
