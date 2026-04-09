import type { HookDefinition } from '../../types/hooks.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import { log } from '../../shared/logger.ts';

export function createProgressHook(params: {
  workspaceState: ReturnType<typeof createWorkspaceState>;
  companyMode?: boolean;
}): HookDefinition {
  const { workspaceState, companyMode = false } = params;

  return {
    name: 'plan-progress-injector',
    event: 'system.transform',
    handler: async (_input: unknown, output: unknown): Promise<void> => {
      const safeOutput = output as { system?: unknown };
      if (!safeOutput?.system || !Array.isArray(safeOutput.system)) return;

      try {
        const company = workspaceState.company.readResolved();
        if (!company?.active_plan) return;

        const progress = workspaceState.plans.getProgress(company.active_plan);
        if (progress.total === 0) return;

        const pct = Math.round((progress.completed / progress.total) * 100);
        const progressLine = companyMode
          ? [
              '## Company Progress',
              `**Plan:** ${company.plan_name}`,
              `**Status:** ${company.visible_context?.status_summary ?? (progress.isComplete ? `Complete (${progress.completed}/${progress.total} tasks)` : `${progress.completed}/${progress.total} tasks complete (${pct}%)`)}`,
              `**Current step:** ${company.visible_context?.current_step ?? company.current_phase ?? 'unknown'}`,
              company.execution_context?.retry_safe === true
                ? '**Next safe step:** Resume from the latest safe checkpoint if needed.'
                : '',
              company.execution_context?.trace_visibility === 'debug'
                ? `## Company Debug Trace\n\nWorkflow: ${company.workflow_id ?? 'unknown'}\nCheckpoint: ${company.last_checkpoint_id ?? 'unknown'}\nDecision cause: ${company.visible_context?.pending_user_decision ?? 'No pending decision'}\nNext safe step: ${company.execution_context?.retry_safe === true ? 'Resume from the last safe checkpoint.' : 'Clarify the next Company decision before continuing.'}`
                : '',
            ]
              .filter(Boolean)
              .join('\n')
          : progress.isComplete
            ? `## Sprint Progress\n**Plan:** ${company.plan_name}\n**Status:** COMPLETE (${progress.completed}/${progress.total} tasks)`
            : `## Sprint Progress\n**Plan:** ${company.plan_name}\n**Progress:** ${progress.completed}/${progress.total} tasks (${pct}%)\n**Phase:** ${company.current_phase ?? 'unknown'}\n**Agent:** ${company.active_specialist ?? 'unknown'}`;

        safeOutput.system.push(progressLine);
      } catch (err: unknown) {
        log('[ERROR] progress-hook failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
