# Testing

## Test runner and commands

The default test command is `bun test`, defined in `package.json`. The repo also treats `bun run test && bun run typecheck && bun run lint && bun run build:all` as the full local validation loop.

Related scripts in `package.json`:

- `bun run test`
- `bun run typecheck`
- `bun run lint`
- `bun run build:all`

CI in `.github/workflows/ci.yml` runs tests, typecheck, build, and lint as separate jobs.

## Test file placement

Tests are colocated with the implementation they verify. The dominant pattern is `*.test.ts` next to the corresponding source file.

Representative examples:

- `src/index.test.ts`
- `src/plugin-config.test.ts`
- `src/create-skills-and-agents.test.ts`
- `src/create-managers.test.ts`
- `src/features/orchestrator/delegation-engine.test.ts`
- `src/features/browser-daemon/server.test.ts`
- `src/features/tools/sprint-tools.test.ts`

## Framework usage

The codebase uses both `vitest`-style imports and Bun's built-in `bun:test` API, depending on the file.

Examples:

- `src/plugin-config.test.ts` imports from `vitest`
- `src/features/token-budget/budget-tracker.test.ts` imports from `bun:test`

This mixed pattern is already accepted by the repo and documented in `AGENTS.md`.

## Testing style

Observed conventions across `src/plugin-config.test.ts`, `src/features/orchestrator/delegation-engine.test.ts`, and `src/features/tools/sprint-tools.test.ts`:

- Build small helpers inside the test file rather than relying on heavy global fixtures
- Prefer direct object literals and lightweight fake implementations for dependencies
- Keep tests close to the public function or factory being verified
- Use descriptive `describe()` and `it()` blocks with behavior-oriented names

## File-system and state isolation

Tests that touch the filesystem isolate themselves in temp directories, usually via `os.tmpdir()` plus `mkdtempSync`, then clean up with `afterEach`.

Examples:

- `src/plugin-config.test.ts` creates temporary HOME directories and restores `process.env.HOME`
- `src/features/tools/sprint-tools.test.ts` creates temp workspaces and removes them in `afterEach`
- `src/features/browser-daemon/server.test.ts` uses temporary state directories

`AGENTS.md` also calls out `.memory/` and `os.tmpdir()` as the preferred isolation strategy.

## What tends to be tested

- Configuration parsing and merge behavior
- Agent and skill registry output
- Orchestrator classification and delegation behavior
- Tool behavior with real temp files
- Browser-daemon server behavior and command handling
- Feature-specific contract checks, such as hook behavior and MCP config wiring

## Good templates to copy for new tests

- `src/plugin-config.test.ts` for config-heavy tests
- `src/features/orchestrator/delegation-engine.test.ts` for pure decision logic
- `src/features/tools/sprint-tools.test.ts` for temp-directory and tool execution tests
- `src/features/browser-daemon/server.test.ts` for subsystem boundary tests

## Validation expectations before merge

At minimum, repo guidance expects contributors to run:

- `bun run test`
- `bun run lint`

The stronger recommended loop from `README.md` and `AGENTS.md` is:

- `bun run test && bun run typecheck && bun run lint && bun run build:all`
