---
phase: 03-company-orchestration-and-prompt-projection
plan: 05
subsystem: hooks, session-continuity, quality-scorecard
tags: [company-hooks, recovery, progress, debug-trace, retry-safe, tdd]
dependency_graph:
  requires:
    - 03-02 # canonical Company workflow state and retry metadata
    - 03-04 # plugin runtime wiring for Company orchestration
  provides:
    - company-voiced recovery and progress output with goal/current-step framing
    - company-safe delegation hints and debug-only trace surfacing
    - canonical hook/test scaffolds aligned with new Company facade APIs
  affects:
    - src/create-hooks.ts
    - src/features/session-continuity/
    - src/features/quality-scorecard/
tech_stack:
  added: []
  patterns:
    - normal Company-mode hook output reads visible_context first and avoids specialist provenance by default
    - debug trace is gated behind trace_visibility === 'debug' and rendered as causality-first workflow detail
    - test fakes that emulate workspaceState.company must match the canonical company facade contract
key_files:
  created: []
  modified:
    - src/create-hooks.ts
    - src/features/session-continuity/recovery-hook.ts
    - src/features/session-continuity/progress-hook.ts
    - src/features/session-continuity/boulder-hook.ts
    - src/features/session-continuity/session-continuity.test.ts
    - src/features/quality-scorecard/delegation-context-hook.ts
    - src/features/quality-scorecard/quality-scorecard.test.ts
    - src/features/company/company-ambiguity-policy.ts
decisions:
  - 'Company-facing hook output uses goal, current step, and status summary from visible_context before falling back to older phase/specialist fields'
  - 'Debug trace remains available but only under an explicit debug visibility flag'
  - 'The test scaffolds must expose the full Company facade, including decision-wait and retry helpers, to stay type-clean with createWorkspaceState()'
metrics:
  duration: ~1 session
  completed: '2026-04-09'
  tasks_completed: 2
  files_changed: 8
---

# Phase 03 Plan 05: Company Recovery, Progress, and Trace Surfaces — Summary

**One-liner:** Recovery, progress, and delegation-context hooks now speak in Company terms, preserve retry-safe and interruption-safe guidance, and surface trace detail only in explicit debug mode.

## What Changed

### Task 1 — Company Recovery and Progress Hooks

Updated `src/create-hooks.ts`, `src/features/session-continuity/recovery-hook.ts`, `src/features/session-continuity/progress-hook.ts`, and tests so Company mode now:

- renders `## Session Recovery` with `**Goal:**` and `**Current step:**`
- renders `## Company Progress` with `**Status:**`
- avoids hidden specialist labels in normal Company-mode output
- includes a separate `## Company Debug Trace` block only when debug visibility is enabled
- describes retry-safe resume paths in Company language instead of exposing internal persona framing

### Task 2 — Company-Safe Delegation Hints and Transition Metadata

Updated `src/features/session-continuity/boulder-hook.ts`, `src/features/quality-scorecard/delegation-context-hook.ts`, and tests so:

- Company transition metadata stays durable in canonical log/state
- Company-mode hints use outcome-focused wording such as `The next safe step...`
- debug-only hint blocks show workflow/checkpoint/decision/retry lineage data in causal order
- normal Company-mode hints do not expose `delegation.agent.role` or `company.active_specialist`

### Verification Fixups During Closeout

Two test scaffolds were brought back into alignment with the expanded `workspaceState.company` facade:

- `src/features/session-continuity/session-continuity.test.ts`
- `src/features/quality-scorecard/quality-scorecard.test.ts`

Added stub methods for:

- `writeDecisionWait`
- `resolveDecisionWait`
- `archiveDecisionWait`
- `registerSafeRetryCheckpoint`
- `recordRetryAttempt`

Also removed an unused `thresholds` parameter from `src/features/company/company-ambiguity-policy.ts` to satisfy lint without changing behavior.

## Verification

- `bun test src/features/session-continuity/session-continuity.test.ts` ✓
- `bun test src/features/quality-scorecard/quality-scorecard.test.ts` ✓
- Full repo verification on 2026-04-09:
  - `bun run test` → 903 pass, 0 fail ✓
  - `bun run typecheck` ✓
  - `bun run lint` ✓ (only pre-existing warning in generated `.opencode/get-shit-done/bin/lib/state.cjs`)
  - `bun run build:all` ✓

## Decisions Made

- Treated the lint finding in `company-ambiguity-policy.ts` as a real Phase 3 closeout fix rather than ignoring it, because the Phase gate requires a clean repo-level validation loop.
- Kept the generated `.opencode` lint warning out of scope because it predates this Phase 3 work and is not part of the modified implementation surface.

## Issues Encountered

- The final verification run exposed type drift in test doubles after the Company facade gained new methods. Fixing the fakes was sufficient; runtime logic and targeted tests were already correct.

## Next Phase Readiness

- Company-first orchestration is now validated end to end across runtime, storage, prompts, and hook surfaces.
- The remaining workflow work is administrative: review/phase-completion steps, not missing implementation.

## Commit Status

- No commit created in this session. The user did not request a commit.
