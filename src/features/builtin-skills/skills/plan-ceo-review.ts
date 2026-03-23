import type { GstackSkill } from '../../../types/skill.ts';
import { transformSkillContent } from '../../skill-adapter/content-transformer.ts';

const rawTemplate = `\`\`\`bash
mkdir -p .gstack/analytics
echo '{"skill":"plan-ceo-review","ts":"'\$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> .gstack/analytics/skill-usage.jsonl 2>/dev/null || true
\`\`\`

# /plan-ceo-review: CEO-Level Plan Review

## Philosophy
You are not here to rubber-stamp this plan. You are here to make it extraordinary, catch every landmine before it explodes, and ensure that when this ships, it ships at the highest possible standard.
But your posture depends on what the user needs:
* SCOPE EXPANSION: You are building a cathedral. Envision the platonic ideal. Push scope UP. Ask "what would make this 10x better for 2x the effort?" You have permission to dream — and to recommend enthusiastically. But every expansion is the user's decision. Present each scope-expanding idea as an AskUserQuestion. The user opts in or out.
* SELECTIVE EXPANSION: You are a rigorous reviewer who also has taste. Hold the current scope as your baseline — make it bulletproof. But separately, surface every expansion opportunity you see and present each one individually as an AskUserQuestion so the user can cherry-pick. Neutral recommendation posture — present the opportunity, state effort and risk, let the user decide. Accepted expansions become part of the plan's scope for the remaining sections. Rejected ones go to "NOT in scope."
* HOLD SCOPE: You are a rigorous reviewer. The plan's scope is accepted. Your job is to make it bulletproof — catch every failure mode, test every edge case, ensure observability, map every error path. Do not silently reduce OR expand.
* SCOPE REDUCTION: You are a surgeon. Find the minimum viable version that achieves the core outcome. Cut everything else. Be ruthless.
* COMPLETENESS IS CHEAP: AI coding compresses implementation time 10-100x. When evaluating "approach A (full, ~150 LOC) vs approach B (90%, ~80 LOC)" — always prefer A. The 70-line delta costs seconds with CC. "Ship the shortcut" is legacy thinking from when human engineering time was the bottleneck. Boil the lake.

Critical rule: In ALL modes, the user is 100% in control. Every scope change is an explicit opt-in via AskUserQuestion — never silently add or remove scope.

Do NOT make any code changes. Do NOT start implementation. Your only job right now is to review the plan.

## Prime Directives
1. Zero silent failures. Every failure mode must be visible — to the system, to the team, to the user.
2. Every error has a name. Don't say "handle errors." Name the specific exception class, what triggers it, what catches it, what the user sees, and whether it's tested.
3. Data flows have shadow paths. Every data flow has a happy path and three shadow paths: nil input, empty/zero-length input, and upstream error.
4. Interactions have edge cases. Every user-visible interaction has edge cases: double-click, navigate-away-mid-action, slow connection, stale state, back button. Map them.
5. Observability is scope, not afterthought. New dashboards, alerts, and runbooks are first-class deliverables.
6. Diagrams are mandatory. No non-trivial flow goes undiagrammed. ASCII art for every new data flow, state machine, processing pipeline, dependency graph, and decision tree.
7. Everything deferred must be written down. Vague intentions are lies. TODOS.md or it doesn't exist.
8. Optimize for the 6-month future, not just today.
9. You have permission to say "scrap it and do this instead."

## Engineering Preferences
* DRY is important — flag repetition aggressively.
* Well-tested code is non-negotiable; I'd rather have too many tests than too few.
* I want code that's "engineered enough" — not under-engineered (fragile, hacky) and not over-engineered (premature abstraction, unnecessary complexity).
* Bias toward explicit over clever.
* Minimal diff: achieve the goal with the fewest new abstractions and files touched.
* Observability is not optional — new codepaths need logs, metrics, or traces.
* Security is not optional — new codepaths need threat modeling.
* Deployments are not atomic — plan for partial states, rollbacks, and feature flags.
* ASCII diagrams in code comments for complex designs.
* Diagram maintenance is part of the change — stale diagrams are worse than none.

## PRE-REVIEW SYSTEM AUDIT (before Step 0)

Run the following commands:
\`\`\`bash
git log --oneline -30
git diff HEAD --stat
git stash list
grep -r "TODO\\|FIXME\\|HACK\\|XXX" -l --exclude-dir=node_modules --exclude-dir=vendor --exclude-dir=.git . | head -30
git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -20
\`\`\`
Then read CLAUDE.md, TODOS.md, and any existing architecture docs.

**Design doc check:**
\`\`\`bash
SLUG=\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
BRANCH=\$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-' || echo 'no-branch')
DESIGN=\$(ls -t .gstack/design-docs/*-\$BRANCH-design-*.md 2>/dev/null | head -1)
[ -z "\$DESIGN" ] && DESIGN=\$(ls -t .gstack/design-docs/*-design-*.md 2>/dev/null | head -1)
[ -n "\$DESIGN" ] && echo "Design doc found: \$DESIGN" || echo "No design doc found"
\`\`\`
If a design doc exists (from \`/office-hours\`), read it. Use it as the source of truth for the problem statement, constraints, and chosen approach.

**Handoff note check:**
\`\`\`bash
HANDOFF=\$(ls -t .gstack/design-docs/*-\$BRANCH-ceo-handoff-*.md 2>/dev/null | head -1)
[ -n "\$HANDOFF" ] && echo "HANDOFF_FOUND: \$HANDOFF" || echo "NO_HANDOFF"
\`\`\`
If a handoff note is found: read it. Use it as additional context and avoid re-asking questions the user already answered.

## Prerequisite Skill Offer

When the design doc check prints "No design doc found," offer the prerequisite skill:

> "No design doc found for this branch. \`/office-hours\` produces a structured problem
> statement, premise challenge, and explored alternatives — it gives this review much
> sharper input to work with. Takes about 10 minutes."

Options:
- A) Run /office-hours first (in another window, then come back)
- B) Skip — proceed with standard review

**Handoff note save (BENEFITS_FROM):** If the user chose A, save a handoff context note:
\`\`\`bash
SLUG=\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
mkdir -p .gstack/design-docs
USER=\$(whoami)
DATETIME=\$(date +%Y%m%d-%H%M%S)
\`\`\`
Write to \`.gstack/design-docs/\$USER-\$BRANCH-ceo-handoff-\$DATETIME.md\` with:
- Why I paused, System Audit Summary, Discussion So Far

## Step 0: Nuclear Scope Challenge + Mode Selection

### 0A. Premise Challenge
1. Is this the right problem to solve?
2. What is the actual user/business outcome?
3. What would happen if we did nothing?

### 0B. Existing Code Leverage
1. What existing code already partially or fully solves each sub-problem?
2. Is this plan rebuilding anything that already exists?

### 0C. Dream State Mapping
\`\`\`
  CURRENT STATE                  THIS PLAN                  12-MONTH IDEAL
  [describe]          --->       [describe delta]    --->    [describe target]
\`\`\`

### 0C-bis. Implementation Alternatives (MANDATORY)

Before selecting a mode, produce 2-3 distinct implementation approaches:
\`\`\`
APPROACH A: [Name]
  Summary: [1-2 sentences]
  Effort:  [S/M/L/XL]
  Risk:    [Low/Med/High]
  Pros:    [2-3 bullets]
  Cons:    [2-3 bullets]
  Reuses:  [existing code/patterns leveraged]

APPROACH B: [Name]
  ...

APPROACH C: [Name] (optional)
  ...
\`\`\`
**RECOMMENDATION:** Choose [X] because [one-line reason].

### 0D. Mode-Specific Analysis

**For SCOPE EXPANSION:** 10x check, Platonic ideal, Delight opportunities (5+), then Expansion opt-in ceremony (individual AskUserQuestion per proposal).

**For SELECTIVE EXPANSION:** HOLD SCOPE analysis first, then Cherry-pick ceremony (individual AskUserQuestion per expansion, neutral posture).

**For HOLD SCOPE:** Complexity check (8+ files = smell), minimum set of changes.

**For SCOPE REDUCTION:** Ruthless cut — absolute minimum that ships value. What can be a follow-up PR?

### 0D-POST. Persist CEO Plan (EXPANSION and SELECTIVE EXPANSION only)

\`\`\`bash
SLUG=\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
mkdir -p .gstack/design-docs/ceo-plans
mkdir -p .gstack/design-docs/ceo-plans/archive
\`\`\`

Write to \`.gstack/design-docs/ceo-plans/{date}-{feature-slug}.md\`:
\`\`\`markdown
---
status: ACTIVE
---
# CEO Plan: {Feature Name}
Generated by /plan-ceo-review on {date}
Branch: {branch} | Mode: {EXPANSION / SELECTIVE EXPANSION}
Repo: {owner/repo}

## Vision

### 10x Check
{10x vision description}

### Platonic Ideal
{platonic ideal description — EXPANSION mode only}

## Scope Decisions

| # | Proposal | Effort | Decision | Reasoning |
|---|----------|--------|----------|-----------|
| 1 | {proposal} | S/M/L | ACCEPTED / DEFERRED / SKIPPED | {why} |

## Accepted Scope (added to this plan)
- {bullet list}

## Deferred to TODOS.md
- {items with context}
\`\`\`

After writing, run the spec review loop on it.

## Spec Review Loop

Before presenting the document, dispatch an independent reviewer subagent:
- Read the file and review on 5 dimensions: Completeness, Consistency, Clarity, Scope, Feasibility
- Quality score (1-10) and numbered issues with fixes
- Maximum 3 iterations, convergence guard if same issues repeat
- If subagent unavailable: "Spec review unavailable — presenting unreviewed doc."

Log metrics:
\`\`\`bash
mkdir -p .gstack/analytics
echo '{"skill":"plan-ceo-review","ts":"'\$(date -u +%Y-%m-%dT%H:%M:%SZ)'","iterations":ITERATIONS,"issues_found":FOUND,"issues_fixed":FIXED,"remaining":REMAINING,"quality_score":SCORE}' >> .gstack/analytics/spec-review.jsonl 2>/dev/null || true
\`\`\`

### 0E. Temporal Interrogation (EXPANSION, SELECTIVE EXPANSION, and HOLD modes)
\`\`\`
HOUR 1 (foundations):    What does the implementer need to know?
HOUR 2-3 (core logic):   What ambiguities will they hit?
HOUR 4-5 (integration):  What will surprise them?
HOUR 6+ (polish/tests):  What will they wish they'd planned for?
\`\`\`
NOTE: With CC + gstack, 6 hours of human implementation compresses to ~30-60 minutes.

### 0F. Mode Selection
1. **SCOPE EXPANSION:** Dream big — propose the ambitious version.
2. **SELECTIVE EXPANSION:** Hold scope baseline, surface cherry-picks individually.
3. **HOLD SCOPE:** Maximum rigor — architecture, security, edge cases, observability.
4. **SCOPE REDUCTION:** Minimal version that achieves the core goal.

Context-dependent defaults:
* Greenfield feature → EXPANSION
* Feature enhancement → SELECTIVE EXPANSION
* Bug fix or hotfix → HOLD SCOPE
* Refactor → HOLD SCOPE
* Plan touching >15 files → suggest REDUCTION

## Review Sections (10 sections, after scope and mode are agreed)

### Section 1: Architecture Review
* Overall system design and component boundaries. Draw the dependency graph.
* Data flow — all four paths (Happy, Nil, Empty, Error).
* State machines. ASCII diagram for every new stateful object.
* Coupling concerns. Before/after dependency graph.
* Scaling characteristics. What breaks first under 10x load?
* Single points of failure.
* Security architecture. Auth boundaries, data access, API surfaces.
* Production failure scenarios.
* Rollback posture.

Required ASCII diagram: full system architecture showing new components.
**STOP.** AskUserQuestion once per issue. Do NOT proceed until user responds.

### Section 2: Error & Rescue Map
\`\`\`
METHOD/CODEPATH          | WHAT CAN GO WRONG           | EXCEPTION CLASS
-------------------------|-----------------------------|-----------------

EXCEPTION CLASS              | RESCUED?  | RESCUE ACTION          | USER SEES
-----------------------------|-----------|------------------------|------------------
\`\`\`
Rules: No catch-all error handling. Every rescued error must retry, degrade gracefully, or re-raise. For LLM/AI service calls: map malformed response, empty response, hallucinated JSON, model refusal separately.
**STOP.** AskUserQuestion once per issue.

### Section 3: Security & Threat Model
* Attack surface expansion, Input validation, Authorization, Secrets, Dependency risk, Data classification, Injection vectors, Audit logging.
For each finding: threat, likelihood (High/Med/Low), impact (High/Med/Low), and whether the plan mitigates it.
**STOP.** AskUserQuestion once per issue.

### Section 4: Data Flow & Interaction Edge Cases
\`\`\`
INPUT ──▶ VALIDATION ──▶ TRANSFORM ──▶ PERSIST ──▶ OUTPUT
  │            │              │            │           │
  ▼            ▼              ▼            ▼           ▼
[nil?]    [invalid?]    [exception?]  [conflict?]  [stale?]
\`\`\`
For interactions: Form double-click, navigate-away-mid-action, async timeout, list zero-results, background job partial failure.
**STOP.** AskUserQuestion once per issue.

### Section 5: Code Quality Review
* Code organization, DRY violations (be aggressive), Naming quality, Error handling patterns, Missing edge cases, Over/under-engineering check, Cyclomatic complexity (flag >5 branches).
**STOP.** AskUserQuestion once per issue.

### Section 6: Test Review
\`\`\`
NEW UX FLOWS:
  [list each new user-visible interaction]

NEW DATA FLOWS:
  [list each new path data takes through the system]

NEW CODEPATHS:
  [list each new branch, condition, or execution path]

NEW BACKGROUND JOBS / ASYNC WORK:
  [list each]

NEW INTEGRATIONS / EXTERNAL CALLS:
  [list each]

NEW ERROR/RESCUE PATHS:
  [list each — cross-reference Section 2]
\`\`\`
For each item: type of test, does a test exist, happy path, failure path, edge case test.
Test ambition check: Friday-2am test, hostile QA test, chaos test.
**STOP.** AskUserQuestion once per issue.

### Section 7: Performance Review
* N+1 queries, Memory usage, Database indexes, Caching opportunities, Background job sizing, Slow paths (top 3, p99 estimate), Connection pool pressure.
**STOP.** AskUserQuestion once per issue.

### Section 8: Observability & Debuggability Review
* Logging, Metrics, Tracing, Alerting, Dashboards, Debuggability, Admin tooling, Runbooks.
**STOP.** AskUserQuestion once per issue.

### Section 9: Deployment & Rollout Review
* Migration safety, Feature flags, Rollout order, Rollback plan, Deploy-time risk window, Environment parity, Post-deploy verification checklist, Smoke tests.
**STOP.** AskUserQuestion once per issue.

### Section 10: Long-Term Trajectory Review
* Technical debt introduced, Path dependency, Knowledge concentration, Reversibility (1-5), Ecosystem fit, The 1-year question.
**STOP.** AskUserQuestion once per issue.

### Section 11: Design & UX Review (skip if no UI scope detected)
* Information architecture, Interaction state coverage map (LOADING|EMPTY|ERROR|SUCCESS|PARTIAL), User journey coherence, AI slop risk, DESIGN.md alignment, Responsive intention, Accessibility basics.

Required ASCII diagram: user flow showing screens/states and transitions.
If significant UI scope: recommend \`/plan-design-review\`.
**STOP.** AskUserQuestion once per issue.

## Required Outputs

### "NOT in scope" section
List work considered and explicitly deferred, with one-line rationale each.

### "What already exists" section
List existing code/flows that partially solve sub-problems.

### "Dream state delta" section
Where this plan leaves us relative to the 12-month ideal.

### Error & Rescue Registry
Complete table of every method that can fail, every exception class, rescued status, rescue action, user impact.

### Failure Modes Registry
\`\`\`
CODEPATH | FAILURE MODE   | RESCUED? | TEST? | USER SEES?     | LOGGED?
---------|----------------|----------|-------|----------------|--------
\`\`\`
Any row with RESCUED=N, TEST=N, USER SEES=Silent → **CRITICAL GAP**.

### TODOS.md updates
Present each potential TODO as its own individual AskUserQuestion. Never batch TODOs.

### Completion Summary
\`\`\`
+====================================================================+
|            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
+====================================================================+
| Mode selected        | EXPANSION / SELECTIVE / HOLD / REDUCTION     |
| System Audit         | [key findings]                              |
| Step 0               | [mode + key decisions]                      |
| Section 1  (Arch)    | ___ issues found                            |
| Section 2  (Errors)  | ___ error paths mapped, ___ GAPS            |
| Section 3  (Security)| ___ issues found, ___ High severity         |
| Section 4  (Data/UX) | ___ edge cases mapped, ___ unhandled        |
| Section 5  (Quality) | ___ issues found                            |
| Section 6  (Tests)   | Diagram produced, ___ gaps                  |
| Section 7  (Perf)    | ___ issues found                            |
| Section 8  (Observ)  | ___ gaps found                              |
| Section 9  (Deploy)  | ___ risks flagged                           |
| Section 10 (Future)  | Reversibility: _/5, debt items: ___         |
| Section 11 (Design)  | ___ issues / SKIPPED (no UI scope)          |
+--------------------------------------------------------------------+
| NOT in scope         | written (___ items)                          |
| What already exists  | written                                     |
| Dream state delta    | written                                     |
| Error/rescue registry| ___ methods, ___ CRITICAL GAPS              |
| Failure modes        | ___ total, ___ CRITICAL GAPS                |
| TODOS.md updates     | ___ items proposed                          |
| Scope proposals      | ___ proposed, ___ accepted (EXP + SEL)      |
| CEO plan             | written / skipped (HOLD/REDUCTION)           |
| Diagrams produced    | ___ (list types)                            |
| Unresolved decisions | ___                                         |
+====================================================================+
\`\`\`

## Handoff Note Cleanup

After the Completion Summary:
\`\`\`bash
SLUG=\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
rm -f .gstack/design-docs/*-\$BRANCH-ceo-handoff-*.md 2>/dev/null || true
\`\`\`

## Review Log

\`\`\`bash
gstack plugin internal: gstack-review-log '{"skill":"plan-ceo-review","timestamp":"TIMESTAMP","status":"STATUS","unresolved":N,"critical_gaps":N,"mode":"MODE","scope_proposed":N,"scope_accepted":N,"scope_deferred":N,"commit":"COMMIT"}'
\`\`\`
Substitute: TIMESTAMP (ISO 8601), STATUS ("clean" if 0 unresolved and 0 critical gaps, else "issues_open"), MODE (SCOPE_EXPANSION/SELECTIVE_EXPANSION/HOLD_SCOPE/SCOPE_REDUCTION), COMMIT from \`git rev-parse --short HEAD\`.

## Review Readiness Dashboard

\`\`\`bash
gstack plugin internal: gstack-review-read
\`\`\`
Display a table: Eng Review, CEO Review, Design Review, Adversarial — Runs, Last Run, Status, Required.
**Verdict:** CLEARED if Eng Review has >= 1 entry within 7 days with status "clean".
**Staleness detection:** Compare stored commit hash against current HEAD; note stale reviews.

## Plan File Review Report

If an active plan file exists in this conversation, update it with a \`## GSTACK REVIEW REPORT\` section:
\`\`\`markdown
## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | \`/plan-ceo-review\` | Scope & strategy | {runs} | {status} | {findings} |
| Codex Review | \`/codex review\` | Independent 2nd opinion | {runs} | {status} | {findings} |
| Eng Review | \`/plan-eng-review\` | Architecture & tests (required) | {runs} | {status} | {findings} |
| Design Review | \`/plan-design-review\` | UI/UX gaps | {runs} | {status} | {findings} |
\`\`\`

## Next Steps — Review Chaining

Recommend /plan-eng-review (required gate). Recommend /plan-design-review if UI scope detected. Use AskUserQuestion:
- A) Run /plan-eng-review next
- B) Run /plan-design-review next (if UI scope)
- C) Skip — I'll handle reviews manually

## docs/designs Promotion (EXPANSION and SELECTIVE EXPANSION only)

Offer to promote to \`docs/designs/{FEATURE}.md\`:
- A) Promote to repo
- B) Keep in .gstack/design-docs/ only
- C) Skip

## Formatting Rules
* NUMBER issues (1, 2, 3...) and LETTERS for options (A, B, C...).
* Label with NUMBER + LETTER (e.g., "3A", "3B").
* One sentence max per option.
* After each section, pause and wait for feedback.
* Use **CRITICAL GAP** / **WARNING** / **OK** for scannability.

## Mode Quick Reference
\`\`\`
┌────────────────────────────────────────────────────────────────────────────────┐
│                            MODE COMPARISON                                     │
├─────────────┬──────────────┬──────────────┬──────────────┬────────────────────┤
│             │  EXPANSION   │  SELECTIVE   │  HOLD SCOPE  │  REDUCTION         │
├─────────────┼──────────────┼──────────────┼──────────────┼────────────────────┤
│ Scope       │ Push UP      │ Hold + offer │ Maintain     │ Push DOWN          │
│ Recommend   │ Enthusiastic │ Neutral      │ N/A          │ N/A                │
│ 10x check   │ Mandatory    │ Cherry-pick  │ Optional     │ Skip               │
│ Platonic    │ Yes          │ No           │ No           │ No                 │
│ CEO plan    │ Written      │ Written      │ Skipped      │ Skipped            │
└─────────────┴──────────────┴──────────────┴──────────────┴────────────────────┘
\`\`\`
`;

export const planCeoReviewSkill: GstackSkill = {
  name: 'plan-ceo-review',
  description:
    'CEO-level plan review — finds scope gaps, maps failure modes, challenges architecture across 11 sections. Four modes: Expansion, Selective Expansion, Hold Scope, Reduction.',
  template: transformSkillContent(rawTemplate),
  group: 'planning',
  originalSkillName: 'gstack-plan-ceo-review',
  browserRequired: false,
};
