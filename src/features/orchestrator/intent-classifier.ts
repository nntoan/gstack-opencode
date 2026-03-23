import type { SprintPhase } from '../../types/agent.ts';
import type { ClassifiedIntent, IntentClassifierOptions } from './types.ts';
import { PHASE_PATTERNS, PHASE_TO_DEFAULT_AGENT, SKILL_TO_PHASE_MAP } from './intent-patterns.ts';

const EXPLICIT_SKILL_REGEX = /^\/([a-z][a-z0-9-]*)/;

export function extractExplicitSkillName(text: string): string | null {
  const match: RegExpMatchArray | null = text.trim().match(EXPLICIT_SKILL_REGEX);
  return match ? match[1] : null;
}

export function classifyIntent(text: string, options: IntentClassifierOptions): ClassifiedIntent {
  if (options.orchestrationMode === 'skills-only') {
    return {
      phase: 'build',
      confidence: 0,
      suggestedAgent: 'builder',
      suggestedSkills: [],
      reasoning: 'Orchestration disabled',
    };
  }

  const explicitSkillName: string | null = extractExplicitSkillName(text);
  if (explicitSkillName && explicitSkillName in SKILL_TO_PHASE_MAP) {
    const phase: SprintPhase = SKILL_TO_PHASE_MAP[explicitSkillName];
    return {
      phase,
      confidence: 1,
      suggestedAgent: PHASE_TO_DEFAULT_AGENT[phase],
      suggestedSkills: getSuggestedSkillsForPhase(phase, explicitSkillName),
      reasoning: `Explicit skill /${explicitSkillName} selected`,
    };
  }

  const phaseScores: Array<{ phase: SprintPhase; score: number }> = [];
  for (const [phase, patterns] of PHASE_PATTERNS.entries()) {
    const score: number = patterns.reduce((count, pattern) => {
      return count + (pattern.test(text) ? 1 : 0);
    }, 0);
    if (score > 0) {
      phaseScores.push({ phase, score });
    }
  }

  if (phaseScores.length === 0) {
    return {
      phase: 'build',
      confidence: 0.3,
      suggestedAgent: 'builder',
      suggestedSkills: getSuggestedSkillsForPhase('build'),
      reasoning: 'No strong pattern match',
    };
  }

  const maxScore: number = Math.max(...phaseScores.map((entry) => entry.score));
  const winners: SprintPhase[] = phaseScores
    .filter((entry) => entry.score === maxScore)
    .map((entry) => entry.phase);

  if (winners.length === 1) {
    const phase: SprintPhase = winners[0];
    return {
      phase,
      confidence: scoreToSinglePhaseConfidence(maxScore),
      suggestedAgent: PHASE_TO_DEFAULT_AGENT[phase],
      suggestedSkills: getSuggestedSkillsForPhase(phase),
      reasoning: `Matched ${maxScore} pattern${maxScore > 1 ? 's' : ''} for ${phase}`,
    };
  }

  const phase: SprintPhase = winners[0];
  return {
    phase,
    confidence: scoreToMultiPhaseConfidence(maxScore),
    suggestedAgent: PHASE_TO_DEFAULT_AGENT[phase],
    suggestedSkills: getSuggestedSkillsForPhase(phase),
    reasoning: `Multiple phase matches: ${winners.join(', ')}`,
  };
}

function scoreToSinglePhaseConfidence(score: number): number {
  if (score <= 1) return 0.7;
  if (score === 2) return 0.8;
  return 0.9;
}

function scoreToMultiPhaseConfidence(score: number): number {
  if (score <= 1) return 0.4;
  if (score === 2) return 0.5;
  return 0.6;
}

function getSuggestedSkillsForPhase(phase: SprintPhase, explicitSkill?: string): string[] {
  const skillsForPhase: string[] = Object.entries(SKILL_TO_PHASE_MAP)
    .filter(([, skillPhase]) => skillPhase === phase)
    .map(([skillName]) => skillName);

  if (!explicitSkill) {
    return skillsForPhase.slice(0, 3);
  }

  const deduped: string[] = [
    explicitSkill,
    ...skillsForPhase.filter((skill) => skill !== explicitSkill),
  ];
  return deduped.slice(0, 3);
}
