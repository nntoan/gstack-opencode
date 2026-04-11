import type { HookDefinition } from '../../types/hooks.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import { deriveCompanyResumeOffer, deriveStaleAnswerRecovery } from '../company/company-resume.ts';
import type { CompanyState } from '../company/types.ts';
import { log } from '../../shared/logger.ts';

function deriveContinuityOffer(
  workspaceState: ReturnType<typeof createWorkspaceState>,
  company: CompanyState
) {
  const latestSafeCheckpointId =
    company.retry_lineage?.safe_retry_checkpoint_ids.at(-1) ?? company.last_checkpoint_id;
  const staleWait =
    company.pending_decision_wait?.status === 'stale' ? company.pending_decision_wait : null;
  const checkpointId = staleWait?.superseded_by_checkpoint_id ?? latestSafeCheckpointId;
  const checkpoint = checkpointId ? workspaceState.company.readCheckpoint(checkpointId) : null;

  if (staleWait) {
    return deriveStaleAnswerRecovery(company, staleWait, checkpoint);
  }

  if (company.execution_context?.retry_safe === true || checkpointId) {
    return deriveCompanyResumeOffer(company, checkpoint);
  }

  return null;
}

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
        const continuityOffer = companyMode ? deriveContinuityOffer(workspaceState, company) : null;
        const progressLine = companyMode
          ? [
              '## Company Progress',
              `**Plan:** ${company.plan_name}`,
              `**Status:** ${company.visible_context?.status_summary ?? (progress.isComplete ? `Complete (${progress.completed}/${progress.total} tasks)` : `${progress.completed}/${progress.total} tasks complete (${pct}%)`)}`,
              `**Current step:** ${company.visible_context?.current_step ?? company.current_phase ?? 'unknown'}`,
              continuityOffer ? `**Next safe step:** ${continuityOffer.nextSafeStep}` : '',
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
