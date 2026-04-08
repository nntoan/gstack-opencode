---
phase: 02-company-runtime-artifact-model
plan: '01'
subsystem: company-storage
tags: [company, storage, artifact-model, tdd, path-helpers]
dependency_graph:
  requires:
    - src/shared/path-helpers.ts (getStatePath, getSprintLogPath, getOrchestratorCheckpointsDir)
    - src/features/workspace-state/types.ts (SprintPhase)
  provides:
    - src/features/company/types.ts (CompanyState, CompanyLogEntry, CompanyCheckpoint, COMPANY_ARTIFACT_OWNERSHIP)
    - src/features/company/storage.ts (readCompanyState, writeCompanyState, appendCompanyLogEntry, readCompanyLogEntries, writeCompanyCheckpoint, readCompanyCheckpoint)
    - src/features/company/index.ts (barrel re-exports all types and storage helpers)
  affects:
    - downstream plans 02-02 (migration fallback) and 02-03 (consumer integration)
tech_stack:
  added:
    - src/features/company/ (new feature module)
  patterns:
    - TDD with bun test / vitest API (RED→GREEN per behavior)
    - synchronous node:fs CRUD with recursive mkdir and existsSync guards
    - append-only JSONL writes via appendFileSync
    - null-return safety for all JSON parse paths
key_files:
  created:
    - src/features/company/types.ts
    - src/features/company/storage.ts
    - src/features/company/storage.test.ts
    - src/features/company/index.ts
  modified:
    - src/shared/path-helpers.ts (added getOrchestratorCheckpointsDir)
    - src/shared/path-helpers.test.ts (added test for new helper)
decisions:
  - 'Use synchronous node:fs APIs throughout storage.ts to match the existing boulder-storage.ts style'
  - 'Return null (not throw) on malformed JSON to satisfy T-02-01 threat mitigation'
  - 'appendFileSync for JSONL log writes guarantees append-only semantics without race-window truncation (T-02-03)'
  - 'Encode COMPANY_ARTIFACT_OWNERSHIP as a typed constant so downstream consumers can verify owned filenames without re-hardcoding them'
  - 'Export all helpers from index.ts barrel to enable clean import paths for plan 02-02 and 02-03'
metrics:
  duration: '~22 minutes'
  completed: '2026-04-08T07:23:30Z'
  tasks_total: 2
  tasks_completed: 2
  files_created: 4
  files_modified: 2
  tests_added: 13
  tests_total: 845
---

# Phase 02 Plan 01: Company Runtime Artifact Contracts Summary

**One-liner:** Canonical `.gstack/orchestrator/` artifact model with typed CompanyState contract, ownership encoding, and TDD-verified snapshot/JSONL-log/checkpoint storage helpers.

## What Was Built

This plan established the foundational Company runtime artifact layer before any migration or consumer-rewiring work begins.

### Task 1 — Canonical path vocabulary and Company artifact contracts

- Added `getOrchestratorCheckpointsDir(projectDir)` to `src/shared/path-helpers.ts`, resolving to `.gstack/orchestrator/checkpoints`. Test coverage added to `path-helpers.test.ts`.
- Created `src/features/company/types.ts` with:
  - `CompanyArtifactOwnership` — typed record of the three owned artifacts (`state.json`, `sprint-log.jsonl`, `checkpoints/`)
  - `CompanyStateSource` — union `'canonical' | 'legacy-boulder'` for migration tracking
  - `CompanyState` — versioned snapshot with `version: 1`, `visible_agent: 'company'`, `source`, timestamps, `session_ids`, optional specialist/plan/phase fields, and embedded `ownership`
  - `CompanyLogEntry` — envelope for JSONL log events
  - `CompanyCheckpoint` — envelope for checkpoint files (`id`, `captured_at`, embedded state, optional `reason`)
  - `COMPANY_ARTIFACT_OWNERSHIP` — typed constant instance for embedding in state objects
- Created `src/features/company/index.ts` barrel exporting all types and the constant.

### Task 2 — Snapshot, log, and checkpoint storage helpers

- Created `src/features/company/storage.ts` with six helpers:
  - `readCompanyState(directory)` — reads `.gstack/orchestrator/state.json`, returns `null` on missing or malformed file
  - `writeCompanyState(directory, state)` — creates parent dirs recursively, writes pretty JSON, returns boolean success
  - `appendCompanyLogEntry(directory, entry)` — creates parent dirs if needed, appends single JSONL line (never truncates)
  - `readCompanyLogEntries(directory)` — reads and parses all JSONL lines, returns `[]` on missing file
  - `writeCompanyCheckpoint(directory, checkpoint)` — creates `checkpoints/` dir recursively, writes `{id}.json`
  - `readCompanyCheckpoint(directory, checkpointId)` — reads `checkpoints/{id}.json`, returns `null` on missing or malformed
- Updated `src/features/company/index.ts` to re-export all six storage helpers.
- Wrote 13 tests in `src/features/company/storage.test.ts` covering:
  - round-trip snapshot read/write with shape assertions
  - correct file path (`.gstack/orchestrator/state.json`)
  - null return on missing, malformed JSON, and non-object shapes
  - append-only log growth across multiple writes
  - checkpoint write path (`.gstack/orchestrator/checkpoints/cp-002.json`)
  - null return on missing and malformed checkpoint files

## Deviations from Plan

None — plan executed exactly as written. No auto-fix deviations, no architectural surprises.

## Threat Mitigations Applied

| Threat                                                | Mitigation                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| T-02-01 (Tampering — malformed state)                 | `readCompanyState` and `readCompanyCheckpoint` return `null` on malformed JSON; never trust unknown parsed objects                             |
| T-02-02 (Information Disclosure — identity confusion) | `visible_agent: 'company'` and `CompanyArtifactOwnership` encoded in types so consumers cannot confuse Company artifacts with specialist state |
| T-02-03 (Denial of Service — accidental truncation)   | `appendFileSync` used for log writes (never `writeFileSync`); snapshots and checkpoints always write to named files at exact canonical paths   |

## Commits

| Commit    | Type        | Description                                            |
| --------- | ----------- | ------------------------------------------------------ |
| `f098921` | test(RED)   | add failing tests for company artifact paths and types |
| `e7da73d` | feat(GREEN) | define company runtime artifact contracts              |
| `5a26c8d` | test(RED)   | add failing tests for company storage helpers          |
| `ed8d9c9` | feat(GREEN) | add company snapshot log and checkpoint storage        |

## Verification Results

```
bun test src/features/company/storage.test.ts src/shared/path-helpers.test.ts
→ 30 pass, 0 fail

bun run test (full suite)
→ 845 pass, 0 fail (up from 831 after Phase 1)

bun run typecheck
→ clean (no errors)
```

## Known Stubs

None. All storage helpers are wired to the filesystem and fully functional.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes at unexpected trust boundaries were introduced. All writes are scoped to `.gstack/orchestrator/` as required by PROJECT.md constraints.

## Self-Check: PASSED

- `src/features/company/types.ts` — ✅ exists
- `src/features/company/storage.ts` — ✅ exists
- `src/features/company/storage.test.ts` — ✅ exists
- `src/features/company/index.ts` — ✅ exists
- `src/shared/path-helpers.ts` modified — ✅ contains `getOrchestratorCheckpointsDir`
- Commits f098921, e7da73d, 5a26c8d, ed8d9c9 — ✅ all present in git log
- Full test suite: 845 pass — ✅
- typecheck: clean — ✅
