# Learnings — gstack-opencode-plugin

## [2026-03-22] Session: ses_2e9ccfa55ffeqn22QiJatmdVrw — Plan Start

### Project Structure

- Workspace: `/home/nntoan/Playground/opencode-gstack`
- Current src: only `src/index.ts` (empty `export {}`)
- Reference: `researchs/oh-my-openagent/` — the exact pattern to follow
- Reference: `researchs/gstack/` — the gstack skills to port

### Package Baseline

- Name: `gstack-opencode` (keep as-is per plan)
- Type: ES Module
- Bun runtime
- devDeps: eslint, prettier, vitest installed already
- devDeps: bun-types (but on `latest`, plan says pin to `1.3.10`)
- devDeps: @types/node present (plan says REMOVE — use bun-types only)
- NO runtime deps yet (need to add all 8)

### tsconfig baseline

- Has `"noEmit": true` — must REMOVE
- Missing `"declaration": true`, `"emitDeclarationOnly": true`, `"outDir": "dist"`, `"rootDir": "src"`
- Has `"allowImportingTsExtensions": true` — must REMOVE when adding declaration support (incompatible)
- Has `"types": ["bun-types"]` already — good

### Reference Patterns (from oh-my-openagent)

- Init: loadPluginConfig → createManagers → createTools → createHooks → createPluginInterface
- BuiltinSkill: { name, description, template, allowedTools?, mcpConfig?, agent?, model?, subtask?, argumentHint?, license?, compatibility?, metadata? }
- MCP factory: `createBuiltinMcps(disabledMcps, config)` in `src/mcp/`
- MCP 3-tier: built-in → user → skill-embedded via `applyMcpConfig()`
- SkillMcpManager for per-session MCP connections
- Logger writes to `/tmp/oh-my-opencode.log` (ours: `/tmp/gstack.log`)
- ONLY default export from index.ts (function exports treated as plugin instances)
- Factory pattern: `createXXX()` everywhere
- No catch-all files (utils.ts, helpers.ts banned)
- 200 LOC soft limit per file
- Test: bun test, co-located `*.test.ts`
- No `@types/node` — `bun-types` only

### Critical Constraints

- Plugin load timeout: 10s — ALL MCP connections MUST be lazy
- No synchronous MCP connections at plugin load
- No console.log — use file-based logger
- No `as any` or `@ts-ignore`
- Strict TypeScript
- `"allowImportingTsExtensions": true` must be removed for declaration emit to work

### .gstack/ Subdirectory Structure

- `.gstack/browser/` — browse.json, console.log, network.log, dialog.log
- `.gstack/orchestrator/` — boulder.json, state.json, sprint-log.jsonl
- `.gstack/plans/` — Sprint plans
- `.gstack/notepads/{plan-name}/` — Per-plan wisdom files
- `.gstack/evidence/` — QA scenario evidence
- `.gstack/reviews/` — dashboard.json, review files
- `.gstack/sessions/` — session-id.json files
- `.gstack/analytics/` — skill-usage.jsonl, eureka.jsonl, events-YYYY-MM-DD.jsonl
- `.gstack/rules/` — Conditional rule files
- `.gstack/design-docs/` — Design consultation artifacts
- Flag files at `.gstack/` ROOT: `.completeness-intro-seen`, `.telemetry-prompted`, `.first-run-complete`
- `.backlog/` at PROJECT ROOT (NOT inside .gstack)

## Task 4: Config Zod v4 Schema System (2026-03-22)

### Key Decisions

1. **Split schemas by concern** (200 LOC rule):
   - agent-schema.ts: AgentOverridesSchema
   - mcp-schema.ts: McpConfigSchema (5 MCP providers)
   - backlog-schema.ts: BacklogConfigSchema
   - browser-schema.ts: BrowserConfigSchema
   - telemetry-schema.ts: TelemetryConfigSchema
   - main.ts: GstackConfigSchema (root composition)
   - constants.ts: SCHEMA_URL
   - index.ts: barrel exports

2. **Backlog defaults via transform**:
   - Instead of `.default({})`, use schema `.transform()` to merge nested defaults
   - This ensures backlog always has enabled/auto_create_tasks/auto_update_status even on empty input

