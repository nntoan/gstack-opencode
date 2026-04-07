---
phase: 01-public-surface-split
plan: '03'
subsystem: config-handler, host-projection
tags:
  - company-mode
  - legacy-multi
  - host-projection
  - agent-surface
  - tdd
dependency_graph:
  requires:
    - company AgentRole in src/types/agent.ts (from 01-01)
    - companyAgent in ALL_AGENTS (from 01-01)
    - AgentSurfaceMode/AgentSurfaceConfig in src/types/config.ts (from 01-01)
    - agent_surface Zod schema defaulting to company mode (from 01-01)
  provides:
    - company-mode host projection in applyAgentConfig (only company agent projected)
    - legacy-multi compatibility path preserved in applyAgentConfig
    - specialist leakage blocked by projection-time filtering (not runtime removal)
    - disabled_agents separated from Company visibility control
    - config.agents.company overrides merge onto company entry in company mode
    - schema-safe default: absent agent_surface → company mode via ?? 'company'
  affects:
    - src/plugin-handlers/config-handler.ts (applyAgentConfig extended)
    - src/plugin-handlers/config-handler.test.ts (17 tests, 8 new)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle for company-mode projection
    - Early-return branch pattern for company mode in applyAgentConfig
    - makePluginConfig test helper defaults to legacy-multi for backward compat
key_files:
  created: []
  modified:
    - src/plugin-handlers/config-handler.ts
    - src/plugin-handlers/config-handler.test.ts
decisions:
  - "applyAgentConfig branches on agent_surface?.mode ?? 'company' as the surface mode source of truth"
  - 'Company mode uses early-return projection path: only company agent enters host config.agent'
  - 'makePluginConfig defaults to legacy-multi in tests to isolate company-mode tests from legacy-mode tests'
  - 'disabled_agents operates only as an explicit role filter — not repurposed as Company visibility control'
  - 'Task 2 RED produced green tests immediately: company-mode branch already handled all legacy-multi contract behaviors'
metrics:
  duration: '3m 55s'
  completed_date: '2026-04-07'
  tasks_completed: 2
  files_changed: 2
---

# Phase 01 Plan 03: Company-Mode Host Projection at Config-Handler Boundary — Summary

**One-liner:** Company-mode host projection enforced at `applyAgentConfig()` boundary — specialist leakage blocked by projection-time early-return, legacy-multi compatibility preserved as the explicit multi-agent path, and `disabled_agents` kept clean of visibility control semantics.

## Tasks Completed

| #       | Name                                                                  | Commit  | Files                                                         |
| ------- | --------------------------------------------------------------------- | ------- | ------------------------------------------------------------- |
| 1 RED   | Add failing tests for company-mode host projection                    | e1e7a0e | src/plugin-handlers/config-handler.test.ts                    |
| 1 GREEN | Project only company in company mode                                  | eef0c93 | src/plugin-handlers/config-handler.ts, config-handler.test.ts |
| 2 RED   | Add failing tests for legacy-multi compatibility                      | 6c47746 | src/plugin-handlers/config-handler.test.ts                    |
| 2 GREEN | Preserve legacy-multi projection path (pre-existing via Task 1 GREEN) | dae4f8e | — (empty commit, impl already correct)                        |

## What Was Built

### Task 1: Company-Mode Host Projection

- **`src/plugin-handlers/config-handler.ts`**: `applyAgentConfig()` now reads `surfaceMode = pluginConfig.agent_surface?.mode ?? 'company'`. When mode is `'company'`, the function takes an early-return projection path that publishes only the built-in `company` agent to host `config.agent`. Specialist agents (`ceo`, `builder`, etc.) are not present in the projected output. Override merging for `config.agents.company` is preserved in the company path. `disabled_agents` can still disable `company` explicitly if desired but is not used as the mechanism to hide specialists.

- **`src/plugin-handlers/config-handler.test.ts`**: Three new tests in `describe('#company-mode host projection')`:
  1. Company mode produces `config.agent` containing `company` from built-in registry
  2. Company mode produces `config.agent` without `ceo` or `builder` (specialist leakage test)
  3. Non-agent config (`categories`, `runtime_fallback`) unchanged in company mode

- **Test helper updated**: `makePluginConfig()` now defaults to `agent_surface: { mode: 'legacy-multi' }` so existing tests continue to test legacy multi-agent behavior without being affected by the new company-mode default. Company-mode tests explicitly pass `agent_surface: { mode: 'company' }`.

### Task 2: Legacy-Multi Compatibility

Four new tests in `describe('#legacy-multi compatibility')`:

