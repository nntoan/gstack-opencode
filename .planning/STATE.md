# STATE.md — Current Planning State

## Current Status

**Phase 1 — Public surface split** is in active execution.

Plans 01-01 and 01-02 are complete. Plan 01-03 (Company-vs-legacy host projection at the config-handler boundary) is the next execution target.

- Phase 1 progress: **2 / 3 plans complete**
- Next plan: `01-03-PLAN.md` — enforce Company-vs-legacy host projection at `config-handler.ts`

---

## Completed So Far

### Phase 1 — Plan 01: Company agent contract and agent_surface config (01-01)

- Created `src/agents/company.ts` — role: 'company', name: 'The Company', sprintPhase: cross-cutting
- Added `'company'` to `AgentRole` union in `src/types/agent.ts`
- Registered `companyAgent` in `ALL_AGENTS` in `src/agents/index.ts` (total: 14 agents)
- Added `AgentSurfaceMode`, `AgentSurfaceConfig`, `reasoning_effort` to `src/types/config.ts`
- Added `AgentSurfaceSchema` with default `{ mode: 'company' }` to `src/config/schema/main.ts`
- Added `COMPANY_CHAIN` (gpt-5.4 medium, github-copilot preferred) to `ROLE_FALLBACKS`
- Full TDD coverage; 818 tests pass; typecheck clean

### Phase 1 — Plan 02: Company default model and override loading (01-02)

- Expanded `src/create-skills-and-agents.test.ts` with 6 new assertions:
  - Company resolves to `github-copilot/gpt-5.4` when Copilot available
  - `COMPANY_CHAIN` preserves `variant: 'medium'`
  - Specialists unchanged by Company chain addition
  - `config.agents.company.model` override works
  - `config.agents.company.instructions` override works
  - Company and specialist overrides coexist in same config payload
- No new implementation needed — COMPANY_CHAIN and generic `config.agents?.[agent.role]` path were already sufficient
- Full test suite: 824 pass, 0 fail; typecheck clean

### Initialization and context gathering

- Confirmed this repo is a brownfield project.
- Confirmed a codebase map already existed under `.planning/codebase/`.
- Confirmed the repo did not yet have a full project-level planning set before this work.

### Vision capture

- Created `.planning/PROJECT.md` for the redesign.
- Captured the accepted product direction:
  - one visible UI-facing orchestrator named The Company,
  - hidden configurable specialists,
  - `.gstack/` as the runtime artifact boundary,
  - selective reuse of GSD concepts only where they match current gstack architecture,
  - Company default target of GPT-5.4 with medium reasoning/variant intent.

### Research

- Created `.planning/research/STACK.md`
- Created `.planning/research/FEATURES.md`
- Created `.planning/research/ARCHITECTURE.md`
- Created `.planning/research/PITFALLS.md`
- Created `.planning/research/SUMMARY.md`

### Planning outputs

- Created `.planning/REQUIREMENTS.md`
- Created `.planning/ROADMAP.md`
- Created `.planning/STATE.md`

---

## Planning Configuration

From `.planning/config.json`:

- `mode: interactive`
- `granularity: standard`
- `parallelization: true`
- `commit_docs: false`
- `workflow.research: true`
- `workflow.plan_check: true`
- `workflow.verifier: true`
- `workflow.nyquist_validation: true`

### Important implication

Planning docs should remain local and should not be treated as runtime product artifacts.

---

## Accepted Product Direction

### Core contract

- The default OpenCode surface becomes **The Company**.
- Hidden specialists continue to exist internally.
- Hidden specialists remain configurable in `gstack.json[c]`.
- The Company delegates; it does not become a god-agent.
- Runtime-owned artifacts live in `.gstack/`, not `.planning/`.

### v1 implementation stance

- Keep current deterministic classifier/delegation primitives.
- Change visibility, state, prompt projection, approval, and continuity before considering a smarter router.
- Extend native gstack seams instead of transplanting GSD runtime workflows.

---

## Current Roadmap Position

The project is ready to move from research/planning setup into **Phase 1 planning and execution preparation**.

### Next planned implementation phase

**Phase 1 — Public surface split**

Immediate planning focus:

1. define the public Company agent contract,
2. define visibility/surface config,
3. preserve hidden specialist configurability,
4. keep legacy compatibility explicit,
5. identify exact code touchpoints for Phase 1.

---

