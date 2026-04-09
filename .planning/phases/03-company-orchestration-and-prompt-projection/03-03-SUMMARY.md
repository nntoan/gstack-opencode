---
phase: 03-company-orchestration-and-prompt-projection
plan: 03
subsystem: ambiguity-policy, delegation-state, company-routing
tags: [ambiguity-policy, pending-context, confidence-thresholds, company-routing, tdd]
dependency_graph:
  requires: []
  provides:
    - pure ask/confirm/delegate policy for Company-mode routing
    - pending Company clarification context stored alongside delegation state
  affects:
    - src/plugin-interface.ts
    - src/features/orchestrator/delegation-state.ts
    - src/features/company/company-ambiguity-policy.ts
tech_stack:
  added: []
  patterns:
    - low-confidence routing asks before delegating
    - mid-confidence routing recommends a phase and waits for confirmation
    - rejected or multi-phase paths remain deterministic by carrying forward deferred context
key_files:
  created:
    - src/features/company/company-ambiguity-policy.ts
    - src/features/company/company-ambiguity-policy.test.ts
  modified:
    - src/features/orchestrator/delegation-state.ts
    - src/features/orchestrator/delegation-state.test.ts
decisions:
  - 'Confidence thresholds are fixed in code at 0.5 and 0.85 so Company-mode routing stays deterministic and testable'
  - 'Ask and confirm prompts use Company voice only; no specialist names appear in routing prompts'
  - 'Pending clarification state stores both original request text and deferred intent so accept/reject turns do not reclassify raw replies as new work'
metrics:
  duration: ~1 session
  completed: '2026-04-09'
  tasks_completed: 2
  files_changed: 4
---

# Phase 03 Plan 03: Company Ambiguity Policy — Summary

**One-liner:** Company-mode routing now uses a pure confidence policy for ask/confirm/delegate decisions and keeps deferred clarification context in memory until runtime consumes it.

## What Changed

### Task 1 — Pure Company Ambiguity Policy

Created `src/features/company/company-ambiguity-policy.ts` and tests.

Behavior now includes:

- immediate delegation for explicit or high-confidence routes
- ask-before-delegate behavior below `0.5`
- recommend-and-confirm behavior from `0.5` through `0.84`
- Company-voiced recovery prompts when a recommendation is rejected
- explicit sequence prompts for `Multiple phase matches:` reasoning
- expert/debug escalation hints only after repeated clarification stalls

### Task 2 — Pending Company Context in Delegation State

Extended `src/features/orchestrator/delegation-state.ts` with pending-context support:

- `setPendingContext(...)`
- `getPendingContext(...)`
- `clearPendingContext(...)`

The stored context includes prompt kind, phase, workflow/checkpoint identifiers, request text, and deferred classified intent. `clearSession()` and `clearAll()` now clear both the delegation map and pending-context map.

## Verification

- `bun test src/features/company/company-ambiguity-policy.test.ts` ✓
- `bun test src/features/orchestrator/delegation-state.test.ts` ✓
- Included in full repo verification on 2026-04-09:
  - `bun run test` ✓
  - `bun run typecheck` ✓
  - `bun run lint` ✓ (only pre-existing warning in generated `.opencode` code)
  - `bun run build:all` ✓

## Decisions Made

- Kept the ambiguity policy pure so runtime logic in `plugin-interface.ts` can compose it without hidden side effects.
- Stored pending clarification context in memory rather than canonical storage, because the durable decision record already lives in Company state and the runtime only needs a session-scoped resume payload.

## Issues Encountered

- A later lint pass flagged an unused `thresholds` parameter in `buildAskPrompt`; it was removed without changing policy behavior.

## Next Phase Readiness

- `plugin-interface.ts` can now withhold delegation safely and resume the same workflow after a user answer.
- Company-mode ask/confirm/approval turns have a deterministic policy and state shape to build on.

## Commit Status

- No commit created in this session. The user did not request a commit.
