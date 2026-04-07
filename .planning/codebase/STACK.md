# Stack

## Core languages and runtime

- TypeScript throughout `src/`
- Bun as runtime, test runner, and build tool, confirmed in `package.json`, `.github/workflows/ci.yml`, and `src/cli/index.ts`
- ESM-only modules via `"type": "module"` in `package.json`

## Primary package roles

### OpenCode integration

- `@opencode-ai/plugin` — plugin entry contract, used in `src/index.ts`
- `@opencode-ai/sdk` — ecosystem dependency for OpenCode integration

### Command-line and user interaction

- `commander` — CLI definition in `src/cli/cli-program.ts`
- `@clack/prompts` — interactive installer prompts under `src/cli/install-selection-prompts.ts`

### Configuration and data shaping

- `zod` — runtime config schema in `src/config/schema/`
- `jsonc-parser` — JSONC config parsing in `src/plugin-config.ts` and CLI config checks
- `diff` — diff support in the dependency set

### MCP and external tool connectivity

- `@modelcontextprotocol/sdk` — MCP client transports in `src/features/skill-mcp-manager/connection.ts`
- Remote MCP providers configured in `src/mcp/`
- Local MCP launchers configured in `src/mcp/`

### Browser automation

- `playwright` as a peer dependency and dev dependency
- Playwright-backed browser daemon implemented in `src/features/browser-daemon/`

## Build and validation toolchain

Defined in `package.json` and enforced by CI:

- `bun run build`
- `bun run build:cli`
- `bun run build:all`
- `bun run test`
- `bun run typecheck`
- `bun run lint`
- `bun run format`

Supporting tools:

- TypeScript `^5.7.3`
- ESLint `^9.39.1`
- Prettier `^3.2.4`
- `typescript-eslint`
- `@eslint/js`

## Build outputs and packaging

- Main library output targets `dist/index.js` and `dist/index.d.ts`
- CLI output targets `dist/cli.js`
- Platform packages live under `packages/` and are built in `.github/workflows/publish-platform.yml`
- Published package name is `@nntoan/gstack`

## Runtime configuration surfaces

- User config: `~/.config/opencode/gstack.jsonc`
- Project override: `.opencode/gstack.jsonc`
- Generated schema: `schemas/config.schema.json`

## Testing and CI stack

- `bun test` as the standard test command
- Mixed `vitest` and `bun:test` imports in test files
- GitHub Actions CI in `.github/workflows/ci.yml`

## Representative files

- `package.json`
- `tsconfig.json`
- `eslint.config.js`
- `.github/workflows/ci.yml`
- `src/index.ts`
- `src/cli/cli-program.ts`
- `src/features/skill-mcp-manager/connection.ts`
- `src/features/browser-daemon/server.ts`