3. **JSON Schema generation**:
   - Zod v4.1 lacks `z.toJsonSchema()`
   - Used manual JSON Schema object construction instead
   - Maintained schema URL constant for CI/CD updates

4. **Build config fix**:
   - tsconfig.build.json required `allowImportingTsExtensions: true`
   - Project uses explicit .ts imports per AGENTS.md conventions
   - Build process runs tsc --emitDeclarationOnly which needs this flag

### Testing Pattern

19 tests organized as:

- **Unit**: individual schema validation (orchestration_mode, arrays, enums)
- **Integration**: nested schemas (agent overrides, MCP config, browser/telemetry)
- **Validation**: error scenarios (invalid enum, wrong types)
- **Defaults**: complex defaults with transforms

### Files Modified

- tsconfig.build.json: enabled allowImportingTsExtensions for .ts imports

### Generated JSON Schema Location

- schemas/config.schema.json (4.4K)
- Includes all properties with defaults and enums
- Ready for IDE/validator tooling

## [2026-03-22] Task 5: Skill Template Adapter Module

### Files Created

- `src/features/skill-adapter/placeholder-content.ts` (66 LOC)
- `src/features/skill-adapter/template-resolver.ts` (31 LOC)
- `src/features/skill-adapter/content-transformer.ts` (34 LOC)
- `src/features/skill-adapter/index.ts` (4 LOC)
- `src/features/skill-adapter/template-resolver.test.ts` (47 LOC)
- `src/features/skill-adapter/content-transformer.test.ts` (63 LOC)

### Key Patterns

#### DEFAULT_PLACEHOLDERS (9 gstack template replacements)

```typescript
export const DEFAULT_PLACEHOLDERS: Record<string, string> = {
  PREAMBLE,
  COMMAND_REFERENCE,
  SNAPSHOT_FLAGS,
  BROWSE_SETUP,
  BASE_BRANCH_DETECT,
  QA_METHODOLOGY,
  DESIGN_METHODOLOGY,
  REVIEW_DASHBOARD,
  TEST_BOOTSTRAP,
};
```

Maps original gstack placeholders to OpenCode-adapted content. Used by skill-adapter consumers to resolve `{{PLACEHOLDER}}` patterns in SKILL.md files.

#### resolveTemplate function

```typescript
export function resolveTemplate(
  templateContent: string,
  placeholders: Record<string, string> = DEFAULT_PLACEHOLDERS
): string;
```

- Uses regex `/\{\{([A-Z_]+)\}\}/g` to match uppercase placeholder names
- Unknown placeholders left as-is (graceful degradation)
- Supports custom placeholders via second parameter
- Defaults to DEFAULT_PLACEHOLDERS

#### transformSkillContent function

Chains 7 string replacements for gstack → OpenCode adaptation:

1. `$B config` → `gstack plugin internal:` (binary references)
2. `~/.codex/skills/gstack/bin/` → `gstack plugin internal:` (absolute paths)
3. `~/.claude/skills/gstack/bin/` → `gstack plugin internal:` (Claude Code paths)
4. `~/.gstack/` → `.gstack/` (home-relative to project-relative)
5. `conductor.json` → `.gstack/orchestrator/state.json` (state file mapping)
6. Remove `<!-- AUTO-GENERATED ... -->` header comments
7. Remove `<!-- Regenerate: bun run gen:skill-docs -->` comments

### Testing Strategy

**template-resolver.test.ts**: 7 tests

- Single placeholder replacement
- Unknown placeholder handling (left as-is)
- Multiple occurrences of same placeholder
- Multiple different placeholders
- All 9 GSTACK_PLACEHOLDER_NAMES without error
- DEFAULT_PLACEHOLDERS fallback

**content-transformer.test.ts**: 7 tests

- $B binary reference removal
- ~/.codex/ path transformation
- ~/.claude/ path transformation
- ~/.gstack/ to .gstack/ conversion
- conductor.json replacement
- Non-tool skill content preservation (data integrity)
- Auto-generated header comment removal

### Verification Results

- `bun test src/features/skill-adapter/`: **14 pass, 0 fail** (100%)
- `bun run typecheck`: **0 errors, 0 warnings**
- Build compatibility: ES2021+, CommonJS-ready .d.ts

