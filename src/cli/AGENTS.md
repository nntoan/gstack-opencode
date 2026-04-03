# cli/

CLI for `@nntoan/gstack`. Two commands: `install` (bootstrap config + register plugin) and `doctor` (health checks). Built with Commander.

## Structure

```
cli/
├── index.ts                    # Shebang entrypoint (#!/usr/bin/env bun)
├── cli-program.ts              # Commander program: install + doctor commands
├── install.ts                  # runInstall — config generation + plugin registration
├── install-options.ts          # CLI flag parsing for install
├── install-config-template.ts  # JSONC template for gstack.jsonc
├── install-selection-prompts.ts  # Interactive provider selection (@clack/prompts)
├── detect-existing-config.ts   # Existing config detection for prompt defaults
├── model-defaults.ts           # Default model fallback chains per provider
├── model-default-chains.ts     # Provider → model chain resolution
├── model-id-transform.ts       # Model ID normalization
└── doctor/
    ├── index.ts                # runDoctor entrypoint
    ├── runner.ts               # Check runner (executes checks, reports)
    └── checks/
        ├── index.ts            # Check registry
        └── *.ts                # Individual health checks
```

## Where to Look

| Task                    | File                                           | Notes                                                              |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| Add CLI command         | `cli-program.ts`                               | `program.command(...)`                                             |
| Change install behavior | `install.ts`                                   | Writes `~/.config/opencode/gstack.jsonc` + updates `opencode.json` |
| Change config template  | `install-config-template.ts`                   | JSONC template string                                              |
| Add health check        | `doctor/checks/`                               | Create check, add to `checks/index.ts`                             |
| Change model defaults   | `model-defaults.ts`, `model-default-chains.ts` | Provider-aware fallback chains                                     |

## Conventions

- CLI is a separate build target (`bun run build:cli` → `dist/cli.js`)
- Install writes to `~/.config/opencode/` — always uses `process.env.HOME`
- Interactive prompts are handled with `@clack/prompts` in `install-selection-prompts.ts`
- Doctor checks return structured results (pass/fail/warn + message)

## Anti-Patterns

- **Never** call `process.exit()` inside library code — only in `cli-program.ts` or `doctor/runner.ts`
- **Never** hardcode model IDs — use `model-defaults.ts` chains
- Tests mutate `process.env.HOME` — always restore in `afterEach`
