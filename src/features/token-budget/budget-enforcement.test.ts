import { describe, it, expect } from 'bun:test';
import { createBudgetWarningHook, createBudgetTrackingHook } from './budget-enforcement.ts';
import { createBudgetTracker } from './budget-tracker.ts';
import type { BudgetTracker } from './budget-tracker.ts';

function makeFakeBudgetTracker(
  overrides: Partial<BudgetTracker> & { status?: 'ok' | 'warning' | 'exceeded'; used?: number }
): BudgetTracker {
  const used = overrides.used ?? 0;
  const status = overrides.status ?? 'ok';

  return {
    recordUsage: overrides.recordUsage ?? (() => {}),
    getSessionBudget:
      overrides.getSessionBudget ??
      ((_sessionId: string) => ({
        sessionId: _sessionId,
        totalTokensUsed: used,
        maxTokens: 1_000,
        warnThreshold: 800,
        status,
      })),
    reset: overrides.reset ?? (() => {}),
  };
}

describe('createBudgetWarningHook', () => {
  it('has correct hook name', () => {
    const hook = createBudgetWarningHook({ budgetTracker: makeFakeBudgetTracker({}) });
    expect(hook.name).toBe('budget-warning-injector');
  });

  it('has correct hook event', () => {
    const hook = createBudgetWarningHook({ budgetTracker: makeFakeBudgetTracker({}) });
    expect(hook.event).toBe('system.transform');
  });

  it('injects warning message when status is warning', async () => {
    const tracker = makeFakeBudgetTracker({ status: 'warning', used: 850 });
    const hook = createBudgetWarningHook({ budgetTracker: tracker });
    const output = { system: [] as string[] };

    await hook.handler({ sessionID: 'session-1' }, output);

    expect(output.system.length).toBe(1);
    expect(output.system[0]).toContain('⚠️ Token Budget Warning');
    expect(output.system[0]).toContain('Be concise.');
  });

  it('injects exceeded message when status is exceeded', async () => {
    const tracker = makeFakeBudgetTracker({ status: 'exceeded', used: 1_000 });
    const hook = createBudgetWarningHook({ budgetTracker: tracker });
    const output = { system: [] as string[] };

    await hook.handler({ sessionID: 'session-1' }, output);

    expect(output.system.length).toBe(1);
    expect(output.system[0]).toContain('⛔ Token Budget Exceeded');
    expect(output.system[0]).toContain('STOP generating long outputs');
  });

  it('injects nothing when status is ok', async () => {
    const tracker = makeFakeBudgetTracker({ status: 'ok', used: 100 });
    const hook = createBudgetWarningHook({ budgetTracker: tracker });
    const output = { system: [] as string[] };

    await hook.handler({ sessionID: 'session-1' }, output);

    expect(output.system.length).toBe(0);
  });

  it('skips injection when sessionID is empty string', async () => {
    const tracker = makeFakeBudgetTracker({ status: 'warning', used: 900 });
    const hook = createBudgetWarningHook({ budgetTracker: tracker });
    const output = { system: [] as string[] };

    await hook.handler({ sessionID: '' }, output);

    expect(output.system.length).toBe(0);
  });

  it('skips injection when sessionID is undefined', async () => {
    const tracker = makeFakeBudgetTracker({ status: 'warning', used: 900 });
    const hook = createBudgetWarningHook({ budgetTracker: tracker });
    const output = { system: [] as string[] };

    await hook.handler({ sessionID: undefined }, output);

    expect(output.system.length).toBe(0);
  });

  it('warning message includes token usage percentage', async () => {
    const tracker = makeFakeBudgetTracker({ status: 'warning', used: 850 });
    const hook = createBudgetWarningHook({ budgetTracker: tracker });
    const output = { system: [] as string[] };

    await hook.handler({ sessionID: 'session-1' }, output);

    // used=850, max=1000 → 85%
    expect(output.system[0]).toContain('85%');
  });

  it('exceeded message includes token usage percentage', async () => {
    const tracker = makeFakeBudgetTracker({ status: 'exceeded', used: 1_000 });
    const hook = createBudgetWarningHook({ budgetTracker: tracker });
    const output = { system: [] as string[] };

    await hook.handler({ sessionID: 'session-1' }, output);

    // used=1000, max=1000 → 100%
    expect(output.system[0]).toContain('100%');
  });

  it('warning message includes new session suggestion when exceeded', async () => {
    const tracker = makeFakeBudgetTracker({ status: 'exceeded', used: 1_100 });
    const hook = createBudgetWarningHook({ budgetTracker: tracker });
    const output = { system: [] as string[] };

    await hook.handler({ sessionID: 'session-1' }, output);

    expect(output.system[0]).toContain('new session');
  });
});

