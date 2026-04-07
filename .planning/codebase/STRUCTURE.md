# Structure

## Top-level layout

The repository is organized around a single strict-TypeScript source tree in `src/`, with generated schema and packaged binaries alongside it.

Important root paths:

- `src/` — all runtime and CLI source code
- `scripts/` — build and maintenance scripts such as `scripts/build-platform.ts`, `scripts/generate-schema.ts`, and `scripts/upstream-sync.ts`
- `schemas/` — generated JSON schema output, especially `schemas/config.schema.json`
- `packages/` — platform-specific package manifests for compiled binaries
- `.github/workflows/` — CI, release, and publish automation
- `AGENTS.md`, `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `RELEASE.md` — human guidance and process docs

## Source tree map

### Core composition files

- `src/index.ts` — plugin composition root
- `src/plugin-interface.ts` — host handler implementation
- `src/plugin-config.ts` — config loading and merging
- `src/create-skills-and-agents.ts` — runtime registry assembly
- `src/create-managers.ts` — manager/service assembly
- `src/create-tools.ts` — tool registration
- `src/create-hooks.ts` — hook registration

### Agent and CLI areas

- `src/agents/` — one file per built-in agent plus `src/agents/index.ts`
- `src/cli/` — Commander program, install flow, doctor checks, and memoir refresh

High-signal CLI files:

- `src/cli/cli-program.ts`
- `src/cli/install.ts`
- `src/cli/doctor/runner.ts`

### Config and type surfaces

- `src/config/schema/` — Zod schemas split by concern
- `src/types/` — canonical shared types for agents, config, MCPs, hooks, orchestrator, skills, and quality gates
- `src/types.ts` — top-level type barrel

### Feature modules

The repo uses feature folders for most behavior:

- `src/features/orchestrator/` — intent classification and delegation
- `src/features/builtin-skills/` — built-in skill definitions and filtering
- `src/features/browser-daemon/` — Playwright-backed automation server
- `src/features/skill-adapter/` — skill template resolution and content transforms
- `src/features/skill-mcp-manager/` — MCP lifecycle and connection management
- `src/features/sprint-backlog/` — backlog integration and task/status helpers
- `src/features/workspace-state/` — `.gstack/` persistence helpers
- `src/features/analytics/` — telemetry writers and trackers
- `src/features/hooks/` — hook registry and reusable hook implementations
- `src/features/quality-gates/`, `src/features/quality-scorecard/`, `src/features/token-budget/`, `src/features/session-continuity/`, `src/features/interview/`, `src/features/tools/` — runtime support systems

### MCP adapters

`src/mcp/` contains one adapter per provider. Representative files:

- `src/mcp/websearch.ts`
- `src/mcp/context7.ts`
- `src/mcp/grep-app.ts`
- `src/mcp/contexthub.ts`
- `src/mcp/backlog-md.ts`
- `src/mcp/index.ts`

### Shared utilities

- `src/shared/logger.ts`
- `src/shared/deep-merge.ts`
- `src/shared/path-helpers.ts`

## Naming and file placement patterns

- Internal imports use explicit `.ts` extensions, e.g. `./plugin-config.ts`
- Feature modules generally expose a barrel `index.ts`
- Tests are colocated next to implementation as `*.test.ts`
- One agent per file in `src/agents/`
- One built-in skill per file in `src/features/builtin-skills/skills/`

## Generated or runtime-managed locations

- `dist/` — build output from `bun run build` and `bun run build:cli`
- `.gstack/` — runtime workspace state managed by `src/features/workspace-state/`
- `.memory/` — scratch area used by some tests and local workflows
- `schemas/config.schema.json` — regenerated via `bun run generate:schema`

## Best files for onboarding

If you need to understand the codebase quickly, start with:

1. `README.md`
2. `AGENTS.md`
3. `src/index.ts`
4. `src/plugin-interface.ts`
5. `src/features/orchestrator/index.ts`
6. `src/cli/cli-program.ts`