### Design Notes

1. **Regex patterns are self-documenting** — removed agent-memo comments to keep code concise
2. **Transform over replace** — preserves other content unchanged (content-transformer leaves comments, non-tool text untouched)
3. **Constants over strings** — GSTACK_PLACEHOLDER_NAMES is a const array enabling type-safe iteration and discovery
4. **Graceful degradation** — unknown placeholders preserved, allowing partial template resolution
5. **No file I/O** — pure functions for composability (caller handles read/write)

## [2026-03-22] Task 6: Config Loader

- Followed oh-my-openagent loader pattern with `parseConfigPartially`, `loadConfigFromPath`, and `loadPluginConfig` while using project-native types (`GstackConfig` from `src/types/config.ts`).
- Used `jsonc-parser` (`parseJsonc`) instead of `JSON.parse`; leveraged parser error collection to log descriptive JSONC parse errors while still returning salvageable partial config when possible.
- Implemented `mergeConfigs` in `src/config/merge-configs.ts` using `deepMerge` for `agents`/`mcp` and explicit Set-union handling for all `disabled_*` arrays to avoid duplicate entries.
- Ensured missing config files are non-fatal (`null` from `loadConfigFromPath`, defaults from `loadPluginConfig`) and final parse fallback is `GstackConfigSchema.parse({})`.
- Added TDD coverage for default loading, user+project merge precedence, disabled array union semantics, graceful missing-file behavior, invalid JSONC partial recovery, and partial-section filtering.

## [2026-03-22] Task 7: Plugin Entry Point Skeleton

### Implemented 5-Step Init Pattern

1. **loadPluginConfig** → loads user+project .jsonc/json config, merges with defaults
2. **createManagers** → stubs: returns `{ configHandler: async () => {} }`
3. **createTools** → stubs: returns empty object
4. **createHooks** → stubs: returns empty object
5. **createPluginInterface** → stubs: returns `{ tool: {}, config: managers.configHandler }`

### Files Created

- `src/index.ts` — 33 LOC, Plugin type async function with 5-step flow, only `default` export + 4 type re-exports
- `src/create-managers.ts` — 11 LOC, exports Managers interface and createManagers factory
- `src/create-tools.ts` — 8 LOC, exports createTools factory
- `src/create-hooks.ts` — 8 LOC, exports createHooks factory
- `src/plugin-interface.ts` — 10 LOC, minimal stub for Task 8 (returns tool/config object)
- `src/index.test.ts` — 19 LOC, vitest with PluginInput mock + 2 tests

### Key Learning: PluginInput Type

From `@opencode-ai/plugin/dist/index.d.ts`:

```typescript
export type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>;
  project: Project;
  directory: string;
  worktree: string;
  serverUrl: URL;
  $: BunShell;
};
```

Test mock requires all 6 properties. `client`, `project`, and `$` can be `{} as any` for unit tests.

### Verification

- ✅ `bun run build`: Bundled 101 modules in 26ms, 0.55 MB index.js
- ✅ `bun run typecheck`: 0 errors (no implicit `any`)
- ✅ `bun test src/index.test.ts`: 2 pass (is function, returns plugin interface)

### Critical Constraint

**NO function exports from `src/index.ts`** — OpenCode plugin loader treats ALL function exports as plugin instances and instantiates them. Only `default` export + `export type` allowed.

## [2026-03-22] Task 8: Plugin Interface — Hook Handler Assembly

### Implementation

- **`src/plugin-interface.ts`** — 38 LOC, full `createPluginInterface()` function returning 11 handler keys (tool, config, and 9 hook stubs)
- **`src/plugin-interface.test.ts`** — 72 LOC, vitest with 4 tests covering handler presence, config assignment, tools assignment, and stub callability

### Handler Keys Implemented

1. **`tool`** — assigned directly from `params.tools` (will hold tool definitions)
2. **`config`** — assigned directly from `managers.configHandler` (config transformation hook)
3. **`chat.params`** — stub async function
4. **`chat.headers`** — stub async function
5. **`chat.message`** — stub async function
6. **`experimental.chat.messages.transform`** — stub async function
7. **`experimental.chat.system.transform`** — stub async function
8. **`event`** — stub async function
9. **`tool.execute.before`** — stub async function
10. **`tool.execute.after`** — stub async function
11. **`tool.definition`** — stub async function

