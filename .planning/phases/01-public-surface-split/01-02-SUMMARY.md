---
phase: 01-public-surface-split
plan: '02'
subsystem: agents, config, model-defaults
tags:
  - company-model-defaults
  - company-override-loading
  - fallback-chain
  - tdd
dependency_graph:
  requires:
    - company AgentRole in src/types/agent.ts (from 01-01)
    - companyAgent in ALL_AGENTS (from 01-01)
    - COMPANY_CHAIN in ROLE_FALLBACKS (from 01-01 typed ripple fix)
  provides:
    - test proof: Company resolves to github-copilot/gpt-5.4 when Copilot available
    - test proof: COMPANY_CHAIN preserves medium variant intent
    - test proof: agents.company.model override works via generic runtime path
    - test proof: agents.company.instructions override works via generic runtime path
    - test proof: Company and specialist overrides coexist in same config payload
  affects:
    - src/create-skills-and-agents.test.ts (expanded with Company contract tests)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle — contract proof tests for pre-existing implementation
    - Import ROLE_FALLBACKS in tests to assert chain metadata directly
    - Generic config.agents?.[agent.role] pattern handles Company without special casing
key_files:
  created: []
  modified:
    - src/create-skills-and-agents.test.ts
decisions:
  - 'COMPANY_CHAIN was pre-established in 01-01 as typed ripple fix — no new implementation needed'
  - 'createSkillsAndAgents generic config.agents?.[agent.role] path handles Company correctly — D-01 and D-08 satisfied without Company-specific branching'
  - 'agents.company.reasoning_effort from 01-01 is the preserved downstream contract for R3 — not enforced here, deferred to later runtime-consumption phases'
metrics:
  duration: '3m 21s'
  completed_date: '2026-04-07'
  tasks_completed: 2
  files_changed: 1
---

# Phase 01 Plan 02: Wire Company Default-Model and Override Loading — Summary

**One-liner:** Company default model resolution and per-agent override loading proven through TDD contract tests against the pre-existing generic runtime assembly path — no new implementation code required.

## Tasks Completed

| #       | Name                                                  | Commit  | Files                                  |
| ------- | ----------------------------------------------------- | ------- | -------------------------------------- |
| 1 RED   | Add failing tests for company default model contract  | 3685a7f | src/create-skills-and-agents.test.ts   |
| 1 GREEN | Company fallback chain defaults (pre-existing)        | c57d600 | — (empty commit, impl in 01-01)        |
| 2 RED   | Add failing tests for company override loading        | 84631b1 | src/create-skills-and-agents.test.ts   |
| 2 GREEN | Company overrides via runtime registry (pre-existing) | e2b3d4c | — (empty commit, impl already correct) |

## What Was Built

### Task 1: Company Default Model Contract

Three new tests in `src/create-skills-and-agents.test.ts` under `describe('Company default model contract')`:

1. **Copilot resolution**: `install_selection.has_copilot: true` → `company.model === 'github-copilot/gpt-5.4'` ✓
2. **Medium variant intent**: `ROLE_FALLBACKS['company']` contains at least one entry with `variant === 'medium'` ✓
3. **Specialist unchanged**: `ceo`, `builder`, `debugger` models are unaffected by Company chain addition ✓

**Implementation note:** `COMPANY_CHAIN` (`github-copilot/gpt-5.4`, `variant: 'medium'`) was already added in Plan 01-01 as the typed ripple fix to keep `ROLE_FALLBACKS: Record<AgentRole, FallbackEntry[]>` exhaustive. `resolveAgentModelDefaults()` already iterates all roles including `company`. No new implementation code was needed.

### Task 2: `agents.company` Override Loading

Three new tests in `src/create-skills-and-agents.test.ts` under `describe('agents.company override loading')`:

1. **Model override**: `config.agents.company.model` wins over the default chain ✓
2. **Instructions override**: `config.agents.company.instructions` replaces Company instructions ✓
3. **Coexistence**: `company` and `builder` overrides coexist in the same config payload without interference ✓

**Implementation note:** `createSkillsAndAgents` already uses `config.agents?.[agent.role]` for all agents generically. Company is registered in `ALL_AGENTS` and flows through the same map — no Company-specific override branch needed. This is the correct D-01 and D-08 design outcome: one override path, all agents equal.

## Verification

```
bun test src/create-skills-and-agents.test.ts  →  8 pass, 0 fail (was 2 before this plan)
bun run test  →  824 pass, 0 fail (full suite; 6 new assertions)
bun run typecheck  →  clean
```

## Deviations from Plan

### Context Deviation: TDD RED phase produced green tests immediately

**Both tasks:** The plan called for TDD RED (tests fail first) then GREEN (implement to pass). In both tasks, the new tests passed immediately because:

- **Task 1**: `COMPANY_CHAIN` was added in Plan 01-01 as the typed ripple fix, which pre-empted the Task 1 GREEN implementation.
- **Task 2**: `createSkillsAndAgents` uses a generic `config.agents?.[agent.role]` path, so Company overrides flow through identically to every other role.

**Disposition:** This is a correct outcome, not a test quality issue. The tests are contract proof tests — they assert that the implementation satisfies specific product behaviors. The behaviors were satisfied before Plan 01-02 began because Plan 01-01 set the required groundwork. The TDD discipline was honored by writing the test intention first and verifying behavior explicitly; the "RED" phase simply confirmed that prior work was sufficient.

**Per deviation rules:** No auto-fix needed (there is no bug). This is documented as a plan execution note.

## Acceptance Criteria Verification

- [x] `bun test src/create-skills-and-agents.test.ts` exits 0
- [x] `src/cli/model-default-chains.ts` has `company` entry in `ROLE_FALLBACKS`
- [x] Company default resolution proven by tests to return `github-copilot/gpt-5.4` when Copilot availability is true
- [x] Shared fallback metadata preserves `variant: 'medium'` for Company
- [x] `agents.company.reasoning_effort` from Plan 01 treated as normalized config contract for R3 downstream
- [x] `src/create-skills-and-agents.ts` uses `config.agents?.[agent.role]` for Company and specialists alike
- [x] `config.agents.company.model` override proven by tests
- [x] `config.agents.company.instructions` override proven by tests
- [x] Specialist override still works in same config object

## Known Stubs

None — all behaviors tested and wired. `agents.company.reasoning_effort` is an intentional deferred contract: it exists in the config schema (from 01-01) and is preserved for later runtime-consumption phases. It is not a stub — it is a defined schema property pending enforcement.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Only test file modified. Threat mitigations T-02-01 and T-02-02 are satisfied: Company defaults encoded in shared fallback chain (proven by tests), and Company + specialist override coexistence is regression-tested.

## Self-Check: PASSED

- `src/create-skills-and-agents.test.ts` ✓ (8 tests, 6 new assertions vs prior 2 tests)
- Commits verified: 3685a7f, c57d600, 84631b1, e2b3d4c — all present in git log
- `bun run test` → 824 pass, 0 fail ✓
- `bun run typecheck` → clean ✓
