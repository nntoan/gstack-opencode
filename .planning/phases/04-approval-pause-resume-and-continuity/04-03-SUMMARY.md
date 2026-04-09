---
phase: 04-approval-pause-resume-and-continuity
plan: 03
subsystem: company
tags: [quality-gates, checkpoint, approval, company-mode, delegation-state, workspace-state]

# Dependency graph
requires:
  - phase: 04-approval-pause-resume-and-continuity
    plan: 01
    provides: Company decision-wait contract (writeCheckpoint, writeDecisionWait, createDecisionWait)

provides:
  - buildCompanyBlockerPrompt — reusable Company-voiced blocker prompt builder (non-leaky, anti-leakage by design)
  - Gate hook extended with Company mode checkpoint binding before blocker prompts are surfaced
  - DelegationState.PendingCompanyContext extended with source:'gate' and approvalAction:'continue-same-workflow'

affects:
  - 04-approval-pause-resume-and-continuity
  - any phase consuming quality-gate hooks in Company mode

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Checkpoint-bound prompt pattern: write checkpoint + approval wait BEFORE surfacing user-facing prompt
    - Anti-leakage prompt builder: accepts technical fields (checkpointId, workflowId, attemptCount) but intentionally excludes them from output
    - Deduplication guard on repeated gate renders via getPendingContext check

key-files:
  created:
    - src/features/company/company-blocker-prompt.ts
    - src/features/company/company-blocker-prompt.test.ts
  modified:
    - src/features/quality-gates/gate-hook.ts
    - src/features/quality-gates/gate-hook.test.ts
    - src/features/orchestrator/delegation-state.ts
    - src/create-hooks.ts

key-decisions:
  - "buildCompanyBlockerPrompt accepts checkpointId/workflowId/attemptCount but never renders them — anti-leakage by design"
  - "createGateHook extended with optional workspaceState/delegationState/companyMode params — fully backward-compatible"
  - "Block verdict renders 'Resolve the blocker before continuing.', warn verdict renders 'Confirm the recommendation before continuing.'"
  - "Deduplication guard: getPendingContext check before writing new checkpoint prevents duplicate checkpoints for the same session state snapshot"
  - "PendingCompanyContext extended with source:'gate' and approvalAction:'continue-same-workflow' to carry gate provenance into the approval lifecycle"

patterns-established:
  - "Checkpoint-before-prompt: write durable checkpoint + approval wait before surfacing any Company blocker prompt to user"
  - "Anti-leakage prompt builder: internal ids and counters are passed in but excluded from user-visible output"
  - "Backward-compatible hook extension: optional params added to createGateHook, non-Company path unchanged"

requirements-completed: [R7, R9, R10, R12]

# Metrics
duration: ~45min
completed: 2026-04-09
---

# Phase 04 Plan 03: Blocker Approval Bridge Summary

**Company-voiced quality-gate blocker prompts that write a fresh checkpoint and approval wait before surfacing guidance, using an anti-leakage builder that excludes internal ids from user-visible output**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-09T00:00:00Z
- **Completed:** 2026-04-09T00:45:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created `buildCompanyBlockerPrompt` — a reusable, anti-leakage prompt builder that formats quality-gate blockers in Company voice with `## Company Decision Required`, goal, current step, recommendation, consequence, and a bullet list of gate messages; never leaks checkpoint ids, workflow ids, attempt counters, or specialist names
- Extended `createGateHook` to write a fresh checkpoint and `approval` decision wait (with `resolution_action: 'continue-same-workflow'`) before surfacing any Company blocker prompt, binding gate blockers into the same durable lifecycle as other Company decisions
- Extended `PendingCompanyContext` with `source: 'gate'` and `approvalAction: 'continue-same-workflow'` to carry gate provenance through the approval state machine; added deduplication guard to prevent duplicate checkpoints on repeated renders

## Task Commits

Each task was committed atomically:

1. **test(04-03): add failing company blocker prompt coverage** — `dbbbe9e` (test)
2. **feat(04-03): add company blocker prompt builder** — `d1635d5` (feat)
3. **test(04-03): add failing gate checkpoint binding coverage** — `e8e6e8c` (test)
4. **feat(04-03): bind Company blocker prompts to fresh checkpoints** — `c895dae` (feat)

**Plan metadata:** _(this commit)_ (docs: complete blocker approval bridge plan)

_Note: TDD tasks have multiple commits (test → feat)_

