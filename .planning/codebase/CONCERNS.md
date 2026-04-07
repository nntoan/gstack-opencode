# Concerns

## Highest-signal concerns

### 1. Browser-daemon reliability debt

`src/features/browser-daemon/AGENTS.md` explicitly records known technical debt in the Playwright daemon:

- silent cleanup catches with `.catch(() => {})`
- `Bun.sleep(100)` timing assumptions in crash/startup flows
- ad hoc retry logic rather than a shared retry helper
- macOS-oriented platform assumptions around `security` and `open`

This area is both platform-sensitive and security-sensitive, so small regressions can become hard-to-reproduce failures.

### 2. Hook complexity and cross-cutting coupling

`src/create-hooks.ts` registers a large number of hook families in one place: truncation, injection, interview mode, quality gates, token budget, session continuity, scorecards, sprint logs, skill usage, and session tracking.

The central registration is good for visibility, but it also means behavior can become difficult to reason about when multiple hooks interact on the same event. Changes here should be treated as system-wide behavior changes rather than local edits.

### 3. Orchestrator correctness risk is pattern-driven

The intent system depends on alignment between:

- `src/features/orchestrator/intent-patterns.ts`
- `src/features/orchestrator/delegation-engine.ts`
- skill names in `src/features/builtin-skills/skills/`
- agent roles in `src/agents/`

This is efficient, but string-based mappings can drift silently if a skill name or role changes without matching pattern updates.

### 4. Configuration recovery can mask partial invalid state

`src/plugin-config.ts` intentionally supports partial config recovery when some sections are invalid. This improves resilience, but it can also make broken configuration appear to "mostly work" while silently dropping sections like browser or MCP overrides.

That behavior is useful, but it deserves careful logging and strong tests whenever config shape evolves.

## Secondary concerns

### Extension stubs may hide unfinished capability

The repo historically described `create-tools.ts` and `create-hooks.ts` as extension points. `create-tools.ts` now wires sprint tools, but similar abstraction surfaces still risk looking more complete than they are if downstream users expect a broader plugin-tool ecosystem.

### Mixed test frameworks increase cognitive load

The repo supports both `vitest` imports and `bun:test` imports. This works today, but it raises maintenance cost because contributors need to know when each style is acceptable.

### MCP connectivity is operationally sensitive

`src/features/skill-mcp-manager/connection.ts` and `src/mcp/index.ts` support local, stdio, and remote transports. Failures here are runtime-environment dependent and often only visible outside unit tests, especially for provider auth, local binaries, or remote MCP availability.

## Security and safety observations

- `src/features/browser-daemon/server.ts` binds to `127.0.0.1` and uses a bearer token for command auth, which is a good baseline
- `src/features/browser-daemon/read-commands.ts`, `write-commands.ts`, and `meta-commands.ts` enforce path restrictions in multiple places
- `src/features/tools/sprint-tools.ts` explicitly blocks path traversal for plan file names

These are strengths, but they are exactly the files to audit first when adding new command surfaces.

## Change-risk hotspots

If making broad changes, treat these as high-risk files or folders:

- `src/index.ts`
- `src/plugin-interface.ts`
- `src/create-hooks.ts`
- `src/features/orchestrator/`
- `src/features/browser-daemon/`
- `src/features/skill-mcp-manager/`
- `src/plugin-config.ts`

## Recommended follow-up investigations

1. Standardize retry and cleanup behavior in `src/features/browser-daemon/`
2. Consider contract tests for hook interaction order in `src/create-hooks.ts`
3. Add drift-detection tests for skill-name and role-name mapping around the orchestrator
4. Review whether partial config recovery should emit stronger surfaced warnings
