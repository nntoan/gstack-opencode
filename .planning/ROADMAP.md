# ROADMAP.md — The Company Redesign

## Roadmap Goal

Deliver a brownfield evolution of gstack from a visible 13-agent experience into **one visible Company orchestrator** backed by hidden, configurable specialists and durable `.gstack/` runtime state.

This roadmap is ordered to reduce product risk in the existing codebase. It follows the strongest research recommendation: change **visibility, state, approval, and continuity** first while preserving current deterministic routing primitives.

---

## Milestone Strategy

| Milestone | Outcome                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| M1        | Visibility and config contracts are split cleanly: one visible Company, hidden specialists still configurable |
| M2        | Company runtime state is durable and canonical under `.gstack/orchestrator/`                                  |
| M3        | Company prompt/delegation flow works end-to-end without specialist leakage                                    |
| M4        | Resume, approval, and continuity flows are reliable across interruptions                                      |
| M5        | Migration, observability, docs, and regression hardening are complete                                         |

---

## Phase Plan

### Phase 1 — Public surface split

**Goal:** make Company mode the visible default without deleting the current internal specialist system.

**Status:** Complete (2026-04-07)

**Requirements:** [R1, R2, R3, R10, R11, R12]

**Plans:** 3 plans

Plans:

- [x] 01-01-PLAN.md — establish the Company agent and `agent_surface` contracts with TDD-first coverage
- [x] 01-02-PLAN.md — wire Company default-model and `agents.company` override loading without breaking specialists
- [x] 01-03-PLAN.md — enforce Company-vs-legacy host projection at the config-handler boundary

**Why first:** this delivers the product’s core UX direction with the smallest architectural shock and creates the boundary all later work depends on.

**Targets**

- Define the public Company agent contract.
- Add explicit visibility/surface config, separate from orchestration mode.
- Keep specialist runtime inventory available but hidden from host-visible registration.
- Preserve compatibility for legacy multi-agent visibility if needed.

**Likely touchpoints**

- `src/plugin-handlers/config-handler.ts`
- `src/create-skills-and-agents.ts`
- `src/types/config.ts`
- `src/config/schema/*`
- `src/agents/*`
- `README.md` and config templates later in migration phases

**Exit criteria**

- Company mode publishes only one visible host agent.
- Specialist overrides still load correctly.
- Legacy compatibility path is explicit, not accidental.
- Registration/config tests pass.

---

### Phase 2 — Company runtime artifact model

**Goal:** define and implement canonical Company-owned state under `.gstack/orchestrator/`.

**Status:** Complete (2026-04-08)

**Requirements:** [R4, R6, R7, R8, R9, R11, R12]

**Plans:** 3/3 plans complete

Plans:

- [x] 02-01-PLAN.md — define canonical Company artifact contracts and storage helpers for snapshot, log, and checkpoints
- [x] 02-02-PLAN.md — add legacy Boulder migration and a canonical Company workspace facade
- [x] 02-03-PLAN.md — switch recovery/progress/tools to canonical Company state with explicit compatibility fallback

**Why now:** visibility alone is cosmetic unless orchestration state, ownership, and recovery semantics are made durable and explicit.

**Targets**

- Introduce Company state helpers and schemas.
- Define canonical current snapshot, append-only event log, and checkpoint layout.
- Clarify artifact ownership between Company and specialists.
- Add migration bridge for legacy orchestrator state such as `boulder.json`.
- Move bootstrap/recovery state consumption onto canonical Company artifacts as the runtime foundation for later resume and approval work.

**Likely touchpoints**

- `src/features/workspace-state/*`
- `src/shared/path-helpers.ts`
- new `src/features/company/*` storage helpers

**Exit criteria**

- Canonical Company state can be read/written under `.gstack/orchestrator/`.
- Append-only decision/log trail exists.
- Migration behavior for legacy state is defined and tested.
- Artifact ownership rules are documented in code and tests.

---

### Phase 3 — Company orchestration and prompt projection

**Goal:** make runtime behavior Company-shaped while preserving deterministic routing internals.

**Status:** Complete (2026-04-09)

**Requirements:** [R5, R6, R7, R10, R12, R14]

**Plans:** 5/5 plans complete

Plans:

- [x] 03-01-PLAN.md — create Company-only prompt projection and preserve legacy prompt fallback
- [x] 03-02-PLAN.md — extend canonical Company workflow state, decision waits, and retry metadata
- [x] 03-03-PLAN.md — implement pure ambiguity policy and pending Company clarification context
- [x] 03-04-PLAN.md — wire Company ask/confirm/delegate orchestration in plugin-interface
- [x] 03-05-PLAN.md — convert recovery, progress, and trace surfaces to Company-safe runtime UX

