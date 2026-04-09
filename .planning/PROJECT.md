# The Company Orchestrator for gstack

## What This Is

This project evolves `@nntoan/gstack` from a visible multi-agent OpenCode plugin into a single elegant front door called **The Company**. Instead of asking users to choose between 13 built-in agents or remember workflow commands, The Company becomes the default UI-facing orchestrator: it checks runtime artifacts, interviews the user, offers the right workflow, delegates to the right hidden specialist, and brings approvals and questions back to the user in a guided way.

The product remains a Bun-first OpenCode plugin plus CLI for structured engineering workflows, but the UX shifts from "pick the right agent/command" to "talk to The Company and let it route the lifecycle for you." This is for developers who want the power of the current gstack system without the cognitive overhead of understanding its internal personas or command choreography.

## Core Value

Users should be able to start with a vague software task or idea and move through the right engineering lifecycle without needing to know which agent or slash command to invoke.

## Requirements

### Validated

- ✓ The plugin can load config, create skills and agents, assemble managers, build an orchestrator, register hooks/tools, and return OpenCode handlers via `src/index.ts` — existing
- ✓ gstack already supports configurable built-in agents and per-agent model/instruction overrides through `src/create-skills-and-agents.ts` and `src/types/config.ts` — existing
- ✓ gstack already intercepts chat messages, classifies intent, delegates to an agent + skills package, stores delegation state, and injects orchestration context into the system prompt via `src/plugin-interface.ts` and `src/features/orchestrator/` — existing
- ✓ gstack already has persistent plugin runtime state facilities through `src/features/workspace-state/` and cross-cutting orchestration hooks via `src/create-hooks.ts` — existing
- ✓ The Company writes canonical runtime artifacts only under `.gstack/orchestrator/` through native gstack helpers — validated in Phase 2
- ✓ A native Company runtime artifact model now exists with snapshot, append-only log, checkpoint, and migration-safe Boulder fallback behavior — validated in Phase 2
- ✓ Recovery, progress, and sprint-status flows now consume canonical Company state while preserving explicit legacy compatibility — validated in Phase 2
- ✓ Phase 2 added TDD-backed coverage for Company storage, migration, continuity, and sprint tooling boundaries — validated in Phase 2
- ✓ Company-mode system prompts now project only The Company while preserving explicit legacy-multi fallback — validated in Phase 3
- ✓ Canonical Company workflow state now persists decision waits, deferred routing context, retry lineage, and hidden execution trace metadata — validated in Phase 3
- ✓ Company-mode runtime now asks, confirms, retries, debugs, and resumes through `src/plugin-interface.ts` without exposing hidden specialist names by default — validated in Phase 3
- ✓ Company-facing recovery, progress, and delegation hints now use Company wording and gate debug trace behind explicit visibility — validated in Phase 3

### Active

- [ ] Bind delayed approvals and resumed sessions to canonical Company checkpoints without duplicate work
- [ ] Make interruption, pause, and delayed-answer recovery deterministic across restarts and stale session state
- [ ] Make The Company check for required runtime artifacts first, similar in spirit to GSD bootstrap flows, before deciding how to route the user
- [ ] Shift the user experience from command-first / agent-first to question-driven workflow packaging, while keeping a reduced core command surface for power users
- [ ] Support round-tripping specialist questions and approvals back through The Company so delegated sessions can pause for user decisions and resume with full context
- [ ] Rebuild only the _concepts_ from GSD that fit native gstack architecture, instead of transplanting `.opencode/get-shit-done/workflows/` directly

### Out of Scope

- Directly porting `.opencode/get-shit-done/workflows/*.md` into product runtime as the implementation model — current gstack should stay the source of architectural truth
- Keeping the current 13-agent UI as the default experience — this redesign intentionally reduces visible agent choice
- Making The Company a god-agent that directly performs all specialist work itself — delegation remains a core architectural boundary

## Context

This is a brownfield redesign on top of the existing `@nntoan/gstack` plugin. The current architecture already provides the right foundations:

