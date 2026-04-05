import type { HookDefinition } from '../../types/hooks.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import type { DelegationStateManager } from '../orchestrator/index.ts';
import { log } from '../../shared/logger.ts';

export function createDelegationContextHook(params: {
  workspaceState: ReturnType<typeof createWorkspaceState>;
  delegationState: DelegationStateManager;
}): HookDefinition {
  const { workspaceState, delegationState } = params;

  return {
    name: 'delegation-context-enricher',
    event: 'system.transform',
    handler: async (input: unknown, output: unknown): Promise<void> => {
      const safeOutput = output as { system?: unknown };
      if (!safeOutput?.system || !Array.isArray(safeOutput.system)) return;

      const typedInput = input as { sessionID?: string };
      const sessionId = typedInput.sessionID;
      if (!sessionId) return;

      const delegation = delegationState.getDelegation(sessionId);
      if (!delegation) return;

      try {
        const hints: string[] = [];

        // If we're in build phase and reviews have passed, suggest shipping
        if (delegation.phase === 'build') {
          const readiness = await workspaceState.reviews.isShipReady();
          if (readiness.ready) {
            hints.push(
              'Note: All reviews have passed. After completing this build, consider shipping.'
            );
          }
        }

        // If we're in ship phase but reviews haven't passed, block
        if (delegation.phase === 'ship') {
          const readiness = await workspaceState.reviews.isShipReady();
          if (!readiness.ready) {
            hints.push(
              `Warning: Cannot ship yet. Missing: ${readiness.missing.join(', ')}. ` +
                'Complete required reviews before shipping.'
            );
          }
        }

        // If there's a boulder with an active plan, remind about it
        const boulder = workspaceState.boulder.read();
        if (boulder?.active_plan) {
          const progress = workspaceState.plans.getProgress(boulder.active_plan);
          if (!progress.isComplete && progress.total > 0) {
            hints.push(
              `Active plan "${boulder.plan_name}" has ${progress.completed}/${progress.total} tasks complete. ` +
                'Focus on completing plan tasks before starting new work.'
            );
          }
        }

        if (hints.length > 0) {
          safeOutput.system.push(`## Delegation Context\n\n${hints.join('\n\n')}`);
        }
      } catch (err: unknown) {
        log('[ERROR] delegation-context-hook failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
