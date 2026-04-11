import type { CompanyCheckpoint, CompanyState, DecisionWait } from './types.ts';

export interface CompanyResumeOffer {
  goal: string;
  currentStep: string;
  recommendation: string;
  consequence: string;
  nextSafeStep: string;
  targetCheckpointId?: string;
}

function getTargetCheckpointId(
  state: CompanyState,
  checkpoint: CompanyCheckpoint | null
): string | undefined {
  return (
    checkpoint?.id ??
    state.retry_lineage?.safe_retry_checkpoint_ids.at(-1) ??
    state.last_checkpoint_id ??
    undefined
  );
}

function getGoal(state: CompanyState, checkpoint: CompanyCheckpoint | null): string {
  return (
    checkpoint?.state.visible_context?.current_goal ??
    checkpoint?.state.plan_name ??
    state.visible_context?.current_goal ??
    state.plan_name ??
    'Continue the active Company workflow'
  );
}

function getCurrentStep(state: CompanyState, checkpoint: CompanyCheckpoint | null): string {
  return (
    checkpoint?.state.visible_context?.current_step ??
    checkpoint?.state.visible_context?.status_summary ??
    checkpoint?.state.current_phase?.concat(' phase') ??
    state.visible_context?.current_step ??
    state.visible_context?.status_summary ??
    state.current_phase?.concat(' phase') ??
    'Resume the saved workflow'
  );
}

export function deriveCompanyResumeOffer(
  state: CompanyState,
  checkpoint: CompanyCheckpoint | null
): CompanyResumeOffer {
  const targetCheckpointId = getTargetCheckpointId(state, checkpoint);
  const hasSafeCheckpoint =
    targetCheckpointId !== undefined &&
    (state.retry_lineage?.safe_retry_checkpoint_ids ?? []).includes(targetCheckpointId);

  return {
    goal: getGoal(state, checkpoint),
    currentStep: getCurrentStep(state, checkpoint),
    recommendation: hasSafeCheckpoint
      ? 'Resume from the latest safe checkpoint so The Company can continue from the safest saved state.'
      : 'Resume from the last saved checkpoint so The Company can continue the paused workflow.',
    consequence:
      'If you do not resume this work, The Company will keep the workflow paused until you confirm a fresh direction.',
    nextSafeStep: hasSafeCheckpoint
      ? 'Approve the recommended resume to continue from the latest safe step.'
      : 'Approve the resume to continue from the last saved step.',
    targetCheckpointId,
  };
}

export function deriveStaleAnswerRecovery(
  state: CompanyState,
  _wait: DecisionWait,
  checkpoint: CompanyCheckpoint | null
): CompanyResumeOffer {
  const baseOffer = deriveCompanyResumeOffer(state, checkpoint);

  return {
    ...baseOffer,
    recommendation: baseOffer.targetCheckpointId
      ? 'That answer is stale. Resume from the latest safe checkpoint, or give The Company a fresh confirmed direction.'
      : 'That answer is stale. Give The Company a fresh confirmed direction before continuing.',
    consequence:
      'The Company ignored the stale answer and kept the workflow paused so it does not continue from the wrong state.',
    nextSafeStep: baseOffer.targetCheckpointId
      ? 'Approve the recommended resume, or describe a fresh direction for The Company to confirm.'
      : 'Describe a fresh direction for The Company to confirm before continuing.',
  };
}
