---
phase: 02-company-runtime-artifact-model
plan: 03
subsystem: session-continuity, sprint-tools, quality-scorecard
tags: [company-state, canonical-runtime, sprint-tools, session-continuity, tdd]
dependency_graph:
  requires:
    - 02-02 # company facade on workspaceState
    - 02-01 # company storage helpers
  provides:
    - canonical Company state drives live recovery/progress/status output
    - save-plan initializes state.json for new workspaces
    - boulder-hook is now the canonical Company state transition tracker
  affects:
    - src/features/session-continuity/
    - src/features/tools/sprint-tools.ts
    - src/features/quality-scorecard/delegation-context-hook.ts
    - src/create-hooks.ts
tech_stack:
  added: []
  patterns:
    - canonical-first state reads via readResolved() with explicit legacy-boulder fallback
    - non-overwrite guard: read before write for both boulder and company state
    - phase transition log entries appended on meaningful state changes
key_files:
  created: []
  modified:
    - src/features/session-continuity/recovery-hook.ts
    - src/features/session-continuity/progress-hook.ts
    - src/features/session-continuity/boulder-hook.ts
    - src/features/quality-scorecard/delegation-context-hook.ts
    - src/create-hooks.ts
    - src/features/tools/sprint-tools.ts
    - src/features/session-continuity/session-continuity.test.ts
    - src/features/quality-scorecard/quality-scorecard.test.ts
    - src/features/tools/sprint-tools.test.ts
decisions:
  - 'Use readResolved() at all consumption sites — unifies canonical + legacy-boulder paths in one call rather than branching every caller'
  - 'Boulder-hook remains responsible for all phase/specialist transitions; it writes canonical Company state first, legacy boulder only when a boulder record already exists'
  - 'Sprint-status reports active_specialist (CompanyState field) not agent (BoulderState field) — decouples visible output from legacy field name'
  - 'save-plan initializes canonical Company state immediately alongside boulder state so new workspaces are canonical from the first plan save'
metrics:
  duration: ~35 minutes
  completed: '2026-04-08'
  tasks_completed: 2
  files_changed: 9
---

# Phase 02 Plan 03: Switch Runtime Consumers to Canonical Company State — Summary

**One-liner:** Recovery/progress hooks, sprint-status, and boulder-hook wired to canonical `CompanyState` via `readResolved()` with explicit legacy-boulder compatibility fallback.

## Tasks Completed

| Task    | Name                                                        | Commit    | Files                                                                                                                                   |
| ------- | ----------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1 RED   | Add failing tests for canonical recovery and progress hooks | `200caa2` | `session-continuity.test.ts`                                                                                                            |
| 1 GREEN | Switch continuity hooks to company state                    | `97daed9` | `recovery-hook.ts`, `progress-hook.ts`, `boulder-hook.ts`, `delegation-context-hook.ts`, `create-hooks.ts`, `quality-scorecard.test.ts` |
| 2 RED   | Add failing tests for company sprint tool state             | `d1b8094` | `sprint-tools.test.ts`                                                                                                                  |
| 2 GREEN | Initialize and report canonical company state               | `18e3e48` | `sprint-tools.ts`, `sprint-tools.test.ts`                                                                                               |

## What Changed

### Task 1 — Continuity Hooks → Canonical Company State

**`recovery-hook.ts`**: reads `workspaceState.company.readResolved()` instead of `boulder.read()`. Uses `active_specialist` for the agent field in recovery metadata.

**`progress-hook.ts`**: reads `workspaceState.company.readResolved()` instead of `boulder.read()`. Falls through to empty when readResolved returns null (no boulder, no canonical state).

**`boulder-hook.ts`**: now the canonical Company state transition tracker. On phase or specialist change, writes updated `current_phase`, `active_specialist`, `updated_at`, and session IDs into canonical Company state, and appends a `phase_transition` log entry. Mirrors into legacy boulder only when a boulder record already exists — preserving compatibility without creating new boulder files for canonical-only workspaces.

**`delegation-context-hook.ts`**: reads `workspaceState.company.readResolved()` for `plan_name` and `current_phase` metadata instead of reading raw boulder fields.