### Key Learning: Handler Stub Pattern

- **No unused parameters** — all stub handlers take no params; linter rejects `_param: Type` declarations
- **Promise<void> return type** — explicit async handler signature for consistency
- **Empty body** — `async (): Promise<void> => {}` — real logic deferred to Task 23 (Hook Implementations)
- **Reference pattern** — followed oh-my-openagent's 10-handler model, added `tool.definition` for completeness

### Test Coverage

1. **`returns an object with all required hook handlers`** — validates all 11 keys exist and are functions
2. **`config handler is managers.configHandler`** — validates reference assignment
3. **`tool handler is the tools record`** — validates tool object pass-through
4. **`all stub handlers are callable`** — validates each handler async executes to `undefined` without error

### Verification

- ✅ `bun test src/plugin-interface.test.ts`: 4 pass, 18 expect() calls
- ✅ `npx eslint src/plugin-interface.ts src/plugin-interface.test.ts`: 0 errors
- ✅ Line count: 38 (well under 200 LOC limit)
- ✅ No `as any`, no `@ts-ignore`, no console.log

### Next Task

Task 9: `createTools` function to generate tool definitions (e.g., run-script, build, test, lint, format commands).

## [2026-03-23] Task 20: Orchestrator Intent Classifier

- Added deterministic intent classification module under src/features/orchestrator with explicit .ts imports and no LLM usage.
- Implemented PHASE_PATTERNS for all 9 sprint phases and complete SKILL_TO_PHASE_MAP with all 25 builtin skills.
- Added PHASE_TO_DEFAULT_AGENT mapping aligned to phase ownership (plan -> eng-manager, cross-cutting -> safety-guard, utility -> upgrader).
- classifyIntent supports skills-only short-circuit, explicit /skill detection (confidence 1.0), pattern-scoring confidence bands, and build fallback.
- Suggested skills are derived by phase (top 3), prioritizing explicit skill when present.
- Added vitest coverage for extraction, skills-only mode, explicit skill classification, single-phase/multi-phase confidence ranges, fallback, and mapping completeness checks.

## [2026-03-23] Task 22: SkillMcpManager — per-session MCP connections

- `SkillMcpManager` should remain constructor-light (no eager connection); all transport creation happens in `getOrCreateClient` path.
- `McpServerConfig.type: 'remote'` maps to `StreamableHTTPClientTransport` with `requestInit.headers` fed from config headers.
- Per-session client key format `sessionID:skillName:serverName` enables fast session cleanup via prefix filtering.
- Retry layering works best in two places: connection establishment retries (`getOrCreateClientWithRetryImpl`) and operation retries for "not connected" with `forceReconnect`.
- MCP manager tests can stay hermetic by spying on `getOrCreateClientWithRetry` and returning a mock client, avoiding real stdio/HTTP transport startup.

## Task 25: Local Analytics (JSONL Telemetry)

### Pattern: node:fs appendFileSync for JSONL

- Bun doesn't have native append mode for `Bun.write`; use `appendFileSync` from `node:fs` instead
- Always `mkdirSync(dirname(filePath), { recursive: true })` before first write (lazy dir creation)

### Pattern: Tracker factory with disabled mode

- Pass `options.enabled: false` → all write methods are early-return no-ops
- No dirs or files created until first enabled write (lazy)

### Sprint log path derivation

- `analyticsDir` = `.gstack/analytics`; sprint-log lives at `.gstack/orchestrator/sprint-log.jsonl`
- Derive via `resolve(analyticsDir, '..') + '/orchestrator/sprint-log.jsonl'`
- Avoids coupling sprint logger to `path-helpers.ts`; works with any analyticsDir value

### Casting Record<string, unknown> for appendJsonl

- Typed event interfaces cast to `Record<string, unknown>` via `event as unknown as Record<string, unknown>`
- Avoids `any` while keeping strict types on public API

### Test isolation

- Use `tmpdir() + random suffix` for test dirs; `rmSync` in afterEach
- Verify lazy dir creation by checking `existsSync(analyticsDir)` === false immediately after tracker construction

