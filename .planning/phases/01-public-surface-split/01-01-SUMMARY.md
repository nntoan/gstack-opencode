---
phase: 01-public-surface-split
plan: '01'
subsystem: agents, config
tags:
  - company-agent
  - agent-registry
  - config-schema
  - agent-surface
  - tdd
dependency_graph:
  requires: []
  provides:
    - company AgentRole in src/types/agent.ts
    - companyAgent in src/agents/company.ts and ALL_AGENTS
    - AgentSurfaceMode and AgentSurfaceConfig types in src/types/config.ts
    - agent_surface Zod schema in src/config/schema/main.ts
    - reasoning_effort on AgentOverrideConfig and AgentOverrideSchema
  affects:
    - src/cli/model-default-chains.ts (ROLE_FALLBACKS completeness)
    - src/agents/index.test.ts (count updated 13→14, cross-cutting phase update)
tech_stack:
  added: []
  patterns:
    - one-file-per-agent pattern followed for company.ts
    - TDD RED/GREEN cycle for all new behavior
    - Zod .default() used for additive agent_surface schema
key_files:
  created:
    - src/agents/company.ts
    - src/agents/company.test.ts
  modified:
    - src/types/agent.ts
    - src/types/config.ts
    - src/agents/index.ts
    - src/agents/index.test.ts
    - src/config/schema/agent-schema.ts
    - src/config/schema/main.ts
    - src/config/schema/main.test.ts
    - src/plugin-config.test.ts
    - src/cli/model-default-chains.ts
decisions:
  - "Company sprintPhase is 'cross-cutting' (not a separate phase) — orchestrator is always available"
  - 'ROLE_FALLBACKS company entry uses gpt-5.4 medium per R3 (github-copilot preferred provider)'
  - "agent_surface defaults to { mode: 'company' } at schema level via Zod .default()"
  - 'reasoning_effort added to AgentOverrideSchema for all agents (not company-only) for consistency'
metrics:
  duration: '5m 43s'
  completed_date: '2026-04-07'
  tasks_completed: 2
  files_changed: 9
---

# Phase 01 Plan 01: Add Company Agent Contract and Registry Coverage — Summary

**One-liner:** Company typed as a first-class internal agent role with `agent_surface.mode` additive config contract, fully schema-validated and test-covered via TDD.

## Tasks Completed

| #       | Name                                                | Commit  | Files                                                                                                                     |
| ------- | --------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1 RED   | Add failing tests for company registry contract     | 7001e3a | src/agents/company.test.ts, src/agents/index.test.ts                                                                      |
| 1 GREEN | Add company agent and registry wiring               | df11c04 | src/agents/company.ts, src/types/agent.ts, src/agents/index.ts, src/agents/index.test.ts, src/cli/model-default-chains.ts |
| 2 RED   | Add failing tests for agent_surface config contract | c6de47f | src/config/schema/main.test.ts, src/plugin-config.test.ts                                                                 |
| 2 GREEN | Add agent_surface schema and typing                 | 7d8e849 | src/types/config.ts, src/config/schema/agent-schema.ts, src/config/schema/main.ts                                         |

## What Was Built

### Task 1: Company Agent Contract

- **`src/agents/company.ts`**: New agent file following one-file-per-agent pattern. `role: 'company'`, `name: 'The Company'`, no hard-coded model, `sprintPhase: 'cross-cutting'`.
- **`src/types/agent.ts`**: Added `| 'company'` to the `AgentRole` union type.
- **`src/agents/index.ts`**: Imports, exports, and registers `companyAgent` in `ALL_AGENTS` (total: 14).
- **`src/agents/company.test.ts`**: 7 assertions covering role, name, model absence, description, skills, instructions.
- **`src/agents/index.test.ts`**: Updated count from 13→14, added `company` to role presence set, added `getAgentByRole('company')` test, updated cross-cutting phase test (now 2 agents: safety-guard + company).
- **`src/cli/model-default-chains.ts`**: Added `COMPANY_CHAIN` (gpt-5.4 medium, github-copilot preferred) and `company: COMPANY_CHAIN` entry to `ROLE_FALLBACKS: Record<AgentRole, FallbackEntry[]>` to satisfy TypeScript exhaustiveness requirement.

### Task 2: Agent Surface Config Contract

