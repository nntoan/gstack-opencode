# AGENTS.md

**Generated:** 2025-04-02 | **Commit:** a2bb5d7 | **Branch:** main

## Overview

OpenCode plugin (`@nntoan/gstack`) + CLI that provides a multi-agent engineering workflow. Ships 13 agents, 25 built-in skills, orchestrator (intent → agent → skill delegation), MCP integrations, browser daemon, and sprint backlog. Bun runtime, TypeScript strict mode, ESM only.

## Structure

```
./
├── src/
│   ├── index.ts                  # Plugin entry — composition root
│   ├── plugin-interface.ts       # Runtime handlers (chat.message, event, tool, config)
│   ├── plugin-config.ts          # Config loader (~/.config/opencode/gstack.jsonc)
│   ├── create-skills-and-agents.ts  # Skill + agent factory
│   ├── create-managers.ts        # Manager aggregate factory
│   ├── create-tools.ts           # Tool registration (extension point)
│   ├── create-hooks.ts           # Hook registration (extension point)
│   ├── types.ts                  # Public type barrel
│   ├── agents/                   # 13 agent definitions (→ see agents/AGENTS.md)
│   ├── cli/                      # CLI: install, doctor (→ see cli/AGENTS.md)
│   ├── config/                   # Config schema + validation (Zod)
│   ├── features/
│   │   ├── orchestrator/         # Intent classification + delegation (→ see orchestrator/AGENTS.md)
│   │   ├── builtin-skills/       # 25 skill definitions (→ see builtin-skills/AGENTS.md)
│   │   ├── browser-daemon/       # Browser automation server (→ see browser-daemon/AGENTS.md)
│   │   ├── skill-adapter/        # Skill template resolution + content transformation
│   │   ├── skill-mcp-manager/    # MCP client lifecycle manager (SkillMcpManager class)
│   │   ├── sprint-backlog/       # Backlog MCP wrapper + task creators
│   │   ├── workspace-state/      # Persisted session/boulder/plan state
│   │   └── analytics/            # Telemetry writers + trackers
│   ├── mcp/                      # MCP provider adapters (websearch, context7, grep-app, etc.)
│   ├── plugin-handlers/          # Config + MCP config handlers for OpenCode host
│   ├── shared/                   # Logger, deep-merge, path helpers
│   └── types/                    # Core type definitions (agent, skill, config, mcp, orchestrator)
├── scripts/                      # Build-platform, generate-schema, upstream-sync
├── schemas/                      # JSON Schema for plugin config
├── packages/                     # Platform-specific binary packages (darwin, linux, windows)
└── .github/workflows/            # CI, release-please, publish, publish-platform
```

## Where to Look

| Task                    | Location                                         | Notes                                                                          |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Plugin startup flow     | `src/index.ts`                                   | loadConfig → skills+agents → managers → orchestrator → tools/hooks → interface |
| Add/modify agent        | `src/agents/{role}.ts`                           | Export from `index.ts`, added to `ALL_AGENTS`                                  |
| Add/modify skill        | `src/features/builtin-skills/skills/{name}.ts`   | Export from `skills/index.ts`                                                  |
| Change delegation logic | `src/features/orchestrator/delegation-engine.ts` | Maps intent → phase → agent → skills                                           |
| Change intent patterns  | `src/features/orchestrator/intent-patterns.ts`   | Phase patterns, skill-to-phase map                                             |
| CLI commands            | `src/cli/cli-program.ts`                         | Commander-based; add `.command()`                                              |
| Config schema           | `src/config/schema/`                             | Zod schemas; `bun run generate:schema` regenerates JSON                        |
| MCP adapters            | `src/mcp/`                                       | Each file = one provider adapter                                               |
| Browser automation      | `src/features/browser-daemon/`                   | Platform-specific, security-sensitive                                          |
| Plugin config loading   | `src/plugin-config.ts`                           | Reads `~/.config/opencode/gstack.jsonc`                                        |

## Runtime Wiring (Boot Sequence)

```
GstackPlugin(ctx)
  → loadPluginConfig(ctx.directory)
  → createSkillsAndAgents(config)       // filters by disabled_agents/disabled_skills
  → createManagers({ctx, config, skills, agents})  // SkillMcpManager + configHandler + sprintBacklog
  → createOrchestrator({agents, skills, config})
  → createTools / createHooks           // extension points (currently empty)
  → createPluginInterface(...)          // returns handler object to OpenCode host
```

