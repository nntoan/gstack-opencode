---
phase: 03-company-orchestration-and-prompt-projection
plan: 04
subsystem: plugin-interface, orchestration-runtime, company-mode
tags: [plugin-interface, company-mode, decision-waits, pending-context, runtime-orchestration]
dependency_graph:
  requires:
    - 03-01 # company-safe prompt projection
    - 03-02 # workflow state, decision waits, retry lineage
    - 03-03 # ambiguity policy and pending context
  provides:
    - company-aware chat.message handling for ask, confirm, approval, debug, and retry flows
    - system.transform injection for company delegations and pending Company prompts
    - interruption-safe session cleanup that preserves canonical workflow context before clearing runtime state
  affects:
    - src/plugin-interface.ts
    - src/plugin-interface.test.ts
    - src/features/workspace-state/index.ts
tech_stack:
  added: []
  patterns:
    - pending Company decisions are always checked before classifying fresh user text
    - accepted or rejected answers continue the same workflow instead of forking new work
    - Company-mode runtime annotates delegated results with visible Company identity while preserving hidden specialist metadata in execution state
key_files:
  created: []
  modified:
    - src/plugin-interface.ts
    - src/plugin-interface.test.ts
    - src/features/workspace-state/index.ts
decisions:
  - 'Company-mode answer parsing uses explicit accept/reject/debug/retry regexes before any reclassification to prevent accidental workflow forks'
  - 'Pending decision waits must match the canonical wait id before state is mutated'
  - 'Session cleanup persists interruption-safe Company state before clearing in-memory delegation state'
metrics:
  duration: ~1 session
  completed: '2026-04-09'
  tasks_completed: 2
  files_changed: 3
---

# Phase 03 Plan 04: Company Runtime Orchestration — Summary

**One-liner:** `plugin-interface.ts` now runs Company-mode orchestration end to end, including ask/confirm/approval flows, deferred workflow resume, debug/retry handling, Company prompt injection, and interruption-safe cleanup.

## What Changed

### Task 1 — Company Ask/Confirm/Delegate Flow in `chat.message`

Updated `src/plugin-interface.ts` and tests so Company mode now:

- checks pending Company context and canonical decision waits before classifying new text
- parses explicit accept, reject, debug/expert, and retry answers with fixed regexes
- reuses deferred request text and deferred intent instead of classifying raw yes/no replies as new work
- stores checkpoint-bound pending Company decisions for ask/confirm/approval paths
- delegates immediately only when policy says `delegate`
- annotates Company delegations with workflow/checkpoint/attempt metadata

### Task 2 — Company Prompt Injection and Cleanup

Extended `experimental.chat.system.transform` and `event(session.deleted)` so Company mode now:

- injects Company-safe delegation prompts via `buildDelegationSystemPrompt(..., { mode: 'company' })`
- injects pending Company clarification prompts when delegation is intentionally withheld
- updates Company state for explicit debug visibility requests
- records safe retry attempts only when the workflow state marks retry as safe
- writes an interruption-safe Company summary before clearing runtime delegation/pending state

### Supporting Change — Workspace Company Facade

Updated `src/features/workspace-state/index.ts` so the `company` facade exposes the new decision-wait and retry helpers directly to runtime consumers.

## Verification

- `bun test src/plugin-interface.test.ts` ✓
- Included in full repo verification on 2026-04-09:
  - `bun run test` ✓
  - `bun run typecheck` ✓
  - `bun run lint` ✓ (only pre-existing warning in generated `.opencode` code)
  - `bun run build:all` ✓

## Decisions Made

- Moved debug/expert and retry detection into `chat.message`, because that is the only runtime boundary that has direct access to user text.
- Preserved non-Company behavior by keeping Company-mode branching explicit instead of rewriting the general flow.

## Issues Encountered

- None after the runtime flow was wired; targeted tests passed once the Company helpers and state contract were in place.

## Next Phase Readiness

- Hook surfaces can now read stable Company workflow state and present Company-voiced progress/recovery text.
- Retry, interruption, and debug flows now have canonical state to explain what was preserved and what the next safe step is.

## Commit Status

- No commit created in this session. The user did not request a commit.
