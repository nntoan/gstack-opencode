import type { HookDefinition } from '../../types/hooks.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import type { DelegationStateManager } from '../orchestrator/index.ts';
import { log } from '../../shared/logger.ts';

export function createDelegationContextHook(params: {
  workspaceState: ReturnType<typeof createWorkspaceState>;
  delegationState: DelegationStateManager;
  companyMode?: boolean;
}): HookDefinition {
  const { workspaceState, delegationState, companyMode = false } = params;

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

        if (delegation.phase === 'build') {
          const readiness = await workspaceState.reviews.isShipReady();
          if (readiness.ready) {
            hints.push(
              companyMode
                ? 'The current Company workflow is ready for shipping once this build step is complete.'
                : 'Note: All reviews have passed. After completing this build, consider shipping.'
            );
          }
        }

        if (delegation.phase === 'ship') {
          const readiness = await workspaceState.reviews.isShipReady();
          if (!readiness.ready) {
            hints.push(
              companyMode
                ? `The next safe step is to finish required reviews before shipping. Missing: ${readiness.missing.join(', ')}.`
                : `Warning: Cannot ship yet. Missing: ${readiness.missing.join(', ')}. Complete required reviews before shipping.`
            );
          }
        }

        const company = workspaceState.company.readResolved();
        if (company?.active_plan) {
          const progress = workspaceState.plans.getProgress(company.active_plan);
          if (!progress.isComplete && progress.total > 0) {
            hints.push(
              companyMode
                ? `The current Company workflow still has unfinished plan tasks (${progress.completed}/${progress.total}). Focus on finishing that work before starting something new.`
                : `Active plan "${company.plan_name}" has ${progress.completed}/${progress.total} tasks complete. Focus on completing plan tasks before starting new work.`
            );
          }

          if (companyMode && company.execution_context?.trace_visibility === 'debug') {
            hints.push(
              `## Company Debug Trace\n\nWorkflow: ${company.workflow_id ?? 'unknown'}\nCheckpoint: ${company.last_checkpoint_id ?? 'unknown'}\nTransition cause: ${company.visible_context?.status_summary ?? 'No recorded transition'}\nArchived decisions: ${(company.archived_decision_waits ?? []).length}\nRetry lineage: ${company.retry_lineage?.child_attempt_ids.join(', ') || 'No child attempts yet'}`
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
