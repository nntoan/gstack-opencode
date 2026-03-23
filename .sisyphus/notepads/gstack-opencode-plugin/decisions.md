# Decisions — gstack-opencode-plugin

## [2026-03-22] Session: ses_2e9ccfa55ffeqn22QiJatmdVrw — Plan Start

### Architecture Decisions

1. Follow oh-my-openagent patterns EXACTLY (no novel patterns)
2. Config: JSONC + Zod v4 (not Zod v3)
3. MCP connections: lazy/on-demand only (never at plugin load time)
4. Agent model: not hard-coded, user-configurable via config overrides
5. Sprint workflow: NOT a state machine — orchestrator classifies intent and delegates
6. Backlog.md: treated as a TOOL (graceful degradation if unavailable)
7. Skills: must all pass through transformSkillContent() — no verbatim SKILL.md copies
8. Mode switch: "multi-agent" (default) vs "skills-only" (backward compat)
9. Telemetry: local JSONL only (Supabase deferred)

### Wave Execution Plan

- Wave 1: T1, T2, T3, T4, T5 (parallel — foundation)
- Wave 2: T6, T7, T8, T9, T32, T33 (parallel — core infrastructure)
- Wave 3: T10, T11, T12, T13, T14 (parallel — skills batch 1)
- Wave 4: T15, T16, T17, T18, T19 (parallel — skills batch 2 + agents)
- Wave 5: T20, T21, T22, T23, T24, T25, T26, T34 (parallel — orchestrator + integration)
- Wave 6: T27, T28, T29, T30, T31, T35 (parallel — build + distribution)
- Final: F1, F2, F3, F4 (parallel — verification)

## [2026-03-23] Task 20: Intent Classifier Decisions

- Kept classifier fully deterministic with regex + mapping rules to satisfy no-LLM requirement.
- Stored phase patterns in Map<SprintPhase, RegExp[]> to enforce full phase coverage and maintain stable iteration order for tie resolution.
- Used top-3 suggested skills per phase to balance relevance and compactness; explicit command skill is always first when present.
- In multi-phase ties, selected first winner by map order and lowered confidence to ambiguity band instead of random or context-dependent selection.

## [2026-03-23] Task 22: SkillMcpManager Decisions

- Chose simplified manager state shape for gstack task scope: `Map<string, Client>` plus pending/disconnected/disposed fields only (no OAuth provider state or cleanup interval).
- Adopted SDK transport routing strictly from `McpServerConfig.type`: `stdio` -> `StdioClientTransport`, `remote` -> `StreamableHTTPClientTransport`.
- Kept operation APIs (`listTools`, `listResources`, `callTool`, `readResource`) behind unified retry wrapper to standardize reconnect behavior on "not connected" errors.

## [2026-03-23] Task 34: Sprint-backlog integration decisions

- Kept `BacklogClient` as the sole MCP boundary and made every method non-throwing via `withBacklogFallback`, so orchestrator consumers can treat backlog integration as optional capability.
- Added availability gate in `ThinkPlanTaskCreator.createSprintTasks` to avoid unnecessary create calls when backlog MCP is down.
- Implemented ship-readiness logic as pure task-status aggregation (`done`/`archived` semantics) with 100% default for empty backlog to preserve deterministic release decisions.

## [2026-03-23] Task 26: Workspace state manager decisions

- Implemented boulder persistence with sync `node:fs` to match reference behavior, while session/review/notepad flows use async `node:fs/promises` per task requirements.
- Chose tolerant file-read behavior (`null`/empty array/empty string fallback) for corrupted or missing JSON state files to keep orchestrator recovery paths safe.
- `createWorkspaceState` returns a narrow composed facade (`boulder`, `plans`, `sessions`, `reviews`, `notepads`, `ensureDir`) without embedding business logic in the barrel module.
