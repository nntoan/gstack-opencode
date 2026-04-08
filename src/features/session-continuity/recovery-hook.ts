import type { HookDefinition } from '../../types/hooks.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import type { DelegationStateManager } from '../orchestrator/index.ts';
import { log } from '../../shared/logger.ts';

export function createRecoveryHook(params: {
  workspaceState: ReturnType<typeof createWorkspaceState>;
  delegationState: DelegationStateManager;
}): HookDefinition {
  const { workspaceState, delegationState } = params;

  return {
    name: 'session-recovery',
    event: 'system.transform',
    handler: async (input: unknown, output: unknown): Promise<void> => {
      const safeOutput = output as { system?: unknown };
      if (!safeOutput?.system || !Array.isArray(safeOutput.system)) return;

      const typedInput = input as { sessionID?: string };
      const sessionId = typedInput.sessionID;
      if (!sessionId) return;

      const delegation = delegationState.getDelegation(sessionId);
      if (delegation) return;

      try {
        const company = workspaceState.company.readResolved();
        if (!company?.active_plan) return;

        const progress = workspaceState.plans.getProgress(company.active_plan);
        const pct =
          progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

        const recoveryContext = [
          '## Session Recovery',
          '',
          `A previous session was working on plan: **${company.plan_name}**`,
          `Progress: ${progress.completed}/${progress.total} tasks (${pct}%)`,
          company.current_phase ? `Last phase: ${company.current_phase}` : '',
          company.active_specialist ? `Last agent: ${company.active_specialist}` : '',
          '',
          'Use the sprint-status tool to see full state, or continue where the previous session left off.',
        ]
          .filter(Boolean)
          .join('\n');

        safeOutput.system.push(recoveryContext);
      } catch (err: unknown) {
        log('[ERROR] recovery-hook failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