**Why here:** once visibility and state are defined, the orchestration layer can safely project one visible identity over hidden specialists.

**Targets**

- Add a native Company policy/orchestration layer.
- Extend or wrap delegation state to track visible identity plus hidden specialist decision.
- Replace specialist-reveal prompt projection with Company-centric prompt building.
- Prevent normal UX leakage of hidden specialist names.

**Likely touchpoints**

- `src/plugin-interface.ts`
- `src/features/orchestrator/*`
- new `src/features/company/*`
- `src/create-hooks.ts`

**Exit criteria**

- Company prompt projection is active in Company mode.
- Hidden specialist identity is preserved internally but hidden by default.
- Existing phase classification still works.
- Prompt/routing tests pass.

---

### Phase 4 — Approval, pause/resume, and continuity

**Goal:** make Company-led approvals and resumable hidden-specialist workflows reliable.

**Why this is its own phase:** this is the highest user-trust boundary and the largest failure cluster identified in research.

**Targets**

- Bind approval prompts to canonical checkpoints.
- Make delayed responses and interrupted sessions resumable without duplicate work.
- Surface specialist-originated blockers as Company-framed approval or decision requests.
- Ensure resume is artifact-first, not memory-first.

**Likely touchpoints**

- `src/plugin-interface.ts`
- `src/create-hooks.ts`
- session continuity / recovery features
- quality-gate and interview-related features
- Company state/checkpoint helpers

**Exit criteria**

- Approval state transitions are explicit and idempotent.
- Resume after interruption reconstructs enough context from `.gstack/` artifacts.
- Duplicate-answer / stale-session replay tests pass.
- Users do not need to restate context after pause/resume.

---

### Phase 5 — Hardening, migration, observability, and docs

**Goal:** make the redesign safe to maintain and legible to users and developers.

**Why last:** once the runtime shape is stable, migration and documentation can be updated against the actual behavior rather than anticipated behavior.

**Targets**

- Add drift-detection and regression tests.
- Add internal traces and inspection/debug support.
- Update README, config examples, docs, and labels to match the new Company-first mental model.
- Reduce or explicitly classify any remaining legacy behavior.

**Likely touchpoints**

- `README.md`
- installer/config template sources
- tests across orchestrator/config/workspace-state areas
- telemetry/logging surfaces

**Exit criteria**

- Docs and config examples describe Company-first UX.
- Migration coverage is tested.
- Debug traces can reconstruct hidden-specialist flow without leaking by default.
- Legacy fallbacks are explicit and measured.

---

## Dependency Order

| Depends on | Needed for                                                                                |
| ---------- | ----------------------------------------------------------------------------------------- |
| Phase 1    | All later phases depend on a stable public-vs-hidden contract                             |
| Phase 2    | Phase 3 and 4 need canonical Company state and ownership rules                            |
| Phase 3    | Phase 4 needs Company-native runtime projection before reliable approval/resume can exist |
| Phase 4    | Phase 5 documentation and hardening must reflect the final lifecycle behavior             |

---

## Primary Risks to Track During Execution

1. **Config drift** between visible Company config and hidden specialist overrides.
2. **String-routing fragility** if Company mode still depends on too many untyped mappings.
3. **Hook overreach** turning hooks into a second hidden orchestrator.
4. **Approval/resume deadlocks** when user decisions arrive late or twice.
5. **`.gstack/` ownership ambiguity** causing stale or conflicting runtime state.
6. **Migration confusion** if docs and config examples lag the product behavior.

---

## Verification Strategy by Phase

| Phase | Verification focus                                                                   |
| ----- | ------------------------------------------------------------------------------------ |
| 1     | host-visible agent registration, config schema/defaults, override loading            |
| 2     | state read/write helpers, migration reads, artifact ownership and schema versioning  |
| 3     | prompt projection, hidden-specialist invisibility, routing continuity                |
| 4     | resume/recovery, approval state machine, duplicate-answer and stale-session handling |
| 5     | regression coverage, docs/config alignment, trace/debug inspectability               |

---

## Recommended Next Execution Step

Proceed to **Phase 4 — Approval, pause/resume, and continuity** now that Company-shaped prompt projection, orchestration, and Company-safe hook surfaces are complete.

The next implementation plan should explicitly answer:

1. how delayed approvals and repeated answers resume the same Company workflow without duplicate work,
2. how interruption-safe checkpointing should behave across pause/resume boundaries,
3. how specialist-originated blockers are surfaced back through The Company,
4. how continuity flows reconstruct state from `.gstack/` artifacts rather than memory,
5. and how Phase 4 proves idempotent approval/resume behavior under interruption.

---

_Drafted: 2026-04-07_