## Open Questions That Still Need Resolution During Execution

1. Exact config shape for Company mode (`company`, `agent_surface`, or both).
2. Exact runtime support path for `medium` reasoning/variant.
3. Exact migration window and fallback behavior for `boulder.json` compatibility.
4. Which expert-mode commands remain in v1.

These are roadmap execution details, not blockers for beginning implementation planning.

---

## Active Files

### Planning source of truth

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

### Research backing

- `.planning/research/SUMMARY.md`
- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`

### Key codebase touchpoints for the first implementation phase

- `src/plugin-handlers/config-handler.ts`
- `src/create-skills-and-agents.ts`
- `src/types/config.ts`
- `src/config/schema/`
- `src/plugin-interface.ts`
- `src/features/orchestrator/`
- `src/create-hooks.ts`
- `src/features/workspace-state/`

---

## What Should Happen Next

The next useful step is to convert **Phase 1** from roadmap text into an implementation plan against the real codebase.

That next pass should:

1. inspect the current public agent registration path in detail,
2. inspect current config schema and override loading,
3. decide the minimum additive config shape for Company mode,
4. identify tests to add before touching behavior,
5. then produce a Phase 1 implementation plan.

### Phase 1 implementation plan now grounded in code

The initial code inspection confirmed these concrete Phase 1 seams:

1. **Runtime agent inventory** is created in `src/agents/index.ts` and filtered by `createGstackAgents()`.
2. **Runtime agent overrides** are applied in `src/create-skills-and-agents.ts` from `config.agents?.[role]`.
3. **Host-visible agent projection** is centralized in `src/plugin-handlers/config-handler.ts`, especially:
   - `agentsToOpenCodeAgentConfig()`
   - `applyAgentConfig()`
4. **Current coupling problem**: `disabled_agents` currently affects both runtime availability and host visibility.
5. **Existing unused seam**: `AgentOverrideConfig.enabled` exists in schema/types but is not currently enforced by runtime or host projection logic.

This means Phase 1 should be implemented as a **visibility split**, not a runtime rewrite.

#### Proposed Phase 1 change set

1. Add a new public agent definition for `company` under `src/agents/company.ts`.
2. Add `company` to `src/agents/index.ts` so it becomes part of the runtime registry.
3. Extend config schema/types additively for a Company-facing surface mode, likely via a new `agent_surface` config object rather than overloading `orchestration_mode`.
4. Update `src/plugin-handlers/config-handler.ts` so Company mode publishes only the public Company agent to host `config.agent` while preserving hidden specialist overrides in plugin config/runtime.
5. Decide whether `AgentOverrideConfig.enabled` should become the first explicit host-visibility control, or whether host visibility should instead be governed entirely by the new `agent_surface` mode. Current evidence suggests `disabled_agents` should stop carrying both meanings.
6. Add/adjust tests in:
   - `src/plugin-handlers/config-handler.test.ts`
   - `src/create-skills-and-agents.test.ts`
   - schema/config tests for any new config shape

#### Phase 1 design guardrails

- Do not remove specialist agents from runtime composition yet.
- Do not change orchestrator routing logic yet.
- Do not make `.planning/` part of runtime behavior.
- Do not rely on `disabled_agents` alone for Company-mode visibility, because that would also disable specialists internally.
- Prefer additive config evolution over breaking migration.

---

## Pause / Resume Note

If work resumes later, start from these files in order:

1. `.planning/STATE.md`
2. `.planning/ROADMAP.md`
3. `.planning/phases/01-public-surface-split/01-03-PLAN.md`
4. `.planning/phases/01-public-surface-split/01-CONTEXT.md`
5. `src/plugin-handlers/config-handler.ts` and `src/plugin-handlers/config-handler.test.ts`

---

## Key Decisions Made During Execution

- **D-impl-01**: Company `sprintPhase: 'cross-cutting'` — orchestrator is always available, not bound to a sprint phase
- **D-impl-02**: `ROLE_FALLBACKS['company']` = COMPANY_CHAIN (gpt-5.4 medium, github-copilot preferred) per R3
- **D-impl-03**: `agent_surface` defaults to `{ mode: 'company' }` via Zod `.default()` — migration-safe for all existing configs
- **D-impl-04**: `createSkillsAndAgents` generic `config.agents?.[agent.role]` path handles Company without special-casing — satisfies D-01 and D-08

---

_Updated: 2026-04-07_