**`create-hooks.ts`**: `getSessionMetadata` prefers canonical Company state via `readResolved()` with explicit boulder fallback for `plan_name` and `current_phase`.

**`quality-scorecard.test.ts`**: updated fake `readResolved()` to synthesize from boulder state as legacy fallback (so the "reminds about active plan with incomplete tasks" test continues to pass against the delegation-context-hook's new code path).

### Task 2 — Sprint Tools → Canonical Company State

**`createSavePlanTool`**: after writing the plan file and optionally initializing boulder state, also calls `managers.workspaceState.company.read()` — if null, writes an initial `CompanyState` with `version: 1`, `visible_agent: 'company'`, `source: 'canonical'`, `active_plan`, `plan_name`, `started_at`, `updated_at`, `session_ids`, and `COMPANY_ARTIFACT_OWNERSHIP`. Non-overwrite behavior preserved: existing canonical state is never replaced.

**`createSprintStatusTool`**: switched from `boulder.read()` to `company.readResolved()`. Reports `plan_name`, `current_phase`, `active_specialist`, `started_at`, and session count from canonical state. Falls back to the "No active sprint" message only when `readResolved()` returns null (no canonical state and no boulder).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] quality-scorecard.test.ts fake broke after readResolved() migration**

- **Found during:** Task 1 GREEN
- **Issue:** The existing fake `workspaceState` in `quality-scorecard.test.ts` had `readResolved: () => null` hardcoded. After `delegation-context-hook.ts` switched to `readResolved()`, the test "reminds about active plan with incomplete tasks" began failing — it sets up boulder state but never saw plan metadata.
- **Fix:** Updated the fake's `readResolved()` to synthesize from boulder state as a legacy fallback, matching the same logic used in the real `createWorkspaceState`.
- **Files modified:** `src/features/quality-scorecard/quality-scorecard.test.ts`
- **Commit:** `97daed9`

**2. [Rule 1 - Bug] Test used `current_phase: 'design'` — not a valid SprintPhase**

- **Found during:** Task 2 typecheck
- **Issue:** `SprintPhase` union does not include `'design'`. TypeScript error `TS2322`.
- **Fix:** Changed to `current_phase: 'plan'` in the sprint-tools test.
- **Files modified:** `src/features/tools/sprint-tools.test.ts`
- **Commit:** `18e3e48`

## Verification

- 869 tests pass, 0 fail (`bun run test`)
- TypeScript typecheck clean (`bun run typecheck`)
- Acceptance criteria satisfied:
  - `recovery-hook.ts` contains `workspaceState.company.readResolved()` ✓
  - `progress-hook.ts` contains `workspaceState.company.readResolved()` ✓
  - `delegation-context-hook.ts` contains `workspaceState.company.readResolved()` ✓
  - `boulder-hook.ts` contains `appendLog` ✓
  - `create-hooks.ts` contains `workspaceState.company` ✓
  - `session-continuity.test.ts` contains `readResolved` ✓
  - `sprint-tools.ts` contains `workspaceState.company.read()`, `visible_agent: 'company'`, `source: 'canonical'` ✓
  - `sprint-tools.test.ts` contains `state.json`, `workspaceState.company` ✓

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes beyond what was declared in the plan's threat model.

## Self-Check: PASSED

- `recovery-hook.ts` — modified and committed in `97daed9` ✓
- `progress-hook.ts` — modified and committed in `97daed9` ✓
- `boulder-hook.ts` — modified and committed in `97daed9` ✓
- `delegation-context-hook.ts` — modified and committed in `97daed9` ✓
- `create-hooks.ts` — modified and committed in `97daed9` ✓
- `sprint-tools.ts` — modified and committed in `18e3e48` ✓
- `sprint-tools.test.ts` — modified in `d1b8094` and `18e3e48` ✓
- `session-continuity.test.ts` — modified in `200caa2` ✓
- `quality-scorecard.test.ts` — modified in `97daed9` ✓
- All 4 task commits present in git log ✓
- 869/869 tests pass ✓
- typecheck clean ✓
