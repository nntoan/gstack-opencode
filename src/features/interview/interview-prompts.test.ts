import { describe, it, expect } from 'bun:test';
import {
  INTERVIEW_STRATEGIES,
  getInterviewInstructions,
  getQuestionToolGuidance,
} from './interview-prompts.ts';
import type { SprintPhase } from '../../types/agent.ts';

const ALL_PHASES: SprintPhase[] = [
  'think',
  'plan',
  'build',
  'review',
  'test',
  'ship',
  'reflect',
  'cross-cutting',
  'utility',
];

describe('getInterviewInstructions', () => {
  it('returns non-empty instructions for every sprint phase', () => {
    for (const phase of ALL_PHASES) {
      const result = getInterviewInstructions(phase);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('think phase emphasises discovery and asking questions', () => {
    const instructions = getInterviewInstructions('think');
    expect(instructions).toContain('interview');
    expect(instructions).toContain('problem');
    expect(instructions).toContain('Question tool');
  });

  it('plan phase emphasises requirements and confirmation', () => {
    const instructions = getInterviewInstructions('plan');
    expect(instructions).toContain('requirements');
    expect(instructions).toContain('acceptance criteria');
    expect(instructions).toContain('Question tool');
  });

  it('build phase has lighter interview instructions', () => {
    const build = getInterviewInstructions('build');
    const think = getInterviewInstructions('think');

    // build phase should be shorter / lighter than think
    expect(build.length).toBeLessThan(think.length);

    // build should emphasise NOT asking questions unnecessarily
    expect(build).toContain('only when genuinely ambiguous');
  });

  it('build phase instructs to make assumptions rather than ask', () => {
    const instructions = getInterviewInstructions('build');
    expect(instructions).toContain('assumptions');
  });

  it('review phase instructs to ask for blocking decisions only', () => {
    const instructions = getInterviewInstructions('review');
    expect(instructions).toContain('block');
  });

  it('ship phase focuses on release decisions', () => {
    const instructions = getInterviewInstructions('ship');
    expect(instructions).toContain('release');
  });

  it('think and plan phases are the most interview-intensive', () => {
    const think = getInterviewInstructions('think');
    const plan = getInterviewInstructions('plan');
    const ship = getInterviewInstructions('ship');
    const test = getInterviewInstructions('test');

    expect(think.length).toBeGreaterThan(ship.length);
    expect(plan.length).toBeGreaterThan(test.length);
  });
});

describe('INTERVIEW_STRATEGIES', () => {
  it('trivial strategy has 0 max questions', () => {
    expect(INTERVIEW_STRATEGIES.trivial.maxQuestions).toBe(0);
  });

  it('simple strategy has at most 2 max questions', () => {
    expect(INTERVIEW_STRATEGIES.simple.maxQuestions).toBeLessThanOrEqual(2);
    expect(INTERVIEW_STRATEGIES.simple.maxQuestions).toBeGreaterThan(0);
  });

  it('moderate strategy has 3-5 max questions', () => {
    expect(INTERVIEW_STRATEGIES.moderate.maxQuestions).toBeGreaterThanOrEqual(3);
    expect(INTERVIEW_STRATEGIES.moderate.maxQuestions).toBeLessThanOrEqual(5);
  });

  it('complex strategy has 5-8 max questions', () => {
    expect(INTERVIEW_STRATEGIES.complex.maxQuestions).toBeGreaterThanOrEqual(5);
    expect(INTERVIEW_STRATEGIES.complex.maxQuestions).toBeLessThanOrEqual(8);
  });

  it('architectural strategy has 8+ max questions', () => {
    expect(INTERVIEW_STRATEGIES.architectural.maxQuestions).toBeGreaterThanOrEqual(8);
  });

  it('all strategies have a non-empty description', () => {
    for (const strategy of Object.values(INTERVIEW_STRATEGIES)) {
      expect(typeof strategy.description).toBe('string');
      expect(strategy.description.length).toBeGreaterThan(0);
    }
  });

  it('all strategies have the correct complexity field set', () => {
    const complexities = ['trivial', 'simple', 'moderate', 'complex', 'architectural'] as const;
    for (const complexity of complexities) {
      expect(INTERVIEW_STRATEGIES[complexity].complexity).toBe(complexity);
    }
  });

  it('strategies scale in maxQuestions from trivial to architectural', () => {
    const { trivial, simple, moderate, complex, architectural } = INTERVIEW_STRATEGIES;
    expect(trivial.maxQuestions).toBeLessThan(simple.maxQuestions);
    expect(simple.maxQuestions).toBeLessThan(moderate.maxQuestions);
    expect(moderate.maxQuestions).toBeLessThanOrEqual(complex.maxQuestions);
    expect(complex.maxQuestions).toBeLessThanOrEqual(architectural.maxQuestions);
  });
});

describe('getQuestionToolGuidance', () => {
  it('returns a non-empty string', () => {
    const result = getQuestionToolGuidance();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('contains "Question tool" references', () => {
    const guidance = getQuestionToolGuidance();
    expect(guidance).toContain('Question tool');
  });

  it('describes when to use the Question tool', () => {
    const guidance = getQuestionToolGuidance();
    expect(guidance).toContain('When to use Question tool');
  });

  it('describes when NOT to use the Question tool (plain text)', () => {
    const guidance = getQuestionToolGuidance();
    expect(guidance).toContain('plain text');
  });

  it('includes anti-patterns section', () => {
    const guidance = getQuestionToolGuidance();
    expect(guidance).toContain('Anti-patterns');
  });

  it('warns against asking more than 3 questions at once', () => {
    const guidance = getQuestionToolGuidance();
    expect(guidance).toContain('3 questions');
  });

  it('warns against skipping the interview in think/plan phases', () => {
    const guidance = getQuestionToolGuidance();
    expect(guidance).toContain('think/plan phases');
  });

  it('mentions multiSelect option', () => {
    const guidance = getQuestionToolGuidance();
    expect(guidance).toContain('multiSelect');
  });
});
