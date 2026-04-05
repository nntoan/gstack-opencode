import { describe, it, expect } from 'bun:test';
import { createBudgetTracker } from './budget-tracker.ts';

describe('createBudgetTracker', () => {
  it('initial session has 0 tokens used', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 80 });
    const budget = tracker.getSessionBudget('session-1');
    expect(budget.totalTokensUsed).toBe(0);
    expect(budget.status).toBe('ok');
  });

  it('recording usage accumulates across calls', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 80 });
    tracker.recordUsage('session-1', 100);
    tracker.recordUsage('session-1', 250);
    const budget = tracker.getSessionBudget('session-1');
    expect(budget.totalTokensUsed).toBe(350);
  });

  it('status is ok below warn threshold', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 80 });
    tracker.recordUsage('session-1', 500); // 50%, below 80%
    const budget = tracker.getSessionBudget('session-1');
    expect(budget.status).toBe('ok');
  });

  it('status is warning at warn threshold', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 80 });
    tracker.recordUsage('session-1', 800); // exactly 80%
    const budget = tracker.getSessionBudget('session-1');
    expect(budget.status).toBe('warning');
  });

  it('status is warning above warn threshold but below max', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 80 });
    tracker.recordUsage('session-1', 900); // 90%, above warn but below max
    const budget = tracker.getSessionBudget('session-1');
    expect(budget.status).toBe('warning');
  });

  it('status is exceeded at max tokens', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 80 });
    tracker.recordUsage('session-1', 1_000); // exactly 100%
    const budget = tracker.getSessionBudget('session-1');
    expect(budget.status).toBe('exceeded');
  });

  it('status is exceeded above max tokens', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 80 });
    tracker.recordUsage('session-1', 1_200); // 120%
    const budget = tracker.getSessionBudget('session-1');
    expect(budget.status).toBe('exceeded');
  });

  it('reset clears session usage', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 80 });
    tracker.recordUsage('session-1', 500);
    tracker.reset('session-1');
    const budget = tracker.getSessionBudget('session-1');
    expect(budget.totalTokensUsed).toBe(0);
    expect(budget.status).toBe('ok');
  });

  it('independent sessions do not interfere', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 80 });
    tracker.recordUsage('session-A', 900);
    tracker.recordUsage('session-B', 100);

    const budgetA = tracker.getSessionBudget('session-A');
    const budgetB = tracker.getSessionBudget('session-B');

    expect(budgetA.totalTokensUsed).toBe(900);
    expect(budgetA.status).toBe('warning');
    expect(budgetB.totalTokensUsed).toBe(100);
    expect(budgetB.status).toBe('ok');
  });

  it('warnThreshold is calculated correctly', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 75 });
    const budget = tracker.getSessionBudget('session-1');
    expect(budget.warnThreshold).toBe(750);
  });

  it('warnThreshold is floored to integer', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 33 });
    const budget = tracker.getSessionBudget('session-1');
    expect(budget.warnThreshold).toBe(330);
  });

  it('getSessionBudget returns correct maxTokens', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 5_000, warnAtPercent: 80 });
    const budget = tracker.getSessionBudget('session-1');
    expect(budget.maxTokens).toBe(5_000);
    expect(budget.sessionId).toBe('session-1');
  });

  it('reset of unknown session is a no-op', () => {
    const tracker = createBudgetTracker({ maxTokensPerSession: 1_000, warnAtPercent: 80 });
    expect(() => tracker.reset('nonexistent')).not.toThrow();
    const budget = tracker.getSessionBudget('nonexistent');
    expect(budget.totalTokensUsed).toBe(0);
  });
});