## Files Created/Modified
- `src/features/company/company-blocker-prompt.ts` — New prompt builder; exports `buildCompanyBlockerPrompt(input: CompanyBlockerPromptInput)` with anti-leakage guarantees
- `src/features/company/company-blocker-prompt.test.ts` — 9 tests: required sections, block vs warn wording, non-leakage of checkpoint ids / attempt counters / workflow ids / specialist names
- `src/features/quality-gates/gate-hook.ts` — Extended `createGateHook` with optional `workspaceState`, `delegationState`, `companyMode`; Company mode path writes checkpoint, approval wait, pending context, then pushes prompt into `typedOutput.system`
- `src/features/quality-gates/gate-hook.test.ts` — Retained all 24 existing tests + added 5 Company-mode tests (checkpoint write, approval wait with `resolution_action:'continue-same-workflow'`, pending context `source:'gate'`, non-Company fallback, deduplication guard); 29/29 pass
- `src/features/orchestrator/delegation-state.ts` — `PendingCompanyContext` extended with optional `source?: 'gate' | 'plugin-interface'` and `approvalAction?: 'continue-same-workflow'`
- `src/create-hooks.ts` — Passes `workspaceState`, `delegationState`, `companyMode: isCompanyMode` into `createGateHook(...)`

## Decisions Made
- `buildCompanyBlockerPrompt` accepts `checkpointId`, `workflowId`, and `attemptCount` in its interface but intentionally excludes them from output (anti-leakage: technical persistence metadata must not appear in user-facing Company text)
- `createGateHook` params extended as optional to preserve all existing call sites without modification
- `block` verdict → `"Resolve the blocker before continuing."`, `warn` verdict → `"Confirm the recommendation before continuing."` — distinct but Company-voiced
- Deduplication guard uses `ds.getPendingContext(sessionId) !== null` check to skip new checkpoint writes when a gate decision is already pending
- `PendingCompanyContext.source` field (`'gate' | 'plugin-interface'`) added to carry gate provenance into downstream approval resume logic

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] camelCase/snake_case mapping between PendingCompanyContext and DeferredClassifiedIntent**
- **Found during:** Task 2 (gate-hook binding)
- **Issue:** `PendingCompanyContext.deferredIntent` expected camelCase shape (`suggestedAgent`, `suggestedSkills`) while `DeferredClassifiedIntent` in `company/types.ts` uses snake_case (`suggested_agent`, `suggested_skills`). Direct assignment would be a type error.
- **Fix:** Applied explicit field mapping when constructing the `deferredIntent` value from `company.execution_context?.deferred_classified_intent`
- **Files modified:** `src/features/quality-gates/gate-hook.ts`
- **Verification:** `bun run typecheck` clean; `bun test gate-hook.test.ts` 29/29 pass
- **Committed in:** `c895dae` (Task 4 commit)

**2. [Rule 2 - Missing Critical] Extracted non-Company warning path into `buildLegacyWarnings()` helper**
- **Found during:** Task 2 (gate-hook binding)
- **Issue:** Extending the hook with Company mode required cleanly separating the existing non-Company warn/block text path to avoid regression; the original inline logic was not reusable
- **Fix:** Extracted non-Company text building into a local `buildLegacyWarnings()` helper; Company mode and non-Company mode are now distinct branches with no shared mutation
- **Files modified:** `src/features/quality-gates/gate-hook.ts`
- **Verification:** All 24 original gate-hook tests pass unchanged
- **Committed in:** `c895dae` (Task 4 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical extraction)
**Impact on plan:** Both auto-fixes were required for type safety and regression safety. No scope creep.

## Issues Encountered
None — plan executed cleanly. Type mapping discovery was the only unexpected wrinkle; resolved inline.

## Threat Mitigations Applied

| Threat ID | Category | Mitigation Applied |
|-----------|----------|--------------------|
| T-04-07 | I (Information Disclosure) | `buildCompanyBlockerPrompt` excludes checkpoint ids, attempt counters, and specialist names from all output |
| T-04-08 | T (Tampering) | `createGateHook` writes fresh checkpoint + approval wait BEFORE surfacing prompt; durability guaranteed before visibility |
| T-04-09 | D (Denial) | Deduplication guard (`getPendingContext` check) + test coverage; repeated renders do not create unbounded duplicate checkpoints |

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Company blocker prompts are checkpoint-bound and ready for the approval resume flow to consume them
- `PendingCompanyContext.source:'gate'` and `approvalAction:'continue-same-workflow'` fields are available for the resume handler to detect gate-origin approvals
- `bun test` (38 new tests), `bun run typecheck`, and `bun run lint` all clean

---
*Phase: 04-approval-pause-resume-and-continuity*
*Completed: 2026-04-09*
