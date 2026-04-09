import type { SprintPhase } from '../../types/agent.ts';
import type { ClassifiedIntent } from '../orchestrator/types.ts';

export type AmbiguityDecision =
  | { action: 'delegate'; classified: ClassifiedIntent }
  | { action: 'confirm'; classified: ClassifiedIntent; confirmationPrompt: string }
  | { action: 'ask'; questionPrompt: string };

export interface AmbiguityThresholds {
  low: number;
  mid: number;
}

export interface AmbiguityPolicyContext {
  priorDecision?: 'new' | 'rejected';
  clarificationStallCount?: number;
  alternativePhases?: SprintPhase[];
}

const DEFAULT_THRESHOLDS: AmbiguityThresholds = {
  low: 0.5,
  mid: 0.85,
};

function buildStallHint(clarificationStallCount?: number): string {
  if ((clarificationStallCount ?? 0) < 2) {
    return '';
  }

  return ' If that still does not fit, you can ask for an expert or debug trace path.';
}

function buildAskPrompt(classified: ClassifiedIntent, context?: AmbiguityPolicyContext): string {
  if (context?.priorDecision === 'rejected' && (context.alternativePhases?.length ?? 0) > 0) {
    const alternatives = context?.alternativePhases ?? [];
    return `I want to route this correctly. The previous **${classified.phase}** direction was not right, so the closest safe alternatives are **${alternatives.join('**, **')}**. Which direction should I take next?${buildStallHint(context.clarificationStallCount)}`;
  }

  if (classified.reasoning.startsWith('Multiple phase matches:')) {
    const sequence = classified.reasoning
      .replace('Multiple phase matches:', '')
      .split(',')
      .map((phase) => phase.trim())
      .filter((phase) => phase.length > 0 && phase !== classified.phase);

    if (sequence.length > 0) {
      return `I want to route this correctly. I can handle this in sequence: first **${classified.phase}**, then **${sequence.join(', ')}**. Does that sequence work for you?${buildStallHint(context?.clarificationStallCount)}`;
    }
  }

  return `I want to route this correctly. The best next step looks like the **${classified.phase}** phase, but I need one quick confirmation before I proceed.${buildStallHint(context?.clarificationStallCount)}`;
}

function buildConfirmPrompt(
  classified: ClassifiedIntent,
  context?: AmbiguityPolicyContext
): string {
  return `I'm ready to proceed with the **${classified.phase}** phase because that is the safest match for your request. Is that direction correct?${buildStallHint(context?.clarificationStallCount)}`;
}

export function applyAmbiguityPolicy(
  classified: ClassifiedIntent,
  context?: AmbiguityPolicyContext,
  thresholds: AmbiguityThresholds = DEFAULT_THRESHOLDS
): AmbiguityDecision {
  if (classified.confidence >= 1 || classified.confidence >= thresholds.mid) {
    return { action: 'delegate', classified };
  }

  if (context?.priorDecision === 'rejected') {
    return {
      action: 'ask',
      questionPrompt: buildAskPrompt(classified, context),
    };
  }

  if (classified.confidence < thresholds.low) {
    return {
      action: 'ask',
      questionPrompt: buildAskPrompt(classified, context),
    };
  }

  return {
    action: 'confirm',
    classified,
    confirmationPrompt: buildConfirmPrompt(classified, context),
  };
}
