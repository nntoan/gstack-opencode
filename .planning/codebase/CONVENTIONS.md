# Conventions

## Language and module rules

- The project is ESM-only via `"type": "module"` in `package.json`
- TypeScript runs in strict mode in `tsconfig.json`
- Internal imports use explicit `.ts` extensions, for example `import { loadPluginConfig } from './plugin-config.ts';`
- The main source set is `src/**/*`; `dist`, `node_modules`, and `researchs` are excluded from TypeScript and lint workflows

## Formatting and linting

Formatting rules are enforced by Prettier plus ESLint through `eslint.config.js`.

Confirmed conventions:

- single quotes
- semicolons
- 2-space indentation
- 100 character line width
- ES5 trailing commas
- always-parenthesized arrow function params

Key lint expectations from `eslint.config.js` and `AGENTS.md`:

- `no-console` is an error; use `log()` from `src/shared/logger.ts` or `src/shared/index.ts`
- `@typescript-eslint/no-explicit-any` is a warning, not a normal style target
- `@typescript-eslint/no-unused-vars` is enforced with `_` escape hatches for intentional unused bindings
- empty catch blocks are allowed only because `no-empty` is configured with `allowEmptyCatch: true`

## Code style patterns

Common style choices visible across `src/index.ts`, `src/create-managers.ts`, `src/plugin-interface.ts`, and `src/plugin-config.ts`:

- Prefer small factory functions over large classes unless lifecycle/state justify a class
- Use barrel files for feature exports, e.g. `src/features/orchestrator/index.ts`
- Use early returns to avoid deep nesting
- Keep cross-cutting composition centralized in `src/create-*.ts` files
- Prefer typed object literals and explicit interfaces for public shapes

## Error handling conventions

- Convert unknown errors using `error instanceof Error ? error.message : String(error)`
- Use structured `log('[ERROR] ...', {...})` calls for operational failures, as seen in `src/plugin-interface.ts`, `src/features/analytics/writer.ts`, and `src/features/skill-mcp-manager/connection.ts`
- Throw explicit `Error` instances for validation and invariant failures, especially in `src/features/browser-daemon/` and `src/features/tools/sprint-tools.ts`

There is also intentional documented tech debt:

- `AGENTS.md` notes silent cleanup catches in the browser daemon
- `src/features/browser-daemon/AGENTS.md` records ad hoc retry logic and `Bun.sleep(100)` timing as fragile areas

## Configuration conventions

- Runtime defaults are expressed in Zod schemas under `src/config/schema/`
- User config lives in `~/.config/opencode/gstack.jsonc`
- Project overrides live in `.opencode/gstack.jsonc`
- `src/plugin-config.ts` allows partial recovery from invalid config sections instead of hard-failing the whole config

## Architectural conventions

- Agent registration belongs in `src/agents/index.ts`
- Skill registration belongs in `src/features/builtin-skills/skills.ts`
- Intent patterns belong in `src/features/orchestrator/intent-patterns.ts`
- Host integration stays in `src/plugin-interface.ts`
- Tool registration stays in `src/features/tools/` and `src/create-tools.ts`

## Things this repo explicitly avoids

- `console.*` in application code
- implicit CommonJS behavior
- hidden pattern definitions outside their canonical module
- hardcoded model defaults outside the CLI model-default chain files
- shell interpolation of untrusted user input, especially in browser-daemon command helpers

## Files to copy when matching local style

- `src/index.ts` — composition-root style
- `src/create-managers.ts` — service assembly style
- `src/plugin-interface.ts` — event handler style
- `src/plugin-config.ts` — validation + fallback style
- `src/shared/logger.ts` — logging pattern
