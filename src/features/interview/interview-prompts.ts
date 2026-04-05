import type { SprintPhase } from '../../types/agent.ts';

export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'architectural';

export interface InterviewStrategy {
  complexity: TaskComplexity;
  maxQuestions: number;
  requiredTopics: string[];
  description: string;
}

export const INTERVIEW_STRATEGIES: Record<TaskComplexity, InterviewStrategy> = {
  trivial: {
    complexity: 'trivial',
    maxQuestions: 0,
    requiredTopics: [],
    description: 'No questions needed — just do it.',
  },
  simple: {
    complexity: 'simple',
    maxQuestions: 2,
    requiredTopics: ['approach'],
    description: 'Confirm approach with 1-2 targeted questions.',
  },
  moderate: {
    complexity: 'moderate',
    maxQuestions: 5,
    requiredTopics: ['scope', 'approach', 'constraints'],
    description: 'Clarify scope and approach with 3-5 questions.',
  },
  complex: {
    complexity: 'complex',
    maxQuestions: 8,
    requiredTopics: ['goals', 'scope', 'constraints', 'users', 'acceptance-criteria'],
    description: 'Full requirements gathering with up to 8 questions.',
  },
  architectural: {
    complexity: 'architectural',
    maxQuestions: 12,
    requiredTopics: [
      'vision',
      'goals',
      'scope',
      'constraints',
      'users',
      'non-functional',
      'acceptance-criteria',
      'trade-offs',
    ],
    description: 'Deep discovery session — 8+ questions covering all dimensions.',
  },
};

const THINK_PHASE_INSTRUCTIONS = `## Think Phase: Discovery Interview

Your primary job in this phase is to **interview the user** to understand the real problem before any solutions are proposed.

**What to discover:**
1. What is the core problem they are trying to solve?
2. Who are the actual users and what is their context?
3. What are the business or technical goals behind this request?
4. What constraints exist (time, budget, team size, existing architecture)?
5. What does success look like — what would "done" mean?
6. What has already been tried or considered?

**Interview rules:**
- Ask open-ended questions first, then follow-up specifics
- Do NOT jump to solutions during discovery
- Surface assumptions and challenge them
- Use the Question tool when presenting options or directions to explore
- Aim for 3-6 questions before summarising your understanding

**Output of think phase:** A clear problem statement + goals summary, NOT a solution.`;

const PLAN_PHASE_INSTRUCTIONS = `## Plan Phase: Requirements Interview

Your primary job in this phase is to **confirm requirements** and resolve ambiguities before any implementation plan is created.

**What to confirm:**
1. Scope — what is explicitly IN and what is explicitly OUT?
2. Technical constraints — existing patterns, required libraries, deployment targets
3. Non-functional requirements — performance, security, scale, accessibility
4. Acceptance criteria — what specific conditions must be true for this to be "done"?
5. Risks and trade-offs — present 2-3 approaches with pros/cons using the Question tool
6. Dependencies — what else needs to be in place first?

**Interview rules:**
- Present technical options using the Question tool for structured selection
- Get explicit confirmation on acceptance criteria (they must be testable)
- Verify any assumptions in the existing design before proceeding
- Do NOT approve vague or unmeasurable requirements

**Output of plan phase:** A concrete spec with clear acceptance criteria, NOT just a task list.`;

const BUILD_PHASE_INSTRUCTIONS = `## Build Phase: Minimal Interview

In this phase, ask questions **only when genuinely ambiguous**. Prefer making reasonable assumptions and stating them explicitly.

**When to ask:**
- The implementation has two fundamentally different approaches with non-trivial trade-offs
- A decision will be hard to reverse later
- The spec contradicts something already in the codebase

**When NOT to ask:**
- Naming conventions (follow the existing pattern)
- Error handling style (follow the existing pattern)
- File structure (follow the existing pattern)
- Anything you can determine by reading the codebase

**Rule of thumb:** If you can answer it by looking at the code, don't ask.`;

const REVIEW_PHASE_INSTRUCTIONS = `## Review Phase: Blocking Questions Only

Ask only for decisions that would block the review from completing.

**Valid questions:**
- Merge target branch (if ambiguous)
- Whether to block or approve with conditions on a specific issue

**Do NOT ask about:**
- Implementation details (the code is already written)
- Preferences that don't affect correctness`;

const TEST_PHASE_INSTRUCTIONS = `## Test Phase: Blocking Questions Only

Ask only for decisions that would block testing from completing.

**Valid questions:**
- Test environment or configuration ambiguities
- Whether a specific edge case is in or out of scope

**Do NOT ask about:**
- Test implementation details (follow the existing test patterns)`;

const SHIP_PHASE_INSTRUCTIONS = `## Ship Phase: Release Decisions Only

Ask only for decisions that would block the release.

**Valid questions:**
- Release version (if not specified)
- Release notes scope (if ambiguous)
- Merge target (if not specified)

**Do NOT ask about:**
- Anything already agreed in the sprint plan`;

const REFLECT_PHASE_INSTRUCTIONS = `## Reflect Phase: Minimal Interview

Retrospectives are structured. Follow the retro format — ask only if the format itself is in question.

**Valid questions:**
- Whether to run a structured or free-form retro
- Time constraints on the session`;

const CROSS_CUTTING_INSTRUCTIONS = `## Cross-Cutting: Context-Aware Interview

Use your judgment based on the nature of the task. Default to the think phase interview depth for new topics, build phase for implementation tasks.`;

const UTILITY_INSTRUCTIONS = `## Utility Phase: Minimal Interview

Utility tasks are well-defined. Ask only if critical context is missing that cannot be inferred.`;

const PHASE_INSTRUCTIONS: Record<SprintPhase, string> = {
  think: THINK_PHASE_INSTRUCTIONS,
  plan: PLAN_PHASE_INSTRUCTIONS,
  build: BUILD_PHASE_INSTRUCTIONS,
  review: REVIEW_PHASE_INSTRUCTIONS,
  test: TEST_PHASE_INSTRUCTIONS,
  ship: SHIP_PHASE_INSTRUCTIONS,
  reflect: REFLECT_PHASE_INSTRUCTIONS,
  'cross-cutting': CROSS_CUTTING_INSTRUCTIONS,
  utility: UTILITY_INSTRUCTIONS,
};

export function getInterviewInstructions(phase: SprintPhase): string {
  return PHASE_INSTRUCTIONS[phase];
}

export function getQuestionToolGuidance(): string {
  return `### Using the Question Tool

When you need user input, use the Question tool for structured responses:

**When to use Question tool (structured UI):**
- Presenting 2+ options for user to choose from
- Yes/No confirmation decisions
- Selecting from a list of items

**When to use plain text questions:**
- Open-ended questions needing free-form answers
- Asking for context, background, or descriptions
- Questions where options can't be pre-determined

**Question tool format:**
The Question tool accepts structured questions with options. Each option has a label (max 30 chars) and optional description. Use multiSelect when multiple choices are valid.

**Anti-patterns:**
- DON'T ask questions you can answer by reading the codebase
- DON'T ask more than 3 questions at once
- DON'T ask the same question twice in a session
- DON'T skip the interview in think/plan phases — this is your most important job`;
}