- `src/index.ts` is the composition root: config load → skills/agents → managers → orchestrator → tools/hooks → plugin interface
- `src/plugin-handlers/config-handler.ts` determines which agents and commands are registered into the OpenCode host config, so it is the key UI-visibility control point
- `src/plugin-interface.ts` is the current orchestration boundary where user text is read, classified, delegated, and turned into system-prompt context
- `src/features/orchestrator/intent-classifier.ts`, `intent-patterns.ts`, and `delegation-engine.ts` currently implement lightweight routing based on regex patterns, phase mapping, and agent defaults
- `src/create-hooks.ts` and `src/features/workspace-state/` provide the most promising extension points for Company-owned runtime state and lifecycle continuity

The existing product today advertises 13 built-in agents in `README.md` and config examples, and the visible UI exposure flows from the config handler rather than from a separate UI-only registry. That means the redesign can stay native to current gstack by changing registration and orchestration boundaries rather than inventing a second runtime.

The strongest inspiration from GSD is not its file layout but its behavior:

- bootstrap missing project/runtime context before deep work
- use guided questions and approvals instead of requiring memorized commands
- keep delegated work stateful and resumable
- treat lifecycle stages like think → plan → review → build → QA → ship as a coherent flow

However, GSD currently assumes `.planning/` artifacts and slash-command-driven workflows, while this redesign wants everything runtime-owned inside `.gstack/`. That distinction is central to the implementation.

## Constraints

- **Architecture**: The current gstack codebase is the primary implementation substrate — GSD concepts can inspire design, but `.opencode/get-shit-done/workflows/` should not be copied in as the runtime backbone
- **Runtime boundary**: The Company may write only inside `.gstack/` — this preserves a clear separation between orchestration state and normal project files
- **Configurability**: Hidden specialist agents must remain configurable through `gstack.json[c]` — model and variant control cannot be lost when UI visibility is reduced
- **UX**: The default experience must reduce user cognitive load around both agent selection and slash-command selection — that is the problem this redesign exists to solve
- **Compatibility**: Power users can still access a reduced command surface — the redesign packages workflows, but does not remove advanced escape hatches entirely
- **Safety**: Changes in `src/plugin-interface.ts`, `src/create-hooks.ts`, `src/plugin-handlers/config-handler.ts`, and `src/features/orchestrator/` are high-risk and need strong tests because they affect global plugin behavior

## Key Decisions

| Decision                                                                                                       | Rationale                                                                                                                      | Outcome           |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| Use a single visible orchestrator agent called The Company                                                     | This directly solves the current fragmented UX where users must choose among 13 visible agents                                 | Phase 1 validated |
| Keep specialist agents hidden but configurable                                                                 | Internal specialization is still valuable; only the UI surface should simplify                                                 | Phase 1 validated |
| Default The Company to GPT-5.4 medium                                                                          | This reflects the desired default balance for conversational orchestration quality                                             | Phase 1 validated |
| Store packaged workflow/runtime artifacts in `.gstack/` instead of `.planning/`                                | The redesign is for native gstack runtime behavior, not a direct GSD planning-document transplant                              | Phase 2 validated |
| Treat GSD as a concept/reference library, not the implementation substrate                                     | Current gstack already has viable extension points; importing GSD wholesale would create a second architecture                 | — Pending         |
| Put Company lifecycle control at the current plugin/orchestration boundary                                     | `src/plugin-interface.ts`, `src/create-hooks.ts`, and `src/features/orchestrator/` already mediate routing and session context | Phase 3 validated |
| Use explicit Company-safe prompt builders and hook wording instead of patching legacy specialist text in place | The visible Company surface has stricter anti-leakage guarantees than legacy multi-agent mode                                  | Phase 3 validated |
| Keep ask/confirm/delegate behavior deterministic with confidence thresholds and pending context                | This preserves existing routing primitives while adding Company-shaped lifecycle control                                       | Phase 3 validated |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-04-09 after Phase 3 completion_
