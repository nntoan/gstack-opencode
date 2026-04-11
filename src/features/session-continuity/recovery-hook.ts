import type { HookDefinition } from '../../types/hooks.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import type { DelegationStateManager } from '../orchestrator/index.ts';
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
        const continuityOffer = companyMode ? deriveContinuityOffer(workspaceState, company) : null;

        const recoveryContext = companyMode
          ? [
              '## Session Recovery',
              '',
              `**Goal:** ${continuityOffer?.goal ?? company.visible_context?.current_goal ?? company.plan_name}`,
              `**Current step:** ${continuityOffer?.currentStep ?? company.visible_context?.current_step ?? company.current_phase ?? 'unknown'}`,
              `**Status:** ${company.visible_context?.status_summary ?? `Progress ${progress.completed}/${progress.total} tasks (${pct}%)`}`,
              continuityOffer ? `**Recommendation:** ${continuityOffer.recommendation}` : '',
              continuityOffer ? `**Consequence:** ${continuityOffer.consequence}` : '',
              continuityOffer ? `**Next safe step:** ${continuityOffer.nextSafeStep}` : '',
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