- **`src/types/config.ts`**: Added `AgentSurfaceMode = 'company' | 'legacy-multi'`, `AgentSurfaceConfig` interface, `reasoning_effort?: 'low' | 'medium' | 'high'` to `AgentOverrideConfig`, and `agent_surface?: AgentSurfaceConfig` to `GstackConfig`.
- **`src/config/schema/agent-schema.ts`**: Added `reasoning_effort: z.enum(['low', 'medium', 'high']).optional()` to `AgentOverrideSchema` so `agents.company.reasoning_effort` parses and validates correctly.
- **`src/config/schema/main.ts`**: Added `AgentSurfaceSchema` with `mode: z.enum(['company', 'legacy-multi']).default('company')`, and `agent_surface: AgentSurfaceSchema.default({ mode: 'company' })` to `GstackConfigSchema`.
- **`src/config/schema/main.test.ts`**: Added `#agent_surface config` suite (5 tests) and `#agent_surface reasoning_effort override` suite (3 tests).
- **`src/plugin-config.test.ts`**: Added backward-compat regression — old configs without `agent_surface` load successfully and default to company mode.

## Verification

```
bun test src/agents/company.test.ts src/agents/index.test.ts  →  32 pass, 0 fail
bun test src/config/schema/main.test.ts src/plugin-config.test.ts  →  41 pass, 0 fail
bun run test  →  818 pass, 0 fail (full suite)
bun run typecheck  →  clean
bun run lint  →  0 errors, 1 pre-existing warning (unrelated GSD tooling file)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] Added `company` entry to `ROLE_FALLBACKS` in `model-default-chains.ts`**

- **Found during:** Task 1 GREEN
- **Issue:** `ROLE_FALLBACKS: Record<AgentRole, FallbackEntry[]>` is an exhaustive typed map. Adding `'company'` to `AgentRole` without a corresponding entry would have caused typecheck failure once TypeScript saw the incomplete record.
- **Fix:** Added `COMPANY_CHAIN` (github-copilot/gpt-5.4 medium fallback, per R3 which states Company default target is GPT-5.4 with medium reasoning intent) and registered `company: COMPANY_CHAIN` in the map.
- **Files modified:** `src/cli/model-default-chains.ts`
- **Commit:** df11c04
- **Note:** Per the pre-execution risk scan this was explicitly anticipated as a "typed ripple hazard". The fix is the minimal coherent change that keeps typecheck green while honoring the phase intent.

**2. [Rule 1 - Test update] Updated cross-cutting phase test in `index.test.ts`**

- **Found during:** Task 1 GREEN
- **Issue:** Existing test `returns Safety Guard for cross-cutting phase` expected `agents.length === 1`. After adding Company with `sprintPhase: 'cross-cutting'`, the count became 2 and the test failed.
- **Fix:** Updated test to assert 2 cross-cutting agents (`['company', 'safety-guard']`), which correctly reflects the new reality. `sprintPhase: 'cross-cutting'` is semantically correct for The Company as a perpetually-available orchestrator.
- **Files modified:** `src/agents/index.test.ts`
- **Commit:** df11c04

## Acceptance Criteria Verification

- [x] `src/agents/company.ts` contains `role: 'company'`
- [x] `src/agents/company.ts` contains `name: 'The Company'`
- [x] `src/types/agent.ts` contains `| 'company'`
- [x] `src/agents/index.ts` contains `companyAgent`
- [x] `src/agents/index.test.ts` contains `expect(agents.length).toBe(14)`
- [x] `src/types/config.ts` defines `AgentSurfaceMode` with `company | legacy-multi` and adds `reasoning_effort?: 'low' | 'medium' | 'high'` to `AgentOverrideConfig`
- [x] `src/config/schema/main.ts` defaults `agent_surface.mode` to `company` and rejects invalid visibility values
- [x] `src/config/schema/agent-schema.ts` parses `reasoning_effort` for `agents.company` and rejects invalid reasoning values
- [x] `src/plugin-config.test.ts` contains a regression proving configs without `agent_surface` still load successfully

## Known Stubs

None — all behavior contracts are wired. The Company agent's skills array is intentionally empty (`[]`) because skill wiring is deferred to later phases per the phase design. This is not a stub — it is the correct initial state per D-07 (single registry, no runtime wiring in Phase 1 contract work).

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries were introduced by this plan. All changes are internal registry additions and additive config schema evolution with strict enum validation (mitigations T-01-01, T-01-02, T-01-03 implemented).

## Self-Check: PASSED

All committed files verified present:

- `src/agents/company.ts` ✓
- `src/agents/company.test.ts` ✓
- `src/types/agent.ts` ✓ (contains `| 'company'`)
- `src/agents/index.ts` ✓ (contains `companyAgent`)
- `src/types/config.ts` ✓ (contains `AgentSurfaceMode`, `reasoning_effort`)
- `src/config/schema/agent-schema.ts` ✓ (contains `reasoning_effort` enum)
- `src/config/schema/main.ts` ✓ (contains `AgentSurfaceSchema`)
- `src/config/schema/main.test.ts` ✓ (contains agent_surface tests)
- `src/plugin-config.test.ts` ✓ (contains backward-compat regression)

Commits verified: 7001e3a, df11c04, c6de47f, 7d8e849 — all present in git log.
