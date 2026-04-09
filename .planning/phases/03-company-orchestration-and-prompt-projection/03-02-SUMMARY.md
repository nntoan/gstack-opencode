---
phase: 03-company-orchestration-and-prompt-projection
plan: 02
subsystem: company-state, storage, delegation-metadata
tags: [company-state, decision-wait, retry-lineage, canonical-storage, tdd]
dependency_graph:
  requires: []
  provides:
    - typed Company workflow state for decision waits, retry lineage, and hidden execution context
    - canonical storage helpers for writing, resolving, archiving, and retrying decision waits
    - additive delegation metadata for Company workflow identity
  affects:
    - src/features/company/storage.ts
    - src/features/workspace-state/index.ts
    - src/plugin-interface.ts
    - src/features/orchestrator/delegation-engine.ts
tech_stack:
  added: []
  patterns:
    - canonical Company state stores both visible context and hidden execution context in one workflow record
    - decision waits are idempotent and checkpoint-bound before runtime wiring consumes them
    - retry lineage is deterministic via checkpoint registration and attempt numbering
key_files:
  created:
    - src/features/company/company-decision-wait.ts
    - src/features/company/company-decision-wait.test.ts
  modified:
    - src/features/company/types.ts
    - src/features/company/index.ts
    - src/features/company/storage.ts
    - src/features/company/storage.test.ts
    - src/features/orchestrator/delegation-engine.ts
    - src/features/orchestrator/delegation-engine.test.ts
decisions:
  - 'Visible Company UX data and hidden specialist/runtime data live in separate fields on the same CompanyState record rather than separate files'
  - 'Decision waits become immutable once answered or archived so duplicate responses cannot rewrite workflow history'
  - 'Retry lineage uses deterministic child attempt ids derived from workflow identity and attempt count'
metrics:
  duration: ~1 session
  completed: '2026-04-09'
  tasks_completed: 3
  files_changed: 8
---

# Phase 03 Plan 02: Company Workflow State Extensions — Summary

**One-liner:** Canonical Company state now persists workflow identity, decision waits, retry lineage, deferred intent data, and additive delegation metadata needed for Company-first orchestration.

## What Changed

### Task 1 — Workflow and Decision-Wait Contracts

Extended `src/features/company/types.ts` with additive Company workflow fields, including:

- `workflow_id`
- `current_attempt`
- `visible_context`
- `execution_context`
- `retry_lineage`
- `pending_decision_wait`
- `archived_decision_waits`

Added `DecisionWaitStatus`, `DecisionWait`, and related deferred-intent types. Created `src/features/company/company-decision-wait.ts` with `createDecisionWait`, `resolveDecisionWait`, and `archiveDecisionWait`.

### Task 2 — Canonical Persistence Helpers

Updated `src/features/company/storage.ts` and tests with helpers to:

- write pending waits into canonical state
- resolve matching waits idempotently
- archive answered waits into append-only history
- register safe retry checkpoints exactly once
- record deterministic retry attempts tied to existing checkpoints

### Task 3 — Delegation Metadata Extension

Extended `DelegationResult` in `src/features/orchestrator/delegation-engine.ts` with optional Company-specific metadata:

- `visibleAgent`
- `specialistRole`
- `confidence`
- `workflowId`
- `checkpointId`
- `attempt`

This stayed additive so legacy callers remain valid until runtime wiring populates the fields.

## Verification

- `bun test src/features/company/company-decision-wait.test.ts` ✓
- `bun test src/features/company/storage.test.ts` ✓
- `bun test src/features/orchestrator/delegation-engine.test.ts` ✓
- Included in full repo verification on 2026-04-09:
  - `bun run test` ✓
  - `bun run typecheck` ✓
  - `bun run lint` ✓ (only pre-existing warning in generated `.opencode` code)
  - `bun run build:all` ✓

## Decisions Made

- Kept the new fields additive so Phase 2 consumers continue to work without migration churn.
- Stored deferred request text and deferred classified intent inside Company state to make ask/confirm resume deterministic.

## Issues Encountered

- None beyond the temporary docstring-hook rejection already handled during Phase 3.

## Next Phase Readiness

- Runtime orchestration can now bind clarification and approval checkpoints to durable workflow state.
- Hook surfaces and retry flows have the state model they need without inventing transient side channels.

## Commit Status

- No commit created in this session. The user did not request a commit.
