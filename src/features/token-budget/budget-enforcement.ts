import type {
  HookDefinition,
  SystemTransformInput,
  SystemTransformOutput,
  ToolExecuteAfterInput,
  ToolExecuteAfterOutput,
} from '../../types/hooks.ts';
import type { BudgetTracker } from './budget-tracker.ts';

export function createBudgetWarningHook(params: { budgetTracker: BudgetTracker }): HookDefinition {
  return {
    name: 'budget-warning-injector',
    event: 'system.transform',
    handler: async (input: unknown, output: unknown): Promise<void> => {
      const typedInput = input as SystemTransformInput;
      const typedOutput = output as SystemTransformOutput;

      const sessionId = typedInput.sessionID ?? '';
      if (!sessionId) return;

      const budget = params.budgetTracker.getSessionBudget(sessionId);

      if (budget.status === 'exceeded') {
        const pct = Math.round((budget.totalTokensUsed / budget.maxTokens) * 100);
        typedOutput.system.push(
          `## ⛔ Token Budget Exceeded\n\n` +
            `You have used ${budget.totalTokensUsed.toLocaleString()} of ${budget.maxTokens.toLocaleString()} tokens (${pct}%).\n` +
            `**STOP generating long outputs.** Wrap up the current task with minimal token usage. ` +
            `Suggest the user start a new session if more work is needed.`
        );
      } else if (budget.status === 'warning') {
        const pct = Math.round((budget.totalTokensUsed / budget.maxTokens) * 100);
        typedOutput.system.push(
          `## ⚠️ Token Budget Warning\n\n` +
            `You have used ${budget.totalTokensUsed.toLocaleString()} of ${budget.maxTokens.toLocaleString()} tokens (${pct}%).\n` +
            `Be concise. Prioritize completing the current task efficiently.`
        );
      }
    },
  };
}

export function createBudgetTrackingHook(params: { budgetTracker: BudgetTracker }): HookDefinition {
  return {
    name: 'budget-usage-tracker',
    event: 'tool.execute.after',
    handler: async (input: unknown, output: unknown): Promise<void> => {
      const typedInput = input as ToolExecuteAfterInput;
      const typedOutput = output as ToolExecuteAfterOutput;

      const sessionId = typedInput.sessionID;
      if (!sessionId) return;

      // Estimate tokens from output length (rough heuristic: ~4 chars per token)
      const outputLength = typedOutput.output?.length ?? 0;
      const estimatedTokens = Math.ceil(outputLength / 4);

      if (estimatedTokens > 0) {
        params.budgetTracker.recordUsage(sessionId, estimatedTokens);
      }
    },
  };
}
