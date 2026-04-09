import type { HookDefinition } from '../../types/hooks.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import type { DelegationStateManager } from '../orchestrator/index.ts';
import { log } from '../../shared/logger.ts';

export function createRecoveryHook(params: {
  workspaceState: ReturnType<typeof createWorkspaceState>;
  delegationState: DelegationStateManager;
  companyMode?: boolean;
}): HookDefinition {
  const { workspaceState, delegationState, companyMode = false } = params;

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

        const recoveryContext = companyMode
          ? [
              '## Session Recovery',
              '',
              `**Goal:** ${company.visible_context?.current_goal ?? company.plan_name}`,
              `**Current step:** ${company.visible_context?.current_step ?? company.current_phase ?? 'unknown'}`,
              `**Status:** ${company.visible_context?.status_summary ?? `Progress ${progress.completed}/${progress.total} tasks (${pct}%)`}`,
              company.execution_context?.retry_safe === true
                ? '**Next safe step:** Resume from the last safe checkpoint when you are ready.'
                : '',
              company.execution_context?.trace_visibility === 'debug'
                ? `## Company Debug Trace\n\nWorkflow: ${company.workflow_id ?? 'unknown'}\nCheckpoint: ${company.last_checkpoint_id ?? 'unknown'}\nDecision cause: ${company.visible_context?.pending_user_decision ?? 'No pending decision'}\nNext safe step: ${company.execution_context?.retry_safe === true ? 'Resume from the last safe checkpoint.' : 'Clarify the next Company decision before continuing.'}`
                : '',
            ]
              .filter(Boolean)
              .join('\n')
          : [
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