## [2026-03-23] Task 34: Sprint-backlog MCP integration

- `withBacklogFallback` should be the single wrapper for all Backlog client operations; this keeps behavior uniform when MCP is unavailable.
- TypeScript can infer overly narrow literal return types in fallback wrappers (e.g., `{ available: true }`), so explicitly parameterizing `withBacklogFallback<BacklogMcpAvailability>` avoids assignability errors.
- Backlog task conversion from `unknown` should be strict and defensive (`toBacklogTask` + `toBacklogTasks`) to prevent malformed MCP payloads from leaking into orchestrator flow.

## [2026-03-23] Task 26: Workspace state manager

- Boulder storage keeps oh-my-openagent sync pattern but must resolve path to `.gstack/orchestrator/boulder.json` using shared `getBoulderPath` helper.
- `RESERVED_KEYS` validation on task-session upsert is required to block `__proto__`, `prototype`, and `constructor` keys.
- Keep workspace state concerns isolated by module (boulder, plans, sessions, reviews, notepads, ensure dir) and keep `index.ts` composition-only.
- `ensureWorkspaceDir` should be idempotent for `.gitignore` by appending `.gstack/` only when not already present.

## [2026-03-23] Task: Browser daemon core port

- Browser daemon state must always live under `.gstack/browser/`; config resolution should derive `stateDir` from `BROWSE_STATE_FILE` and default to `<project>/.gstack/browser`.
- `ensureBrowserStateDir` can be implemented cleanly by reusing `ensureSubdir(projectDir, 'browser')` from workspace-state to avoid duplicate directory logic.
- Keeping server startup testable is easier when exposing a `startServer()` function that accepts injected `browserManager` and env overrides.
- Health endpoint contract should return `{ status, uptime, pageCount }` and remain auth-free while `/command` stays POST + bearer-protected.

## T34: GitHub Actions CI/CD Workflows

**Created**: 2026-03-23

### Files Created
- `.github/workflows/ci.yml` - Parallel CI/CD for test, typecheck, build, lint
- `.github/workflows/publish.yml` - Manual publish with version_bump + dry_run inputs

### Key Implementation Details

#### CI Workflow (`ci.yml`)
- Triggers: `push` to main/dev + `pull_request` to main/dev
- 4 parallel jobs (no dependencies between them):
  1. **test**: `bun test`
  2. **typecheck**: `bun run typecheck`
  3. **build**: `bun run build:all` + verifies dist/index.js, dist/index.d.ts, dist/cli.js
  4. **lint**: `bun run lint`
- All jobs use `actions/checkout@v4` + `oven-sh/setup-bun@v2`
- Concurrency: cancels in-progress runs on new push/PR

#### Publish Workflow (`publish.yml`)
- Trigger: `workflow_dispatch` only (manual)
- Inputs:
  - `version_bump` (choice): patch, minor, major, prerelease
  - `dry_run` (boolean): defaults to false
- Steps (all run, but publish/tag/release conditional on `!inputs.dry_run`):
  1. Checkout (fetch-depth: 0)
  2. Setup Bun
  3. Install dependencies
  4. Run tests
  5. Type check
  6. Build (bun run build:all)
  7. Bump version (npm version --no-git-tag-version)
  8. Publish to npm (if !dry_run) using NPM_TOKEN
  9. Create git tag + push (if !dry_run)
  10. Create GitHub release (if !dry_run) using GITHUB_TOKEN
- Permissions: contents: write, id-token: write (for OIDC signing)

### Reference Pattern
- Adapted from `researchs/oh-my-openagent/.github/workflows/ci.yml` and `publish.yml`
- Simplified structure (4 jobs vs complex mock-heavy test splitting)
- No auto-commit of schema.json (not in this project)
- No draft-release job (not needed)
- Single publish job instead of multi-package (oh-my-openagent publishes 2 packages)

### Notes
- TypeScript still passes (YAML files don't affect TS)
- YAML is syntactically valid
- NPM_TOKEN secret required in GitHub repo settings
- GITHUB_TOKEN provided automatically by GitHub Actions
- Publish workflow includes all quality gates (test + typecheck + build) before publishing
