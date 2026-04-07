# Architecture

## System shape

`@nntoan/gstack` is a Bun-first OpenCode plugin plus CLI. The runtime centers on a composition-root plugin entry in `src/index.ts` and a separate Commander CLI entry in `src/cli/cli-program.ts`.

The plugin boot sequence in `src/index.ts` is the clearest architectural backbone:

1. Load config with `loadPluginConfig()` from `src/plugin-config.ts`
2. Ensure workspace state directories with `ensureWorkspaceDir()` from `src/features/workspace-state/index.ts`
3. Build the active skill set and agent set via `createSkillsAndAgents()` in `src/create-skills-and-agents.ts`
4. Assemble cross-cutting managers with `createManagers()` in `src/create-managers.ts`
5. Build intent classification and delegation with `createOrchestrator()` in `src/features/orchestrator/index.ts`
6. Register tools through `createTools()` in `src/create-tools.ts`
7. Register hooks through `createHooks()` in `src/create-hooks.ts`
8. Return host-facing handlers from `createPluginInterface()` in `src/plugin-interface.ts`

## Core runtime layers

### 1. Configuration layer

- `src/plugin-config.ts` loads user config from `~/.config/opencode/gstack.jsonc` and optional project config from `.opencode/gstack.jsonc`
- `src/config/schema/main.ts` is the top-level Zod schema for orchestration, agents, categories, MCPs, backlog, browser, telemetry, and token budget
- `src/config/merge-configs.ts` and `src/shared/deep-merge.ts` normalize user + project overrides before runtime wiring

### 2. Skill and agent registry layer

- `src/features/builtin-skills/skills.ts` filters the built-in skill catalog by preset, browser availability, and disabled-skill config
- `src/agents/index.ts` builds the active agent list from the 13 built-in agents and honors `skills-only` mode by returning no agents
- `src/create-skills-and-agents.ts` is the join point where config-driven defaults become the final runtime skill/agent set

### 3. Orchestration layer

- `src/features/orchestrator/intent-classifier.ts` maps chat text to a `ClassifiedIntent`
- `src/features/orchestrator/intent-patterns.ts` is the source of truth for phase patterns, skill-to-phase mapping, and default agent assignment
- `src/features/orchestrator/delegation-engine.ts` turns classified intent into an agent + skill package
- `src/plugin-interface.ts` applies orchestration during `chat.message` handling and stores session delegation in `DelegationStateManager`

This means the orchestrator is pure decision logic, while `plugin-interface.ts` is the boundary where OpenCode events become delegated work.

### 4. Manager and service layer

- `src/create-managers.ts` assembles `SkillMcpManager`, `DeferredMcpInvoker`, sprint backlog helpers, workspace state, analytics, and config handling
- `src/features/skill-mcp-manager/connection.ts` owns MCP client transport creation and retry logic for local, stdio, and remote servers
- `src/features/sprint-backlog/index.ts` wraps backlog access behind `client`, `taskCreator`, `statusUpdater`, and `shipChecker`
- `src/features/workspace-state/index.ts` exposes persistent state for boulder sessions, plans, reviews, notepads, and sessions

### 5. Hooks and tools layer

- `src/features/tools/index.ts` exposes the tool surface: `save-plan`, `load-plan`, `plan-progress`, `notepad`, `sprint-status`, `record-review`, and `ship-readiness`
- `src/create-hooks.ts` composes hook families for output truncation, agent-context injection, interview mode, quality gates, token budgets, session continuity, and quality scorecards

Hooks are additive middleware around host events; tools are user-facing capabilities registered into OpenCode.

## Key subsystems

### Browser daemon

`src/features/browser-daemon/server.ts` starts a localhost Playwright-backed automation server, writes a state file, authenticates requests with a bearer token, and dispatches commands to read, write, or meta handlers. This subsystem is intentionally isolated because it is platform-sensitive and security-sensitive.

### CLI

`src/cli/cli-program.ts` wires `install`, `doctor`, and `memoir:refresh`. The CLI side is simpler than the plugin path and mostly delegates into files under `src/cli/`.

## Architectural patterns

- Composition root pattern at `src/index.ts`
- Factory/barrel pattern across `src/create-*.ts`, `src/agents/index.ts`, and feature `index.ts` files
- Config-driven behavior using Zod schemas and per-agent/per-skill overrides
- Event + hook architecture in `src/plugin-interface.ts` and `src/create-hooks.ts`
- Service aggregation in `src/create-managers.ts` instead of ad hoc cross-feature imports

## Entry points to know before changes

- Plugin startup: `src/index.ts`
- OpenCode integration boundary: `src/plugin-interface.ts`
- Delegation logic: `src/features/orchestrator/delegation-engine.ts`
- Hook registration: `src/create-hooks.ts`
- Tool registration: `src/create-tools.ts`
- CLI entry: `src/cli/cli-program.ts`
