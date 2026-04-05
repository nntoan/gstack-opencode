export interface SessionBudget {
  sessionId: string;
  totalTokensUsed: number;
  maxTokens: number;
  warnThreshold: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export interface BudgetTracker {
  recordUsage(sessionId: string, tokens: number): void;
  getSessionBudget(sessionId: string): SessionBudget;
  reset(sessionId: string): void;
}

export function createBudgetTracker(config: {
  maxTokensPerSession: number;
  warnAtPercent: number;
}): BudgetTracker {
  const sessions = new Map<string, number>();

  return {
    recordUsage(sessionId: string, tokens: number): void {
      const current = sessions.get(sessionId) ?? 0;
      sessions.set(sessionId, current + tokens);
    },

    getSessionBudget(sessionId: string): SessionBudget {
      const used = sessions.get(sessionId) ?? 0;
      const warnThreshold = Math.floor(config.maxTokensPerSession * (config.warnAtPercent / 100));

      let status: 'ok' | 'warning' | 'exceeded' = 'ok';
      if (used >= config.maxTokensPerSession) status = 'exceeded';
      else if (used >= warnThreshold) status = 'warning';

      return {
        sessionId,
        totalTokensUsed: used,
        maxTokens: config.maxTokensPerSession,
        warnThreshold,
        status,
      };
    },

    reset(sessionId: string): void {
      sessions.delete(sessionId);
    },
  };
}