1. **`legacy-multi` preserves multi-agent projection**: All agents (`company`, `ceo`, `builder`) present when mode is `legacy-multi` ✓
2. **`disabled_agents` semantics**: Disables by explicit role in `legacy-multi`; company mode hides specialists via projection path, not `disabled_agents` ✓
3. **`config.agents.company` override merge**: `model` and `instructions` overrides merge onto projected company entry in company mode ✓
4. **Schema-safe default** (negative test): `agent_surface: undefined` defaults to company mode — specialists absent from host config ✓

**Implementation note:** All four Task 2 behaviors were already correct from the Task 1 GREEN implementation. The early-return company branch and the untouched `legacy-multi` path collectively handled all four contracts. Same outcome pattern as Plan 01-02.

## Verification

```
bun test src/plugin-handlers/config-handler.test.ts  →  17 pass, 0 fail (was 9 before this plan)
bun run test  →  831 pass, 0 fail (full suite; 8 new assertions)
bun run typecheck  →  clean
```

## Deviations from Plan

### Context Deviation: Task 2 RED produced green tests immediately

**Both new tests for Task 2:** The plan called for TDD RED (tests fail first) then GREEN (implement to pass). The Task 2 tests passed immediately because:

- The `applyAgentConfig()` early-return company branch implemented in Task 1 GREEN already handled `config.agents.company` override merging, the schema-safe `?? 'company'` default, and the `disabled_agents` separation.
- The unmodified `legacy-multi` path already preserved all multi-agent projection semantics.

**Disposition:** Correct outcome, not a test quality issue. Tests are contract proof tests. The RED phase confirmed prior work was sufficient. Per the Plan 01-02 precedent, this is documented but not treated as a failure.

### Implementation Deviation: makePluginConfig() test helper updated

**Found during:** Task 1 GREEN (after implementing the company-mode branch).

**Issue:** The existing `makePluginConfig()` helper did not set `agent_surface`. After the implementation, `pluginConfig.agent_surface?.mode ?? 'company'` defaulted to `'company'` mode, causing 6 existing tests to fail because they expected multi-agent projection behavior.

**Fix:** Added `agent_surface: { mode: 'legacy-multi' }` as the default in `makePluginConfig()`. This preserves the intent of all existing tests (they test legacy multi-agent behavior) while the new `#company-mode host projection` suite explicitly tests company mode. This is an additive, non-breaking change to the test helper.

**Files modified:** `src/plugin-handlers/config-handler.test.ts`  
**Commit:** eef0c93 (included in Task 1 GREEN commit)

## Acceptance Criteria Verification

- [x] `bun test src/plugin-handlers/config-handler.test.ts` exits 0 (17 pass)
- [x] `src/plugin-handlers/config-handler.ts` branches on `pluginConfig.agent_surface?.mode ?? 'company'`
- [x] Tests prove company mode projects only `company` from the built-in registry
- [x] Tests prove built-in specialists (`ceo`, `builder`) are absent in company mode
- [x] Tests prove `legacy-multi` preserves the multi-agent projection path
- [x] Tests prove `config.agents.company` overrides merge onto projected company entry
- [x] `disabled_agents` used only as explicit disabled-role filter, not Company visibility control
- [x] Negative test: absent `agent_surface` defaults safely to company mode

## Known Stubs

None — all projection behaviors are wired and proven by tests. Phase 1 is now complete: contract (01-01), defaults/overrides (01-02), and host-projection split (01-03) are all implemented and tested.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. All changes are internal projection logic in `applyAgentConfig()`. Threat mitigations implemented:

- **T-03-01** (I — Specialist leakage): Explicit company-mode tests assert `ceo` and `builder` absent from `config.agent`. Filtering at projection time, not by runtime registry mutation. ✓
- **T-03-02** (T — `disabled_agents` repurposing): `agent_surface.mode` and `disabled_agents` are fully separate code paths. The company branch reads `disabledSet` only for the explicit `company` role guard, never for specialist visibility. ✓
- **T-03-03** (D — `legacy-multi` degradation): Explicit `legacy-multi` compatibility tests prove multi-agent projection remains explicit and usable. ✓

## Self-Check: PASSED

Files verified present:

- `src/plugin-handlers/config-handler.ts` ✓ (contains `agent_surface?.mode ?? 'company'` branch)
- `src/plugin-handlers/config-handler.test.ts` ✓ (contains company-mode and legacy-multi test suites)

Commits verified: e1e7a0e, eef0c93, 6c47746, dae4f8e — all present in git log.
