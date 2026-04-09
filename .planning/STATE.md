---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 04
current_plan: 0
status: ready
last_updated: '2026-04-09T03:08:00.000Z'
last_activity: 2026-04-09
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 11
  completed_plans: 11
  percent: 100
---

# STATE.md — Current Planning State

## Current Status

**Status:** Phase 03 complete — ready for Phase 04

**Current Phase:** 04

**Current Plan:** 0

**Last Activity:** 2026-04-09

**Last Activity Description:** Phase 03 verification and closeout completed

- Phase 1 progress: **3 / 3 plans complete**
- Phase 2 progress: **3 / 3 plans complete**
- Phase 3 progress: **5 / 5 plans complete**
- Verification: `.planning/phases/03-company-orchestration-and-prompt-projection/03-VERIFICATION.md` — **passed**
- Next step: discuss and plan Phase 4 for approval, pause/resume, and continuity

---

## Completed So Far

### Phase 1 — Public surface split (complete)

- Completed plans:
  - `01-01-PLAN.md` — Company agent contract and `agent_surface` config
  - `01-02-PLAN.md` — Company default model and override loading
  - `01-03-PLAN.md` — Company-vs-legacy host projection at `config-handler.ts`
- Verification passed in `.planning/phases/01-public-surface-split/01-VERIFICATION.md`
- Implemented outcomes:
  - one typed internal `company` agent
  - additive `agent_surface.mode` config with `company | legacy-multi`
  - Company default model fallback chain (`github-copilot/gpt-5.4`, medium intent)
  - projection-only Company visibility at `src/plugin-handlers/config-handler.ts`
  - preserved hidden-specialist configurability and legacy multi-agent compatibility
- Validation status:
  - `bun run test` — 831 pass, 0 fail
  - `bun run typecheck` — clean
  - `bun run build:all` — clean
  - `bun run lint` — 0 errors, 1 unrelated pre-existing warning outside the phase

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

**Phases 1, 2, and 3 are complete.**

The project is ready to move from Company-shaped orchestration into **Phase 4 — Approval, pause/resume, and continuity**.

### Next planned implementation phase

**Phase 4 — Approval, pause/resume, and continuity**

Immediate planning focus:

1. bind delayed approvals and interruptions to canonical checkpoints,
2. resume the same Company workflow safely after pause/reload,
3. prevent duplicate-answer and stale-session replay paths,
4. keep specialist-originated blockers Company-voiced in the visible UX,
5. prove continuity behavior with resume/approval/replay tests.

### Phase 3 implementation result

Phase 3 is no longer planned work — it is completed and verified.

The completed implementation established these concrete contracts:

1. **Company-safe prompt projection** now shows only The Company in visible system prompt context while preserving explicit legacy-multi compatibility.
2. **Company workflow state** now persists decision waits, deferred intent, retry lineage, and hidden execution metadata under canonical Company state.
3. **Company ambiguity policy** now asks, confirms, or delegates deterministically on top of the existing classifier instead of replacing routing internals.
4. **`plugin-interface.ts`** now handles Company ask/confirm/approval, retry, debug, and interruption flows using one workflow identity.
5. **Company-facing hook surfaces** now present goal/current-step/status wording by default and gate causality-first trace output behind explicit debug visibility.

#### Phase 3 delivered change set

1. Added `src/features/company/company-prompt-builder.ts`, `company-decision-wait.ts`, and `company-ambiguity-policy.ts` plus test coverage.
2. Extended `src/features/company/types.ts`, `storage.ts`, and `src/features/workspace-state/index.ts` for decision waits and retry helpers.
3. Updated `src/features/orchestrator/system-prompt-builder.ts`, `delegation-engine.ts`, and `delegation-state.ts` for Company projection and pending clarification state.
4. Updated `src/plugin-interface.ts` and `src/plugin-interface.test.ts` for full Company-mode runtime orchestration.
5. Updated `src/create-hooks.ts`, continuity hooks, and scorecard hooks for Company-safe progress, recovery, and debug-trace behavior.
6. Verified the phase in `.planning/phases/03-company-orchestration-and-prompt-projection/03-VERIFICATION.md` with 12/12 must-have truths passing.

### Phase 2 implementation result

Phase 2 is no longer planned work — it is completed and verified.

The completed implementation established these concrete contracts:

1. **Canonical Company artifact contract** now exists under `.gstack/orchestrator/` through typed snapshot, append-only log, and checkpoint helpers.
2. **Migration-safe fallback** reads canonical `state.json` first and legacy `boulder.json` second through `workspaceState.company.readResolved()`.
3. **Artifact ownership** is encoded in Company-specific runtime types instead of scattered string assumptions.
4. **Runtime consumers** such as recovery, progress, delegation context, and sprint tools now prefer canonical Company state.
5. **Compatibility remains explicit** because legacy Boulder state is mirrored only when it already exists and is never reintroduced for canonical-only workspaces.