## Commands

```bash
# Dev
bun install
bun run build          # Library → dist/index.js
bun run build:cli      # CLI → dist/cli.js
bun run build:all      # Both
bun run typecheck      # tsc --noEmit
bun run test           # bun test (vitest API via bun runner)
bun run lint           # eslint .
bun run lint:fix       # eslint . --fix
bun run format         # prettier --write .

# Single test
bun test {glob}        # e.g. bun test intent-classifier

# Full CI loop
bun run test && bun run typecheck && bun run lint && bun run build:all

# mise aliases (optional)
mise run build | test | lint | lint:fix | format
```

## Code Style

### Imports

- ES6 `import`/`export` only (ESM, `"type": "module"`)
- Group: external libraries first, then internal
- **Explicit `.ts` extensions** on internal imports (required for Bun ESM resolution)

### Formatting (Prettier — enforced as lint error)

- Single quotes, semicolons, 100 char width, 2-space indent, ES5 trailing commas, always parens on arrows

### TypeScript

- `strict: true`, target ESNext, bundler module resolution
- NeverNesters: exit early, avoid deep nesting
- PascalCase classes, camelCase methods/properties
- Union types for status strings (not enums)
- Prefer explicit type annotations over inference

### Error Handling

- `error instanceof Error ? error.message : String(error)` — always check type
- `[ERROR]` prefix in log messages
- Never swallow errors silently (`.catch(() => {})` exists in browser-daemon but is a known tech debt)

### Linting

- `no-console: error` — use `log()` from `shared/logger.ts` instead
- `@typescript-eslint/no-explicit-any: warn`
- `prettier/prettier: error`

## Testing

- Runner: `bun test` (Bun test runner, vitest-compatible API)
- Imports: `import { describe, it, expect } from 'bun:test'` or `from 'vitest'`
- Pattern: colocated `*.test.ts` next to implementation
- Mocking: hand-rolled fakes via dependency injection (no mock libraries)
- FS tests: use `.memory/` or `os.tmpdir()` for isolation, clean up in `afterEach`
- No vitest.config file — defaults only

## Anti-Patterns (This Project)

- **No `console.*`** — `no-console` is an error; use `log()` from shared/logger
- **No `as any` / `@ts-ignore`** — one `@ts-expect-error` in tests only
- **No find-and-replace renaming** — use `gitnexus_rename` (call graph aware)
- **No edits without impact analysis** — run `gitnexus_impact` first
- **No shell interpolation of user input** — hardcode command args (see cookie-import-browser.ts)
- **No force-push, no skipping tests** — enforced in ship/release skills

## Tooling

| Tool           | Version      | Purpose                                     |
| -------------- | ------------ | ------------------------------------------- |
| Bun            | 1.3.2 (mise) | Runtime, bundler, test runner               |
| TypeScript     | ^5.7         | Type checking (`tsc --noEmit`)              |
| ESLint         | ^9.39        | Linting (flat config)                       |
| Prettier       | ^3.2         | Formatting                                  |
| Commander      | ^14.0        | CLI framework                               |
| Zod            | ^4.1         | Config schema validation                    |
| MCP SDK        | ^1.25        | Model Context Protocol client               |
| Playwright     | >=1.40       | Optional peer dep for browser-daemon        |
| Release Please | CI           | Automated releases via conventional commits |

## Notes

- `create-tools.ts` and `create-hooks.ts` return `{}` — intentional extension stubs
- Platform binaries built via `scripts/build-platform.ts` → `bun build --compile`
- Config lives at `~/.config/opencode/gstack.jsonc` — loaded by `plugin-config.ts`
- `researchs/` is a reference folder — not part of the build/test/lint scope
- `.memory/` is gitignored scratch space for tests and temp data

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **gstack-opencode** (1020 symbols, 2787 relationships, 70 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/gstack-opencode/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/gstack-opencode/context` | Codebase overview, check index freshness |
| `gitnexus://repo/gstack-opencode/clusters` | All functional areas |
| `gitnexus://repo/gstack-opencode/processes` | All execution flows |
| `gitnexus://repo/gstack-opencode/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
