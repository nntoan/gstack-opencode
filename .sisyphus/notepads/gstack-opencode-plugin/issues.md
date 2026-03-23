# Issues — gstack-opencode-plugin

## [2026-03-22] Session: ses_2e9ccfa55ffeqn22QiJatmdVrw — Plan Start

### Known Issues to Watch For

1. **tsconfig conflict**: `"allowImportingTsExtensions": true` is INCOMPATIBLE with `"declaration": true` (TypeScript requires removing allowImportingTsExtensions for declaration emit)
   - Solution: Remove `allowImportingTsExtensions` when adding declaration support
2. **bun-types version**: Current is `"latest"` — must pin to `1.3.10` per oh-my-openagent pattern

3. **@types/node**: Present in devDeps — must REMOVE (conflicts with bun-types)

4. **package name**: Plan says keep `@nntoan/gstack` but current is `gstack-opencode` — check plan Task 1 carefully (says "Do NOT change the 'name' field — keep @nntoan/gstack")
   - RESOLUTION: Need to rename package.json `name` to `@nntoan/gstack`

5. **Plugin load timeout**: 10s hard limit — verify Wave 5 tasks don't add synchronous startup

6. **Template literal escaping**: gstack SKILL.md files contain backticks — must escape properly in TypeScript template literals

## [2026-03-23] Task 20: Orchestrator Intent Classifier

- No blockers encountered during implementation.
- Validation note: keyword overlaps (e.g., 'review' appears in plan/test contexts) can produce multi-phase ties by design; classifier currently resolves ties deterministically to first winning phase with reduced confidence (0.3-0.6).

## [2026-03-23] Task 22: SkillMcpManager Notes

- GitNexus MCP server was not available through `skill_mcp` in this environment; used `npx gitnexus impact ... --repo opencode-gstack` CLI fallback for required impact checks.
- Current GitNexus index resolves `SkillMcpManager` symbols to `researchs/oh-my-openagent/...` entries; direct impact lookup for new `src/features/skill-mcp-manager/*` symbols is not yet available until re-analyze includes these symbols.

## [2026-03-23] Task 34: Sprint-backlog integration

- `bun run typecheck` initially failed due to unrelated missing file `src/cli/doctor/index.ts` imported by `src/cli/cli-program.ts`; added the missing module to restore repository-wide typecheck health.
- GitNexus CLI in this environment does not expose a `detect-changes` subcommand; impact tooling must use available commands (`impact`, `query`, `context`) or MCP when configured.

## [2026-03-23] Task 26: Workspace state manager

- `bun run typecheck` initially failed due to pre-existing test writer signature mismatch in `src/cli/doctor/runner.test.ts` and `src/cli/index.test.ts` (`write` returned `void` instead of `boolean`); updated both helpers to return `boolean`.
- GitNexus MCP was unavailable in this environment (`skill_mcp` reported server not found), so mandatory impact checks for newly added symbols could not be executed via MCP.