#### Phase 2 delivered change set

1. Added `src/features/company/types.ts`, `src/features/company/storage.ts`, and `src/features/company/index.ts` for canonical Company runtime artifacts.
2. Added `src/features/company/migration.ts` and surfaced a `workspaceState.company` facade from `src/features/workspace-state/index.ts`.
3. Updated `src/features/session-continuity/*`, `src/create-hooks.ts`, and `src/features/tools/sprint-tools.ts` to consume canonical Company state.
4. Added migration, storage, continuity, and sprint-tool tests covering canonical-first behavior and Boulder fallback.
5. Verified the phase in `.planning/phases/02-company-runtime-artifact-model/02-VERIFICATION.md` with 9/9 must-have truths passing.

---

## Open Questions That Still Need Resolution During Execution

1. Exact delayed-approval resume contract across interruptions and stale session restarts.
2. Exact checkpoint lifecycle for paused Company workflows when user input arrives much later.
3. Exact replay protections for duplicate answers, retries, and stale decision contexts in Phase 4.
4. Which expert-mode commands remain in v1.

These are roadmap execution details for the next phase, not blockers for beginning Phase 4 planning.

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

### Key codebase touchpoints for the next implementation phase

- `src/plugin-interface.ts`
- `src/features/orchestrator/*`
- `src/create-hooks.ts`
- `src/features/company/*`
- prompt-building and delegation-state seams proven in Phase 2 consumers

---

## What Should Happen Next

The next useful step is to convert **Phase 4** from roadmap text into a codebase-grounded context and implementation plan.

That next pass should:

1. inspect how canonical Company checkpoints and pending waits are currently written and cleared,
2. inspect how session deletion, retry, and delayed answers behave across restarts,
3. decide the minimum idempotent approval/resume contract for pause/reload safety,
4. identify the tests needed before changing continuity behavior,
5. then produce a Phase 4 implementation plan.

### Phase 1 implementation result

Phase 1 is no longer a plan — it is completed work.

The completed implementation established these concrete contracts:

1. **Runtime agent inventory** includes `company` in `src/agents/index.ts` and keeps a single internal registry.
2. **Runtime agent overrides** continue to flow through `src/create-skills-and-agents.ts` from `config.agents?.[role]`, including `agents.company`.
3. **Host-visible agent projection** in `src/plugin-handlers/config-handler.ts` now branches on `agent_surface.mode`.
4. **Company visibility** is projection-only and no longer coupled to `disabled_agents`.
5. **Legacy compatibility** remains explicit via `agent_surface.mode = 'legacy-multi'`.

#### Phase 1 delivered change set

1. Added `src/agents/company.ts` and registered `company` in the runtime registry.
2. Extended config schema/types with `agent_surface.mode` and `reasoning_effort` support.
3. Added Company default fallback chain support in `src/cli/model-default-chains.ts`.
4. Updated `src/plugin-handlers/config-handler.ts` so Company mode publishes only the Company agent to host `config.agent`.
5. Added and updated tests for registry, schema, override loading, and host projection.

#### Phase 1 guardrails that remain important

- Do not remove specialist agents from runtime composition yet.
- Do not change orchestrator routing logic yet.
- Do not make `.planning/` part of runtime behavior.
- Keep `disabled_agents` separate from Company-mode visibility control.
- Prefer additive evolution over breaking migration.

---

## Pause / Resume Note

If work resumes later, start from these files in order:

1. `.planning/STATE.md`
2. `.planning/ROADMAP.md`
3. `.planning/phases/01-public-surface-split/01-VERIFICATION.md`
4. `.planning/phases/01-public-surface-split/01-03-SUMMARY.md`
5. `.planning/phases/03-company-orchestration-and-prompt-projection/03-VERIFICATION.md`
6. files relevant to the active next phase

---

## Key Decisions Made During Execution

- **D-impl-01**: Company `sprintPhase: 'cross-cutting'` — orchestrator is always available, not bound to a sprint phase
- **D-impl-02**: `ROLE_FALLBACKS['company']` = COMPANY_CHAIN (gpt-5.4 medium, github-copilot preferred) per R3
- **D-impl-03**: `agent_surface` defaults to `{ mode: 'company' }` via Zod `.default()` — migration-safe for all existing configs
- **D-impl-04**: `createSkillsAndAgents` generic `config.agents?.[agent.role]` path handles Company without special-casing — satisfies D-01 and D-08

---

_Updated: 2026-04-09_