describe('createBudgetTrackingHook', () => {
  it('has correct hook name', () => {
    const hook = createBudgetTrackingHook({ budgetTracker: makeFakeBudgetTracker({}) });
    expect(hook.name).toBe('budget-usage-tracker');
  });

  it('has correct hook event', () => {
    const hook = createBudgetTrackingHook({ budgetTracker: makeFakeBudgetTracker({}) });
    expect(hook.event).toBe('tool.execute.after');
  });

  it('estimates tokens from output length (~4 chars per token)', async () => {
    const recorded: Array<{ sessionId: string; tokens: number }> = [];
    const tracker = makeFakeBudgetTracker({
      recordUsage: (sessionId, tokens) => recorded.push({ sessionId, tokens }),
    });
    const hook = createBudgetTrackingHook({ budgetTracker: tracker });

    // 400 chars → ceil(400 / 4) = 100 tokens
    const output = {
      title: '',
      output: 'a'.repeat(400),
      metadata: null,
    };
    await hook.handler({ tool: 'bash', sessionID: 'session-1', callID: '', args: {} }, output);

    expect(recorded.length).toBe(1);
    expect(recorded[0].sessionId).toBe('session-1');
    expect(recorded[0].tokens).toBe(100);
  });

  it('skips recording when sessionID is empty string', async () => {
    const recorded: Array<{ sessionId: string; tokens: number }> = [];
    const tracker = makeFakeBudgetTracker({
      recordUsage: (sessionId, tokens) => recorded.push({ sessionId, tokens }),
    });
    const hook = createBudgetTrackingHook({ budgetTracker: tracker });

    const output = { title: '', output: 'hello world', metadata: null };
    await hook.handler({ tool: 'bash', sessionID: '', callID: '', args: {} }, output);

    expect(recorded.length).toBe(0);
  });

  it('skips recording when output is empty string', async () => {
    const recorded: Array<{ sessionId: string; tokens: number }> = [];
    const tracker = makeFakeBudgetTracker({
      recordUsage: (sessionId, tokens) => recorded.push({ sessionId, tokens }),
    });
    const hook = createBudgetTrackingHook({ budgetTracker: tracker });

    const output = { title: '', output: '', metadata: null };
    await hook.handler({ tool: 'bash', sessionID: 'session-1', callID: '', args: {} }, output);

    expect(recorded.length).toBe(0);
  });

  it('skips recording when output is undefined', async () => {
    const recorded: Array<{ sessionId: string; tokens: number }> = [];
    const tracker = makeFakeBudgetTracker({
      recordUsage: (sessionId, tokens) => recorded.push({ sessionId, tokens }),
    });
    const hook = createBudgetTrackingHook({ budgetTracker: tracker });

    const output = { title: '', output: undefined as unknown as string, metadata: null };
    await hook.handler({ tool: 'bash', sessionID: 'session-1', callID: '', args: {} }, output);

    expect(recorded.length).toBe(0);
  });

  it('uses ceiling division for token estimation', async () => {
    const recorded: Array<{ sessionId: string; tokens: number }> = [];
    const tracker = makeFakeBudgetTracker({
      recordUsage: (sessionId, tokens) => recorded.push({ sessionId, tokens }),
    });
    const hook = createBudgetTrackingHook({ budgetTracker: tracker });

    // 401 chars → ceil(401 / 4) = ceil(100.25) = 101 tokens
    const output = { title: '', output: 'a'.repeat(401), metadata: null };
    await hook.handler({ tool: 'bash', sessionID: 'session-1', callID: '', args: {} }, output);

    expect(recorded[0].tokens).toBe(101);
  });

  it('accumulates token usage with real budget tracker', async () => {
    const budgetTracker = createBudgetTracker({ maxTokensPerSession: 10_000, warnAtPercent: 80 });
    const hook = createBudgetTrackingHook({ budgetTracker });

    // 400 chars → 100 tokens
    const output = { title: '', output: 'a'.repeat(400), metadata: null };
    await hook.handler({ tool: 'bash', sessionID: 'session-x', callID: '', args: {} }, output);
    await hook.handler({ tool: 'grep', sessionID: 'session-x', callID: '', args: {} }, output);

    const budget = budgetTracker.getSessionBudget('session-x');
    expect(budget.totalTokensUsed).toBe(200);
  });
});
