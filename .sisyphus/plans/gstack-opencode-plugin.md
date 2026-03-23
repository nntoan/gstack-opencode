# @nntoan/gstack — OpenCode Plugin Port (v2)

## TL;DR

> **Quick Summary**: Port Garry Tan's gstack (25 SKILL.md-based AI engineering workflow) into a standalone OpenCode plugin (`@nntoan/gstack`) with a multi-agent orchestrator, 5 built-in MCP servers (websearch, context7, contexthub, grep_app, backlog.md), Backlog.md-powered sprint management, and a comprehensive `.gstack/` workspace directory organized by concern.
>
> **Deliverables**:
>
> - Fully functional OpenCode plugin with `@opencode-ai/plugin` API integration
> - 25 gstack skills ported as BuiltinSkill objects (adapted for OpenCode context)
> - Multi-agent orchestrator with 13 sprint-phase agents (CEO, Eng Manager, Designer, Builder, Reviewer, Debugger, QA Lead, Release Engineer, Doc Engineer, Retro Lead, Safety Guard, Upgrader, Session Manager)
> - 5 built-in MCP servers: websearch (Exa), context7, contexthub, grep_app, backlog.md
> - Deep Backlog.md integration: orchestrator auto-creates `.backlog/` tasks, agents update status, `/ship` checks completion
> - Config-driven mode switch: "multi-agent" (default) vs "skills-only" (backward compat)
> - JSONC + Zod v4 config system (multi-level: user → project → defaults)
> - CLI (install/doctor commands)
> - Local analytics (JSONL telemetry)
> - Browser daemon port (Playwright + Bun.serve headless Chromium)
> - Template system for build-time skill generation
> - Upstream sync script for detecting gstack SKILL.md changes
> - `.gstack/` workspace directory organized by concern (10 subdirectories)
> - `.backlog/` in project root (Backlog.md native convention)
> - Platform binaries (12 targets via bun compile)
> - CI/CD pipeline (GitHub Actions)
> - npm-publishable package following oh-my-openagent distribution patterns
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES — 7 waves
> **Critical Path**: T1 (deps) → T3 (types) → T6 (config) → T10 (skills batch 1) → T17 (agents) → T20 (orchestrator) → T23 (integration) → T27 (build) → Final

---

## Context

### Original Request

Port Garry Tan's gstack into a standalone OpenCode plugin, modeled exactly after how oh-my-openagent ships their plugin. The major feature is a multi-agent orchestrator where OpenCode autonomously delegates to sprint-phase agents. Users can opt-out via config and fallback to individual `/skill-command` approach (backward compat with original gstack). Plugin ships with 5 built-in MCP servers and deep Backlog.md integration for structured sprint management.

### Interview Summary

**Key Discussions**:

- Port ALL 25 skills, exposed both as individual skills AND via orchestrator
- 13 gstack-native agents mapped to sprint workflow phases (Think → Plan → Build → Review → Test → Ship → Reflect)
- Full browser daemon port (Playwright + Bun.serve headless Chromium with ~100ms latency)
- Config mode switch: `"multi-agent"` (default) vs `"skills-only"` (backward compat via JSONC config)
- Need upstream sync methodology with original gstack repo for skill updates
- TDD approach with vitest (existing in devDeps)
- Full CI/CD pipeline matching oh-my-openagent (ci.yml, publish.yml, publish-platform.yml)
- Platform binaries for 12 targets via bun compile
- CLI with install/doctor commands via commander.js
- Full telemetry: local JSONL analytics + Supabase backend (deferred to later wave)
- 5 built-in MCP servers: websearch (Exa), context7, contexthub, grep_app, backlog.md (all can be disabled)
- Deep Backlog.md integration: orchestrator auto-creates `.backlog/` tasks during Think/Plan, agents update status, `/ship` checks completion
- `.gstack/` workspace organized by concern into subdirectories (NOT loose files at root)
- `.backlog/` stays in project root (Backlog.md native convention, NOT inside `.gstack/`)

**Research Findings**:

- gstack skills are pure Markdown prompts — no TypeScript logic per skill
- Skills are generated from `.tmpl` templates via `gen-skill-docs.ts` using 9 placeholders
- oh-my-openagent uses 5-step init: loadConfig → createManagers → createTools → createHooks → createPluginInterface
- oh-my-openagent's BuiltinSkill: `{ name, description, template, allowedTools?, mcpConfig?, agent?, model? }`
- oh-my-openagent's 3-tier MCP system: built-in (global) → user MCPs → skill-embedded MCPs
- oh-my-openagent's MCP factory: `createBuiltinMcps(disabledMcps, config)` in `src/mcp/`
- oh-my-openagent's `applyMcpConfig()` merges 3 tiers into `config.mcp`
- oh-my-openagent's `SkillMcpManager` for per-session MCP connections with pooling
- Backlog.md stores tasks as Markdown files with YAML frontmatter in `.backlog/`
- ContextHub has agent annotation system for cross-agent knowledge transfer
- gstack's sprint system is INFORMAL — no state machine, no enforced transitions

### Metis Review

**Identified Gaps** (addressed):

- **Agent model assignments**: Deferred to config — users choose models via JSONC overrides. Default: use OpenCode's current model.
- **Skill content adaptation**: Each skill MUST be reviewed and adapted — replace `$B` binary calls, `~/.claude/skills/gstack/bin/` paths, Claude Code-specific hooks
- **Template literal escaping**: gstack skills contain backtick-heavy content — must use raw strings or escape properly
- **Cross-skill references**: `/ship` auto-invokes `/review` and `/document-release`, `/guard` activates `/careful` + `/freeze` — must work in OpenCode skill model
- **Plugin load timeout**: OpenCode has a 10s plugin load timeout — all MCP connections MUST be lazy/on-demand to stay within budget
- **MCP startup latency**: 5 MCPs loading must NOT block plugin init — use lazy initialization pattern
- **Backlog.md CLI availability**: Plugin MUST work without Backlog.md CLI installed — graceful degradation
- **MCP error handling**: When MCP server is unreachable, log warning and continue (no crashes)
- **No direct `.backlog/` file manipulation**: Always go through Backlog.md MCP tools
- **MCP config is additive**: Built-in MCPs can be disabled but never removed from schema

---

## Work Objectives

### Core Objective

Build and ship `@nntoan/gstack` as a production-ready npm package that brings Garry Tan's complete sprint workflow to OpenCode users, with both autonomous multi-agent orchestration and backward-compatible individual skill commands, powered by 5 built-in MCP servers and Backlog.md-integrated sprint management.

### Concrete Deliverables

- `dist/index.js` — Plugin entry point (ESM, Bun target)
- `dist/index.d.ts` — TypeScript declarations
- 25 BuiltinSkill objects (adapted from gstack SKILL.md files)
- 13 agent configurations (sprint-phase agents)
- 5 MCP server configurations (websearch, context7, contexthub, grep_app, backlog.md)
- MCP config handler with 3-tier merge (built-in → user → skill-embedded)
- SkillMcpManager for per-session MCP connections
- Sprint-backlog integration (orchestrator↔Backlog.md lifecycle)
- JSONC config parser + Zod v4 schema
- `schemas/config.schema.json` — JSON Schema for config files (hosted via GitHub raw URL, `$schema` reference for editor autocomplete)
- CLI binary (install + doctor)
- Browser daemon (Playwright + Bun.serve)
- Upstream sync script
- GitHub Actions CI/CD workflows
- npm package publishable to registry
- `.gstack/` workspace directory (per-project, gitignored) — organized by concern:
  - `.gstack/browser/` — browse.json (daemon state), console.log, network.log, dialog.log
  - `.gstack/orchestrator/` — boulder.json (active work tracking), state.json (runtime state), sprint-log.jsonl (phase transitions)
  - `.gstack/plans/` — Sprint plans, decision records, work breakdowns
  - `.gstack/notepads/{plan-name}/` — Per-plan wisdom: learnings.md, decisions.md, issues.md, verification.md, problems.md
  - `.gstack/evidence/` — QA scenario evidence, `final-qa/` subdirectory
  - `.gstack/reviews/` — dashboard.json, individual review result files
  - `.gstack/sessions/` — session-id.json files (PID, start time, agent type)
  - `.gstack/analytics/` — skill-usage.jsonl, eureka.jsonl, .pending-\*, events-YYYY-MM-DD.jsonl
  - `.gstack/rules/` — Conditional rule files (.md, .mdc)
  - `.gstack/design-docs/` — Design consultation artifacts
  - Flags at `.gstack/` root: `.completeness-intro-seen`, `.telemetry-prompted`, `.first-run-complete`

- `.backlog/` in project root — Backlog.md native task storage (NOT inside `.gstack/`)

### Definition of Done

- [ ] `bun run build` produces valid `dist/index.js` + `dist/index.d.ts`
- [ ] `bun test` passes all tests (>90% coverage on config, skills, agents, orchestrator, MCP)
- [ ] Plugin loads in OpenCode without error within 10s timeout
- [ ] All 25 skills appear in `/skill` list when in "skills-only" mode
- [ ] Orchestrator delegates to correct agents based on intent classification
- [ ] Config mode switch ("multi-agent" / "skills-only") works correctly
- [ ] All 5 MCP servers configurable and individually disableable
- [ ] Backlog.md integration creates/updates tasks through MCP (graceful degradation if unavailable)
- [ ] `bunx @nntoan/gstack doctor` reports healthy system
- [ ] `bun run lint` passes with zero errors

### Must Have

- All 25 gstack skills ported and adapted for OpenCode context
- Multi-agent orchestrator with intent classification → agent delegation
- Config-driven mode switch (multi-agent vs skills-only)
- Backward-compatible `/skill-command` access for all skills
- 5 built-in MCP servers (websearch, context7, contexthub, grep_app, backlog.md)
- MCP config handler with 3-tier merge
- Backlog.md sprint integration (auto-create tasks, auto-update status, ship-readiness checks)
- Config system (JSONC + Zod v4, multi-level merge)
- TDD test suite with vitest
- ESM build targeting Bun
- npm-publishable package
- `.gstack/` organized by concern (10 subdirectories)

### Must NOT Have (Guardrails)

- **No verbatim SKILL.md copies** — every skill MUST be adapted (replace `$B`, `~/.claude/skills/gstack/bin/`, Claude Code hooks)
- **No novel architecture patterns** — follow oh-my-openagent's exact patterns (factory functions, BuiltinSkill interface, barrel exports)
- **No catch-all files** — no `utils.ts`, `helpers.ts`, `service.ts` (200 LOC limit, single responsibility per file)
- **No `as any` or `@ts-ignore`** — strict TypeScript only
- **No remote telemetry in early waves** — local JSONL analytics first, Supabase deferred
- **No over-abstraction of agent system** — agents are config registrations with instructions, not a state machine
- **No sprint workflow engine with phase transitions** — orchestrator classifies intent and delegates, no complex state tracking
- **No dependencies on `~/.claude/skills/gstack/bin/`** — all functionality must be self-contained in the plugin
- **No `console.log` in production code** — use structured logging (matching eslint `no-console: error`)
- **No emojis in code/comments** unless user explicitly asks
- **No synchronous MCP connections at plugin load** — all MCP connections MUST be lazy/on-demand to stay within 10s timeout
- **No MCP state persistence across sessions** — MCP connections are ephemeral per-session
- **No direct `.backlog/` file manipulation** — always go through Backlog.md MCP tools
- **No custom sprint state machine on top of Backlog.md** — use Backlog.md's native task lifecycle
- **No MCP connection pooling from scratch** — use `@modelcontextprotocol/sdk`'s built-in client
- **No MCP authentication beyond oh-my-openagent's patterns** — Bearer tokens, API keys only
- **No loose files in `.gstack/` root** — everything goes into concern-specific subdirectories (except flag files)
- **Backlog.md is a TOOL not a dependency** — plugin MUST work without Backlog.md CLI installed (graceful degradation)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision

- **Infrastructure exists**: YES (vitest in devDeps)
- **Automated tests**: YES (TDD — RED-GREEN-REFACTOR)
- **Framework**: vitest (project convention per AGENTS.md)
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy

Every task MUST include agent-executed QA scenarios (see TODO template below).
Evidence saved to `.gstack/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Library/Module**: Use Bash (bun/vitest) — Import, call functions, compare output
- **CLI**: Use interactive_bash (tmux) — Run command, send keystrokes, validate output
- **Build**: Use Bash — Run build, verify output files exist and are importable
- **Config**: Use Bash — Create config fixtures, verify parsing and validation
- **MCP**: Use Bash — Verify MCP config objects have correct structure, lazy init doesn't block

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Each wave completes before the next begins.
> Target: 5-8 tasks per wave. Fewer than 3 per wave (except final) = under-splitting.

```
Wave 1 (Foundation — deps, types, shared utilities):
├── Task 1: Add runtime deps + fix tsconfig + build scripts [quick]
├── Task 2: Shared utilities (logger, deep-merge, path-helpers) [quick]
├── Task 3: Core type definitions (BuiltinSkill, AgentConfig, MCP types) [quick]
├── Task 4: Config Zod v4 schema definitions (incl. MCP + backlog settings) [quick]
├── Task 5: Skill template adapter (gstack→OpenCode content transform) [unspecified-high]

Wave 2 (Config + Plugin Shell + MCP — core infrastructure):
├── Task 6: Config loader (JSONC parse, multi-level merge, Zod validate) [deep]
├── Task 7: Plugin entry point skeleton (5-step init pattern) [quick]
├── Task 8: Plugin interface (hook handler assembly) [quick]
├── Task 9: Config handler (agent + skill + tool + MCP registration) [unspecified-high]
├── Task 32: MCP factory + 5 individual MCP configs [unspecified-high]
├── Task 33: MCP config handler (3-tier merge: built-in → user → skill-embedded) [deep]

Wave 3 (Skills Batch 1 — non-browser skills, 8 skills):
├── Task 10: Skills — Planning group (office-hours, plan-ceo-review, plan-eng-review, plan-design-review) [unspecified-high]
├── Task 11: Skills — Review group (review, design-consultation) [unspecified-high]
├── Task 12: Skills — Safety group (careful, freeze, guard, unfreeze) [unspecified-high]
├── Task 13: Skills — Utility group (investigate, retro) [unspecified-high]
├── Task 14: Skill registry + createBuiltinSkills() factory [quick]

Wave 4 (Skills Batch 2 + Agent Definitions — remaining skills + agents):
├── Task 15: Skills — Deploy group (ship, land-and-deploy, setup-deploy, document-release) [unspecified-high]
├── Task 16: Skills — Browser-dependent group (browse, qa, qa-only, design-review, benchmark, canary, setup-browser-cookies, upgrade) [unspecified-high]
├── Task 17: Agent definitions — Core agents (CEO, Eng Manager, Designer, Builder, Reviewer, Debugger) [deep]
├── Task 18: Agent definitions — Support agents (QA Lead, Release Engineer, Doc Engineer, Retro Lead, Safety Guard, Upgrader, Session Manager) [deep]
├── Task 19: Agent registry + createGstackAgents() factory [quick]

Wave 5 (Orchestrator + Integration + MCP wiring):
├── Task 20: Orchestrator — Intent classifier (user intent → sprint phase → agent) [deep]
├── Task 21: Orchestrator — Agent delegation engine [deep]
├── Task 22: SkillMcpManager — per-session MCP connections [deep]
├── Task 23: Plugin integration — Wire skills + agents + config + orchestrator + MCPs [deep]
├── Task 24: CLI — install + doctor commands [unspecified-high]
├── Task 25: Local analytics (JSONL telemetry tracking) [quick]
├── Task 26: Workspace state manager (boulder, sessions, notepads, review dashboard) [deep]
├── Task 34: Sprint-backlog integration (orchestrator↔Backlog.md lifecycle) [deep]

Wave 6 (Browser + Build + Distribution):
├── Task 27: Build pipeline + package.json finalization [quick]
├── Task 28: Browser daemon port — core server (Playwright + Bun.serve) [deep]
├── Task 29: Browser daemon port — commands + snapshot + ref system [deep]
├── Task 30: Upstream sync script [unspecified-high]
├── Task 31: CI/CD workflows (ci.yml, publish.yml) [quick]
├── Task 35: Platform binary packaging (publish-platform.yml + optionalDeps) [unspecified-high]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real QA — plugin loads in OpenCode (unspecified-high)
├── Task F4: Scope fidelity check (deep)

Critical Path: T1 → T3 → T6 → T10 → T17 → T20 → T23 → T27 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 8 (Wave 5)
```

### Dependency Matrix

| Task  | Depends On                 | Blocks                   | Wave  |
| ----- | -------------------------- | ------------------------ | ----- |
| 1     | —                          | 2-5, all                 | 1     |
| 2     | 1                          | 6, 23, 26                | 1     |
| 3     | 1                          | 4, 5, 6-9, 10-19, 23, 32 | 1     |
| 4     | 3                          | 6                        | 1     |
| 5     | 3                          | 10-16                    | 1     |
| 6     | 2, 3, 4                    | 7, 9, 23                 | 2     |
| 7     | 3, 6                       | 23                       | 2     |
| 8     | 3, 7                       | 23                       | 2     |
| 9     | 3, 6, 32, 33               | 23                       | 2     |
| 32    | 1, 3                       | 9, 33, 22                | 2     |
| 33    | 3, 32                      | 9, 22, 23                | 2     |
| 10    | 3, 5                       | 14, 23                   | 3     |
| 11    | 3, 5                       | 14, 23                   | 3     |
| 12    | 3, 5                       | 14, 23                   | 3     |
| 13    | 3, 5                       | 14, 23                   | 3     |
| 14    | 3, 10-13                   | 23                       | 3     |
| 15    | 3, 5                       | 23                       | 4     |
| 16    | 3, 5                       | 23                       | 4     |
| 17    | 3                          | 19, 20                   | 4     |
| 18    | 3                          | 19, 20                   | 4     |
| 19    | 3, 17, 18                  | 23                       | 4     |
| 20    | 17, 18                     | 23                       | 5     |
| 21    | 17, 18, 20                 | 23                       | 5     |
| 22    | 32, 33                     | 23                       | 5     |
| 23    | 6-9, 14, 19-22, 26, 33, 34 | 27, F1-F4                | 5     |
| 24    | 6                          | 27                       | 5     |
| 25    | 2, 3                       | 23                       | 5     |
| 26    | 2, 3                       | 23                       | 5     |
| 34    | 32, 3                      | 23                       | 5     |
| 27    | 23                         | 31, 35, F1-F4            | 6     |
| 28    | 1, 3                       | 29                       | 6     |
| 29    | 28                         | 23 (optional)            | 6     |
| 30    | 5                          | —                        | 6     |
| 31    | 27                         | —                        | 6     |
| 35    | 27, 31                     | —                        | 6     |
| F1-F4 | ALL                        | —                        | FINAL |

### Agent Dispatch Summary

| Wave  | Tasks | Dispatch                                                                                                          |
| ----- | ----- | ----------------------------------------------------------------------------------------------------------------- |
| 1     | 5     | T1 → `quick`, T2 → `quick`, T3 → `quick`, T4 → `quick`, T5 → `unspecified-high`                                   |
| 2     | 6     | T6 → `deep`, T7 → `quick`, T8 → `quick`, T9 → `unspecified-high`, T32 → `unspecified-high`, T33 → `deep`          |
| 3     | 5     | T10-T13 → `unspecified-high`, T14 → `quick`                                                                       |
| 4     | 5     | T15-T16 → `unspecified-high`, T17-T18 → `deep`, T19 → `quick`                                                     |
| 5     | 8     | T20-T21 → `deep`, T22 → `deep`, T23 → `deep`, T24 → `unspecified-high`, T25 → `quick`, T26 → `deep`, T34 → `deep` |
| 6     | 6     | T27 → `quick`, T28-T29 → `deep`, T30 → `unspecified-high`, T31 → `quick`, T35 → `unspecified-high`                |
| FINAL | 4     | F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`                                      |

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [x] 1. Add runtime dependencies and fix tsconfig/build scripts

  **What to do**:
  - Add runtime dependencies to `package.json`:
    - `@opencode-ai/plugin` (^1.2.24), `@opencode-ai/sdk` (^1.2.24)
    - `zod` (^4.1.8), `jsonc-parser` (^3.3.1), `commander` (^14.0.2)
    - `picocolors` (^1.1.1), `diff` (^8.0.3)
    - `@modelcontextprotocol/sdk` (^1.25.2)
    - `playwright` (keep version from gstack's package.json)
  - Add `bun-types` to devDependencies (pin to match oh-my-openagent: 1.3.10)
  - Add `typescript` to devDependencies (^5.7.3)
  - Update `tsconfig.json`:
    - Add `"declaration": true`, `"emitDeclarationOnly": true`
    - Add `"outDir": "dist"`, `"rootDir": "src"`
    - Remove `"noEmit": true`
    - Keep `"types": ["bun-types"]`, remove `@types/node` from devDeps
  - Add build scripts to `package.json`:
    - `"build": "bun build src/index.ts --outdir dist --target bun --format esm && tsc --emitDeclarationOnly"`
    - `"build:cli": "bun build src/cli/index.ts --outdir dist/cli --target bun --format esm"`
    - `"typecheck": "tsc --noEmit"` (separate from build)
    - `"clean": "rm -rf dist"`
    - `"prepublishOnly": "bun run clean && bun run build"`
  - Add `"main": "dist/index.js"`, `"types": "dist/index.d.ts"` to package.json
  - Add `"bin": { "gstack": "bin/gstack.js" }`
  - Create `bin/gstack.js` (shebang + dynamic import of dist/cli/index.js)
  - Write tests: verify package.json has all required deps, tsconfig fields are correct

  **Must NOT do**:
  - Do NOT add `@types/node` — we use `bun-types` exclusively
  - Do NOT add `@ast-grep/napi` or `@ast-grep/cli` — not needed for gstack
  - Do NOT change the `"name"` field — keep `@nntoan/gstack`
  - Do NOT add any platform-specific optional dependencies yet (Wave 6)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward dependency addition and config file edits — no complex logic
  - **Skills**: []
    - No specialized skills needed for package.json/tsconfig edits
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed — no git operations in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: All subsequent tasks (every task depends on deps being installed)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/package.json` — Exact dependency versions, build scripts pattern, bin config, exports pattern
  - `researchs/oh-my-openagent/bin/oh-my-opencode.js` — CLI shebang pattern

  **API/Type References**:
  - `package.json` (current project) — Current state to modify
  - `tsconfig.json` (current project) — Current state to modify

  **External References**:
  - OpenCode Plugin docs: https://opencode.ai/docs/plugins — Plugin packaging requirements

  **WHY Each Reference Matters**:
  - `oh-my-openagent/package.json` — Copy exact dep versions and build script patterns proven to work with OpenCode plugin loading
  - Current `package.json` — Know what's already there to avoid duplicates
  - Current `tsconfig.json` — Must update in-place (add declaration, remove noEmit)

  **Acceptance Criteria**:
  - [ ] `bun install` succeeds with zero errors
  - [ ] `bun run typecheck` (tsc --noEmit) succeeds
  - [ ] `bun run build` produces `dist/index.js`
  - [ ] `bin/gstack.js` exists with correct shebang
  - [ ] Test: package.json contains all 8 runtime deps
  - [ ] Test: tsconfig.json has declaration: true and no noEmit

  **QA Scenarios**:

  ```
  Scenario: Dependencies install correctly
    Tool: Bash
    Preconditions: Clean project state
    Steps:
      1. Run `bun install` in project root
      2. Verify exit code is 0
      3. Check `node_modules/@opencode-ai/plugin` directory exists
      4. Check `node_modules/@modelcontextprotocol/sdk` directory exists
      5. Check `node_modules/zod` directory exists
    Expected Result: All dependencies installed, node_modules contains all 8 runtime deps
    Failure Indicators: Non-zero exit code, missing node_modules subdirectories
    Evidence: .gstack/evidence/task-1-deps-install.txt

  Scenario: Build produces valid output
    Tool: Bash
    Preconditions: Dependencies installed, src/index.ts exists (even if empty export)
    Steps:
      1. Run `bun run build`
      2. Check `dist/index.js` exists
      3. Check `dist/index.d.ts` exists
      4. Run `bun -e "import p from './dist/index.js'; console.log(typeof p)"`
    Expected Result: Build succeeds, dist/ contains both .js and .d.ts files
    Failure Indicators: Build errors, missing dist/ files
    Evidence: .gstack/evidence/task-1-build-output.txt
  ```

  **Commit**: YES
  - Message: `chore(deps): add runtime dependencies and fix tsconfig`
  - Files: `package.json`, `tsconfig.json`, `bin/gstack.js`, `bun.lock`
  - Pre-commit: `bun run typecheck`

- [x] 2. Shared utilities — logger, deep-merge, path-helpers

  **What to do**:
  - Create `src/shared/logger.ts`:
    - `log(message, data?)` function that writes to `/tmp/gstack.log`
    - Uses `Bun.file()` for write, includes ISO timestamp
    - Match oh-my-openagent's log pattern (no console.log — eslint `no-console: error`)
  - Create `src/shared/deep-merge.ts`:
    - `deepMerge<T>(base: T, override: Partial<T>): T` — recursive object merge
    - Arrays: override replaces (not concat), objects: recursive merge
    - Handles `null`, `undefined`, primitives correctly
  - Create `src/shared/path-helpers.ts`:
    - `getGstackDir(projectDir: string): string` → `{projectDir}/.gstack`
    - `getBrowserDir(projectDir: string): string` → `{projectDir}/.gstack/browser`
    - `getOrchestratorDir(projectDir: string): string` → `{projectDir}/.gstack/orchestrator`
    - `getPlansDir(projectDir: string): string` → `{projectDir}/.gstack/plans`
    - `getNotepadsDir(projectDir: string, planName: string): string` → `{projectDir}/.gstack/notepads/{planName}`
    - `getEvidenceDir(projectDir: string): string` → `{projectDir}/.gstack/evidence`
    - `getReviewsDir(projectDir: string): string` → `{projectDir}/.gstack/reviews`
    - `getSessionsDir(projectDir: string): string` → `{projectDir}/.gstack/sessions`
    - `getAnalyticsDir(projectDir: string): string` → `{projectDir}/.gstack/analytics`
    - `getRulesDir(projectDir: string): string` → `{projectDir}/.gstack/rules`
    - `getDesignDocsDir(projectDir: string): string` → `{projectDir}/.gstack/design-docs`
    - `getBrowseStatePath(projectDir: string): string` → `{projectDir}/.gstack/browser/browse.json`
    - `getBoulderPath(projectDir: string): string` → `{projectDir}/.gstack/orchestrator/boulder.json`
    - `getStatePath(projectDir: string): string` → `{projectDir}/.gstack/orchestrator/state.json`
    - `getSprintLogPath(projectDir: string): string` → `{projectDir}/.gstack/orchestrator/sprint-log.jsonl`
    - `getBacklogDir(projectDir: string): string` → `{projectDir}/.backlog` (project root, NOT in .gstack)
    - `ensureDir(dirPath: string): Promise<void>` — mkdir -p equivalent using Bun
  - Create `src/shared/index.ts` — barrel exports for all shared utilities
  - Write TDD tests for each utility function

  **Must NOT do**:
  - Do NOT create a catch-all `utils.ts` — each utility gets its own file
  - Do NOT use `console.log` — use the logger
  - Do NOT put `.backlog/` inside `.gstack/` — it stays at project root

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small utility functions with clear specifications — no architectural decisions needed
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Tasks 6, 23, 26 (config loader, plugin integration, workspace manager use path-helpers)
  - **Blocked By**: Task 1 (needs Bun types installed)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/shared/` — Overall shared module organization pattern
  - `researchs/oh-my-openagent/src/shared/log.ts` — Logger implementation pattern (file-based logging)

  **API/Type References**:
  - Bun APIs: `Bun.file()`, `Bun.write()`, `mkdir()` from `node:fs/promises`

  **WHY Each Reference Matters**:
  - `oh-my-openagent/src/shared/` — Shows how to organize shared utilities as individual files with barrel export, matching the 200 LOC/single-responsibility rule
  - Logger pattern — Must match file-based logging (no console.log) since eslint enforces `no-console: error`

  **Acceptance Criteria**:
  - [ ] `bun test src/shared/` — all tests pass
  - [ ] Logger writes to `/tmp/gstack.log`
  - [ ] deepMerge handles nested objects, arrays, null/undefined
  - [ ] All 17 path-helper functions return correct paths
  - [ ] `getBacklogDir()` returns `{dir}/.backlog` (NOT `.gstack/.backlog`)
  - [ ] `ensureDir()` creates nested directories

  **QA Scenarios**:

  ```
  Scenario: Path helpers return correct .gstack subdirectory paths
    Tool: Bash (bun REPL)
    Preconditions: src/shared/ modules exist and compile
    Steps:
      1. Run `bun -e "import { getBrowserDir, getBoulderPath, getBacklogDir } from './src/shared/index.ts'; console.log(getBrowserDir('/tmp/test')); console.log(getBoulderPath('/tmp/test')); console.log(getBacklogDir('/tmp/test'))"`
      2. Assert output line 1 is `/tmp/test/.gstack/browser`
      3. Assert output line 2 is `/tmp/test/.gstack/orchestrator/boulder.json`
      4. Assert output line 3 is `/tmp/test/.backlog`
    Expected Result: All paths match expected structure with .gstack subdirectories
    Failure Indicators: Paths don't contain subdirectory structure, .backlog inside .gstack
    Evidence: .gstack/evidence/task-2-path-helpers.txt

  Scenario: Deep merge handles nested objects correctly
    Tool: Bash (bun REPL)
    Preconditions: src/shared/deep-merge.ts exists
    Steps:
      1. Run `bun -e "import { deepMerge } from './src/shared/deep-merge.ts'; const r = deepMerge({a: {b: 1, c: 2}}, {a: {b: 99}}); console.log(JSON.stringify(r))"`
      2. Assert output is `{"a":{"b":99,"c":2}}`
    Expected Result: Nested object merged recursively — b overridden, c preserved
    Failure Indicators: c missing (shallow merge), or b not overridden
    Evidence: .gstack/evidence/task-2-deep-merge.txt
  ```

  **Commit**: YES
  - Message: `feat(shared): add logger, deep-merge, and path helpers`
  - Files: `src/shared/logger.ts`, `src/shared/deep-merge.ts`, `src/shared/path-helpers.ts`, `src/shared/index.ts`, `src/shared/*.test.ts`
  - Pre-commit: `bun test src/shared/`

- [x] 3. Core type definitions — BuiltinSkill, AgentConfig, SprintPhase, MCP types

  **What to do**:
  - Create `src/types.ts` — barrel re-exports from `src/types/` directory
  - Create `src/types/skill.ts`:
    - `BuiltinSkill` interface matching oh-my-openagent's pattern: `{ name, description, template, allowedTools?, mcpConfig?, agent?, model?, subtask?, argumentHint?, license?, compatibility?, metadata? }`
    - `SkillGroup` type: `'planning' | 'review' | 'safety' | 'utility' | 'deploy' | 'browser'`
    - `GstackSkill` interface extending `BuiltinSkill` with `{ group: SkillGroup, originalSkillName: string, browserRequired: boolean }`
  - Create `src/types/agent.ts`:
    - `SprintPhase` type: `'think' | 'plan' | 'build' | 'review' | 'test' | 'ship' | 'reflect' | 'cross-cutting' | 'utility'`
    - `AgentRole` type: `'ceo' | 'eng-manager' | 'designer' | 'builder' | 'reviewer' | 'debugger' | 'qa-lead' | 'release-engineer' | 'doc-engineer' | 'retro-lead' | 'safety-guard' | 'upgrader' | 'session-manager'`
    - `GstackAgent` interface: `{ role: AgentRole, name: string, description: string, sprintPhase: SprintPhase, skills: string[], instructions: string, model?: string, subtask?: boolean }`
  - Create `src/types/config.ts`:
    - `OrchestrationMode` type: `'multi-agent' | 'skills-only'`
    - `GstackConfig` interface (full config shape — used by Zod schema in Task 4)
    - `BacklogConfig` type: `{ enabled: boolean, auto_create_tasks: boolean, auto_update_status: boolean }`
  - Create `src/types/mcp.ts`:
    - `McpServerConfig` type: `{ type: 'remote' | 'stdio', url?: string, command?: string, args?: string[], enabled: boolean, headers?: Record<string, string>, oauth?: false }`
    - `McpName` type: `'websearch' | 'context7' | 'contexthub' | 'grep_app' | 'backlog_md'`
    - `McpTier` type: `'builtin' | 'user' | 'skill-embedded'`
  - Create `src/types/orchestrator.ts`:
    - `UserIntent` interface: `{ raw: string, phase: SprintPhase, confidence: number }`
    - `DelegationResult` interface: `{ agent: AgentRole, skills: string[], reasoning: string }`
    - `BoulderState`, `SprintLogEntry`, `SessionState` interfaces
  - Write tests for type compilation (import and verify types compile)

  **Must NOT do**:
  - Do NOT put all types in a single file — split by domain (skill, agent, config, mcp, orchestrator)
  - Do NOT use `any` — all types must be explicit
  - Do NOT add runtime logic to type files — types only (interfaces, type aliases)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure type definitions — no runtime logic, just TypeScript interfaces
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None — type definition is straightforward

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Tasks 4-9, 10-19, 23, 32 (nearly everything depends on types)
  - **Blocked By**: Task 1 (needs `@opencode-ai/plugin` types, `@modelcontextprotocol/sdk` types)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/features/builtin-skills/types.ts` — BuiltinSkill interface (MUST match exactly for OpenCode compatibility)
  - `researchs/oh-my-openagent/src/features/skill-mcp-manager/types.ts` — MCP client types pattern

  **API/Type References**:
  - `@opencode-ai/plugin` — Plugin type for type compatibility
  - `@modelcontextprotocol/sdk` — Client, Tool, Resource types for MCP

  **WHY Each Reference Matters**:
  - `oh-my-openagent/builtin-skills/types.ts` — BuiltinSkill interface MUST be compatible with OpenCode's skill loading — copy exact shape
  - `oh-my-openagent/skill-mcp-manager/types.ts` — MCP types must align with how SkillMcpManager expects them

  **Acceptance Criteria**:
  - [ ] `bun run typecheck` passes with zero errors
  - [ ] All type files compile independently
  - [ ] `BuiltinSkill` interface matches oh-my-openagent's shape
  - [ ] Test: types can be imported and used in type annotations

  **QA Scenarios**:

  ```
  Scenario: All types compile and are importable
    Tool: Bash
    Preconditions: All src/types/*.ts files created
    Steps:
      1. Run `bun run typecheck`
      2. Verify exit code is 0
      3. Run `bun -e "import type { BuiltinSkill, GstackAgent, SprintPhase, McpName } from './src/types.ts'; console.log('types OK')"`
      4. Assert output contains "types OK"
    Expected Result: Zero type errors, all types importable
    Failure Indicators: tsc errors, import failures
    Evidence: .gstack/evidence/task-3-types-compile.txt

  Scenario: BuiltinSkill is compatible with oh-my-openagent shape
    Tool: Bash
    Preconditions: src/types/skill.ts exists
    Steps:
      1. Run `bun -e "import type { BuiltinSkill } from './src/types/skill.ts'; const s: BuiltinSkill = { name: 'test', description: 'test', template: 'test' }; console.log('compatible')"`
      2. Assert output contains "compatible"
    Expected Result: Minimal BuiltinSkill (name, description, template) compiles — same as oh-my-openagent
    Failure Indicators: Type error requiring additional mandatory fields
    Evidence: .gstack/evidence/task-3-builtin-skill-compat.txt
  ```

  **Commit**: YES
  - Message: `feat(types): add core type definitions`
  - Files: `src/types.ts`, `src/types/skill.ts`, `src/types/agent.ts`, `src/types/config.ts`, `src/types/mcp.ts`, `src/types/orchestrator.ts`, `src/types/*.test.ts`
  - Pre-commit: `bun run typecheck`

- [x] 4. Config Zod v4 schema definitions (incl. MCP + backlog settings)

  **What to do**:
  - Create `src/config/schema/index.ts` — barrel exports
  - Create `src/config/schema/main.ts`:
    - `GstackConfigSchema` — top-level Zod v4 schema with all config fields
    - Default `orchestration_mode: 'multi-agent'`
    - Include `disabled_skills: z.array(z.string()).default([])`, `disabled_agents: z.array(z.string()).default([])`, `disabled_mcps: z.array(z.string()).default([])`, `disabled_hooks: z.array(z.string()).default([])`
  - Create `src/config/schema/agent-schema.ts`:
    - Per-agent override schema: `{ model?, instructions?, enabled? }`
    - `AgentOverridesSchema` — Record of agent role → override config
  - Create `src/config/schema/mcp-schema.ts`:
    - `McpConfigSchema` — per-MCP config: `{ enabled: boolean, url?: string, api_key?: string }`
    - `websearch: { provider: 'exa' | 'tavily', api_key? }`
    - `context7: { api_key? }`
    - `contexthub: { enabled }`
    - `grep_app: { enabled }`
    - `backlog_md: { enabled }`
  - Create `src/config/schema/backlog-schema.ts`:
    - `BacklogConfigSchema`: `{ enabled: z.boolean().default(true), auto_create_tasks: z.boolean().default(true), auto_update_status: z.boolean().default(true) }`
  - Create `src/config/schema/browser-schema.ts`:
    - `BrowserConfigSchema`: `{ headless: z.boolean().default(true), timeout_ms: z.number().default(30000) }`
  - Create `src/config/schema/telemetry-schema.ts`:
    - `TelemetryConfigSchema`: `{ enabled: z.boolean().default(true), supabase: z.object({...}).optional() }`
  - Create `scripts/generate-schema.ts`:
    - Import `GstackConfigSchema` from `src/config/schema/main.ts`
    - Use Zod v4's built-in `z.toJsonSchema(GstackConfigSchema)` to generate JSON Schema
    - Inject `"$schema": "https://json-schema.org/draft/2020-12/schema"` and `"$id": "https://raw.githubusercontent.com/nntoan/opencode-gstack/main/schemas/config.schema.json"` at top level
    - Write output to `schemas/config.schema.json` (pretty-printed, 2-space indent)
    - Also export `SCHEMA_URL = "https://raw.githubusercontent.com/nntoan/opencode-gstack/main/schemas/config.schema.json"` from `src/config/schema/constants.ts` for use by CLI install command
  - Create `schemas/config.schema.json` — generated JSON Schema file (committed to repo, regenerated on schema changes)
  - Add `"generate:schema": "bun scripts/generate-schema.ts"` to package.json scripts
  - Write TDD tests: verify schema parsing, defaults, validation errors, JSON Schema generation output matches Zod schema

  **Must NOT do**:
  - Do NOT put all schemas in one file — split by concern (200 LOC rule)
  - Do NOT use Zod v3 API — must use Zod v4 syntax (z.object, z.string, etc.)
  - Do NOT hard-code agent models — models are user-configurable via overrides

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema definitions are declarative — no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None — schema work is straightforward

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Task 6 (config loader validates against schema)
  - **Blocked By**: Task 3 (needs config type definitions), Task 1 (needs zod installed)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/config/schema/` — Schema organization pattern (split by concern)
  - `researchs/oh-my-openagent/src/config/schema/root-schema.ts` — Top-level config schema with defaults

  **API/Type References**:
  - `src/types/config.ts` (from Task 3) — Config type to implement schema against
  - `src/types/mcp.ts` (from Task 3) — McpName type for schema validation

  **External References**:
  - Zod v4 docs: https://zod.dev — Schema API reference

  **WHY Each Reference Matters**:
  - `oh-my-openagent/config/schema/` — Shows how to split schemas by concern while maintaining barrel exports. Must follow same organization
  - Config types from Task 3 — Schema must produce objects matching these TypeScript types

  **Acceptance Criteria**:
  - [ ] `bun test src/config/` — all schema tests pass
  - [ ] Schema parses valid config with correct defaults
  - [ ] Schema rejects invalid config with descriptive errors
  - [ ] `orchestration_mode` defaults to `'multi-agent'`
  - [ ] `backlog.enabled` defaults to `true`
  - [ ] All 5 MCP names have schema entries
  - [ ] `schemas/config.schema.json` exists and is valid JSON Schema
  - [ ] `bun scripts/generate-schema.ts` regenerates schema without errors
  - [ ] Generated JSON Schema `$id` points to GitHub raw URL

  **QA Scenarios**:

  ```
  Scenario: Schema provides correct defaults for empty config
    Tool: Bash (bun REPL)
    Preconditions: src/config/schema/ exists
    Steps:
      1. Run `bun -e "import { GstackConfigSchema } from './src/config/schema/index.ts'; const r = GstackConfigSchema.parse({}); console.log(r.orchestration_mode); console.log(r.backlog.enabled); console.log(r.disabled_mcps.length)"`
      2. Assert line 1 is `multi-agent`
      3. Assert line 2 is `true`
      4. Assert line 3 is `0`
    Expected Result: Empty object parsed with all defaults filled in
    Failure Indicators: Parse error, wrong defaults
    Evidence: .gstack/evidence/task-4-schema-defaults.txt

  Scenario: Schema rejects invalid orchestration_mode
    Tool: Bash (bun REPL)
    Preconditions: Schema exists
    Steps:
      1. Run `bun -e "import { GstackConfigSchema } from './src/config/schema/index.ts'; try { GstackConfigSchema.parse({orchestration_mode: 'invalid'}); console.log('FAIL') } catch(e) { console.log('REJECTED') }"`
      2. Assert output is `REJECTED`
    Expected Result: Invalid enum value rejected with Zod error
    Failure Indicators: Output is `FAIL` (schema accepted invalid value)
    Evidence: .gstack/evidence/task-4-schema-reject.txt

  Scenario: JSON Schema generation produces valid schema file
    Tool: Bash
    Preconditions: Zod schemas exist in src/config/schema/
    Steps:
      1. Run `bun scripts/generate-schema.ts`
      2. Assert exit code is 0
      3. Run `bun -e "const s = JSON.parse(await Bun.file('schemas/config.schema.json').text()); console.log(s['$id']); console.log(s.type); console.log('orchestration_mode' in (s.properties || {}))"`
      4. Assert line 1 contains `raw.githubusercontent.com/nntoan/opencode-gstack`
      5. Assert line 2 is `object`
      6. Assert line 3 is `true`
    Expected Result: Valid JSON Schema generated with correct $id URL and all config properties
    Failure Indicators: Missing $id, wrong type, missing properties
    Evidence: .gstack/evidence/task-4-json-schema-gen.txt
  ```

  **Commit**: YES
  - Message: `feat(config): add Zod v4 schema definitions and JSON Schema generation`
  - Files: `src/config/schema/*.ts`, `scripts/generate-schema.ts`, `schemas/config.schema.json`
  - Pre-commit: `bun test src/config/`

- [x] 5. Skill template adapter — gstack→OpenCode content transform

  **What to do**:
  - Create `src/features/skill-adapter/index.ts` — barrel exports
  - Create `src/features/skill-adapter/template-resolver.ts`:
    - `resolveTemplate(templateContent: string, placeholders: Record<string, string>): string`
    - Replaces `{{PLACEHOLDER_NAME}}` patterns with provided values
    - Handles all 9 gstack placeholders: PREAMBLE, COMMAND_REFERENCE, SNAPSHOT_FLAGS, BROWSE_SETUP, BASE_BRANCH_DETECT, QA_METHODOLOGY, DESIGN_METHODOLOGY, REVIEW_DASHBOARD, TEST_BOOTSTRAP
    - Generates OpenCode-compatible placeholder content (not gstack/Claude Code-specific)
  - Create `src/features/skill-adapter/content-transformer.ts`:
    - `transformSkillContent(rawContent: string): string`
    - Replace `$B` binary references with inline instructions
    - Replace `~/.claude/skills/gstack/bin/` paths with plugin-internal alternatives
    - Replace `~/.gstack/` paths with `.gstack/` (project-level)
    - Remove/adapt Claude Code-specific hook references
    - Strip conductor.json references
    - Preserve all skill logic and instructions
  - Create `src/features/skill-adapter/placeholder-content.ts`:
    - Generate each of the 9 placeholder contents adapted for OpenCode context
    - `PREAMBLE` — adapted for OpenCode (no Claude Code binary refs)
    - `BROWSE_SETUP` — adapted to use plugin's browser daemon
    - `REVIEW_DASHBOARD` — adapted to use `.gstack/reviews/dashboard.json`
  - Write TDD tests with sample SKILL.md content

  **Must NOT do**:
  - Do NOT copy SKILL.md content verbatim — must adapt for OpenCode
  - Do NOT leave any `$B` or `~/.claude/` references in output
  - Do NOT modify the original gstack files in `researchs/gstack/`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires careful analysis of gstack template system, string manipulation, and understanding of what needs adaptation vs preservation
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `gitnexus-exploring`: Not useful — we're reading external research files, not our codebase

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Tasks 10-16 (all skill porting tasks depend on the adapter)
  - **Blocked By**: Task 3 (needs BuiltinSkill type), Task 1 (needs deps)

  **References**:

  **Pattern References**:
  - `researchs/gstack/scripts/gen-skill-docs.ts` — The original template generator (1927 LOC) — shows all 9 placeholders and how they're resolved
  - `researchs/gstack/.agents/skills/gstack-review/SKILL.md.tmpl` — Example template with placeholder usage

  **API/Type References**:
  - `src/types/skill.ts` (from Task 3) — BuiltinSkill interface the adapter produces

  **Test References**:
  - `researchs/gstack/.agents/skills/gstack-careful/SKILL.md` — Simple skill for testing (zero browser refs)
  - `researchs/gstack/.agents/skills/gstack-browse/SKILL.md` — Complex skill with heavy browser refs

  **WHY Each Reference Matters**:
  - `gen-skill-docs.ts` — MUST understand all 9 placeholder names and their content to generate OpenCode-compatible replacements
  - Example SKILL.md files — Need real content to write meaningful adapter tests and verify $B/path replacement

  **Acceptance Criteria**:
  - [ ] `bun test src/features/skill-adapter/` — all tests pass
  - [ ] `resolveTemplate()` replaces all 9 placeholder patterns
  - [ ] `transformSkillContent()` removes all `$B` references
  - [ ] `transformSkillContent()` removes all `~/.claude/skills/gstack/` paths
  - [ ] Output contains no Claude Code-specific references
  - [ ] Skill logic and instructions are preserved after transformation

  **QA Scenarios**:

  ```
  Scenario: Template resolver replaces all placeholders
    Tool: Bash (bun REPL)
    Preconditions: src/features/skill-adapter/ exists
    Steps:
      1. Create test template: `"# Skill\n{{PREAMBLE}}\n## Setup\n{{BROWSE_SETUP}}"`
      2. Run resolveTemplate with placeholder values
      3. Assert output contains no `{{` or `}}` patterns
      4. Assert output contains the replacement content
    Expected Result: All placeholders replaced, no unreplaced patterns remain
    Failure Indicators: Unreplaced `{{...}}` patterns in output
    Evidence: .gstack/evidence/task-5-template-resolve.txt

  Scenario: Content transformer strips Claude Code references
    Tool: Bash (bun REPL)
    Preconditions: Transformer exists
    Steps:
      1. Input: `"Run $B config get foo\nCheck ~/.claude/skills/gstack/bin/browse.sh"`
      2. Run transformSkillContent on input
      3. Assert output does NOT contain `$B`
      4. Assert output does NOT contain `~/.claude/skills/gstack/`
    Expected Result: All Claude Code-specific references removed or replaced
    Failure Indicators: $B or ~/.claude/ paths remain in output
    Evidence: .gstack/evidence/task-5-content-transform.txt
  ```

  **Commit**: YES
  - Message: `feat(skills): add skill template adapter`
  - Files: `src/features/skill-adapter/*.ts`
  - Pre-commit: `bun test src/features/skill-adapter/`

- [x] 6. Config loader — JSONC parse, multi-level merge, Zod validate

  **What to do**:
  - Create `src/plugin-config.ts`:
    - `loadPluginConfig(projectDir: string, ctx: PluginContext): GstackConfig`
    - Load JSONC config from 2 locations (project overrides user):

1. User: `~/.config/opencode/gstack.jsonc` (or `.json`)
2. Project: `.opencode/gstack.jsonc` (or `.json`)
   - Use `jsonc-parser` for JSONC parsing (handles comments, trailing commas)
   - Use `deepMerge()` from Task 2 for multi-level merge
   - Use `GstackConfigSchema.parse()` from Task 4 for validation
   - Return validated config with all defaults filled in
   - Handle missing config files gracefully (use defaults)
   - Handle invalid config with descriptive error messages

- Create `src/config/merge-configs.ts`:
  - `mergeConfigs(userConfig: Partial<GstackConfig>, projectConfig: Partial<GstackConfig>): Partial<GstackConfig>`
  - `agents`, `mcp` objects: deep merged recursively
  - `disabled_*` arrays: Set union (concatenated + deduplicated)
  - All other fields: project overrides user
- Write TDD tests with config fixtures (valid, invalid, partial, missing)

**Must NOT do**:

- Do NOT use `JSON.parse` — must use `jsonc-parser` for comment support
- Do NOT throw on missing config files — use defaults
- Do NOT log config contents (may contain API keys)

**Recommended Agent Profile**:

- **Category**: `deep`
  - Reason: Config loading is a critical path with edge cases (missing files, invalid JSON, merge logic, error handling)
- **Skills**: []
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 32, 33)
- **Blocks**: Tasks 7, 9, 23 (plugin entry, config handler, integration all need config)
- **Blocked By**: Tasks 2 (deep-merge), 3 (types), 4 (schema)

**References**:

**Pattern References**:

- `researchs/oh-my-openagent/src/plugin-config.ts` — JSONC config loading pattern, multi-level merge, Zod validation
- `researchs/oh-my-openagent/src/plugin-handlers/config-handler.ts` — 6-phase config handler (we'll simplify)

**API/Type References**:

- `src/config/schema/` (from Task 4) — GstackConfigSchema for validation
- `src/shared/deep-merge.ts` (from Task 2) — deepMerge utility

**External References**:

- `jsonc-parser` npm: https://www.npmjs.com/package/jsonc-parser — JSONC parsing API

**WHY Each Reference Matters**:

- `oh-my-openagent/plugin-config.ts` — Shows exact pattern for multi-level JSONC config loading that works with OpenCode plugin lifecycle
- Config schema from Task 4 — Validation target

**Acceptance Criteria**:

- [ ] `bun test src/plugin-config.test.ts` — all tests pass
- [ ] Loads config from user + project locations
- [ ] Handles missing config files (returns defaults)
- [ ] Handles invalid JSONC (descriptive error)
- [ ] `disabled_*` arrays are Set-unioned (deduplicated)
- [ ] Deep merges agent/mcp config

**QA Scenarios**:

```
Scenario: Config loader returns defaults when no config file exists
  Tool: Bash (bun REPL)
  Preconditions: No .opencode/gstack.jsonc exists
  Steps:
    1. Run `bun -e "import { loadPluginConfig } from './src/plugin-config.ts'; const c = loadPluginConfig('/tmp/nonexistent', {} as any); console.log(c.orchestration_mode)"`
    2. Assert output is `multi-agent`
  Expected Result: Default config returned without errors
  Failure Indicators: Error thrown, or wrong default value
  Evidence: .gstack/evidence/task-6-config-defaults.txt

Scenario: Config loader merges user and project configs
  Tool: Bash
  Preconditions: Test fixtures created
  Steps:
    1. Create temp dir with user config: `{ "orchestration_mode": "skills-only" }`
    2. Create project config: `{ "disabled_mcps": ["websearch"] }`
    3. Load config, verify orchestration_mode is "skills-only" AND disabled_mcps contains "websearch"
  Expected Result: Both configs merged correctly
  Failure Indicators: One config overrides the other entirely
  Evidence: .gstack/evidence/task-6-config-merge.txt
```

**Commit**: YES

- Message: `feat(config): add JSONC config loader with multi-level merge`
- Files: `src/plugin-config.ts`, `src/config/merge-configs.ts`, `src/plugin-config.test.ts`, `src/config/merge-configs.test.ts`
- Pre-commit: `bun test src/plugin-config.test.ts src/config/`

- [x] 7. Plugin entry point skeleton — 5-step init pattern

  **What to do**:
  - Rewrite `src/index.ts` to implement the Plugin entry point:
    - Import `Plugin` type from `@opencode-ai/plugin`
    - Export `default GstackOpenCodePlugin: Plugin` (async function)
    - Implement 5-step initialization pattern:
      1. `loadPluginConfig(ctx.directory, ctx)` — from Task 6
      2. `createManagers(...)` — stub, returns empty managers object
      3. `createTools(...)` — stub, returns empty tools
      4. `createHooks(...)` — stub, returns empty hooks
      5. `createPluginInterface(...)` — from Task 8
    - Log plugin loading with `log()` from shared
    - Return plugin interface object
  - Export ONLY `default` + type re-exports (CRITICAL: OpenCode treats ALL function exports as plugin instances)
  - Create stub files: `src/create-managers.ts`, `src/create-tools.ts`, `src/create-hooks.ts`
  - Write test: plugin function is callable and returns an object

  **Must NOT do**:
  - Do NOT export functions from index.ts (only default + types)
  - Do NOT implement full hook logic yet — this is the skeleton
  - Do NOT add console.log — use logger

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Skeleton setup with stubs — minimal logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8, 9, 32, 33)
  - **Blocks**: Task 23 (plugin integration wires everything into this skeleton)
  - **Blocked By**: Tasks 3 (types), 6 (config loader)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/index.ts:20-111` — EXACT pattern to follow (5-step init, default export, type re-exports, WARNING comment about function exports)

  **WHY Each Reference Matters**:
  - `oh-my-openagent/src/index.ts` — This is THE reference. Lines 20-111 show the exact 5-step pattern. The comment on line 123-125 warns about not exporting functions.

  **Acceptance Criteria**:
  - [ ] `bun run build` succeeds
  - [ ] `bun -e "import p from './dist/index.js'; console.log(typeof p)"` outputs `"function"`
  - [ ] Only `default` export + type re-exports from index.ts
  - [ ] Plugin function is async and returns an object with hook handlers

  **QA Scenarios**:

  ```
  Scenario: Plugin loads and returns interface object
    Tool: Bash
    Preconditions: Build succeeds
    Steps:
      1. Run `bun run build`
      2. Run `bun -e "import p from './dist/index.js'; const r = await p({directory: '/tmp', client: {}, project: {}}); console.log(typeof r); console.log('config' in r)"`
      3. Assert line 1 is `object`
      4. Assert line 2 is `true`
    Expected Result: Plugin returns an object with at least a `config` handler
    Failure Indicators: Plugin throws, returns wrong type, or missing config handler
    Evidence: .gstack/evidence/task-7-plugin-load.txt
  ```

  **Commit**: YES
  - Message: `feat(plugin): add plugin entry point and interface skeleton`
  - Files: `src/index.ts`, `src/create-managers.ts`, `src/create-tools.ts`, `src/create-hooks.ts`
  - Pre-commit: `bun run build`

- [x] 8. Plugin interface — hook handler assembly

  **What to do**:
  - Create `src/plugin-interface.ts`:
    - `createPluginInterface(params): PluginInterface`
    - Assemble the 8 OpenCode hook handler types into a single return object:
      - `config` — delegates to config handler (Task 9)
      - `tool` — returns tool registry (stub initially)
      - `chat.message` — message preprocessing (stub)
      - `chat.params` — parameter adjustment (stub)
      - `event` — session lifecycle events (stub)
      - `tool.execute.before` — pre-tool hooks (stub)
      - `tool.execute.after` — post-tool hooks (stub)
    - Each handler is a function that receives input/output and can modify
    - Stub implementations that pass through without modification
  - Write tests: verify all 7 handler keys exist in returned object

  **Must NOT do**:
  - Do NOT implement hook logic — stubs only (filled in Task 23)
  - Do NOT add `chat.headers` or `chat.params` with real logic yet
  - Do NOT create catch-all handler

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Interface assembly with stubs — straightforward
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 9, 32, 33)
  - **Blocks**: Task 23 (plugin integration fills in the stubs)
  - **Blocked By**: Tasks 3 (types), 7 (plugin entry)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/plugin-interface.ts` — Plugin interface assembly pattern with all 8 hook handlers

  **WHY Each Reference Matters**:
  - `oh-my-openagent/plugin-interface.ts` — Shows exact hook handler signatures and how they compose

  **Acceptance Criteria**:
  - [ ] `bun test src/plugin-interface.test.ts` — passes
  - [ ] Returns object with `config`, `tool`, `event`, `tool.execute.before`, `tool.execute.after` keys
  - [ ] All handlers are callable functions

  **QA Scenarios**:

  ```
  Scenario: Plugin interface has all required hook handlers
    Tool: Bash (bun REPL)
    Preconditions: src/plugin-interface.ts exists
    Steps:
      1. Run `bun -e "import { createPluginInterface } from './src/plugin-interface.ts'; const pi = createPluginInterface({} as any); const keys = Object.keys(pi); console.log(keys.length >= 5); console.log(keys.includes('config')); console.log(keys.includes('tool'))"`
      2. Assert all lines are `true`
    Expected Result: Interface has at least 5 hook handlers including config and tool
    Failure Indicators: Missing handlers or wrong structure
    Evidence: .gstack/evidence/task-8-plugin-interface.txt
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `feat(plugin): add plugin entry point and interface`
  - Files: `src/plugin-interface.ts`, `src/plugin-interface.test.ts`
  - Pre-commit: `bun test src/plugin-interface.test.ts`

- [x] 9. Config handler — agent + skill + tool + MCP registration

  **What to do**:
  - Create `src/plugin-handlers/config-handler.ts`:
    - `applyConfig(params: { config, pluginConfig, skills, agents, mcps }): Promise<void>`
    - Implements the `config` hook handler — called by OpenCode to register components
    - Phase 1: Register agents (from Task 17-19 agents registry)
    - Phase 2: Register skills (from Task 14 skill registry)
    - Phase 3: Register tools (tool permissions per agent)
    - Phase 4: Apply MCP config (from Task 33 MCP config handler)
    - Phase 5: Register commands (skill → slash-command mapping)
    - Respects `orchestration_mode`: in "skills-only" mode, skip agent registration
    - Respects `disabled_skills`, `disabled_agents`, `disabled_mcps` arrays
  - Create `src/plugin-handlers/index.ts` — barrel exports
  - Write tests for each phase

  **Must NOT do**:
  - Do NOT register agents in "skills-only" mode
  - Do NOT register disabled skills/agents/MCPs
  - Do NOT block on MCP connections — config registration is synchronous

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multi-phase config handler with mode-switching logic and component wiring
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 32, 33)
  - **Blocks**: Task 23 (plugin integration)
  - **Blocked By**: Tasks 3 (types), 6 (config loader), 32 (MCP factory), 33 (MCP config handler)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/plugin-handlers/config-handler.ts` — 6-phase config handler pattern
  - `researchs/oh-my-openagent/src/plugin-handlers/agent-config-handler.ts` — Agent registration logic

  **WHY Each Reference Matters**:
  - `oh-my-openagent/config-handler.ts` — Shows the multi-phase pattern where config hook registers all plugin components with OpenCode
  - Agent config handler — Shows how agents are registered with OpenCode's config system

  **Acceptance Criteria**:
  - [ ] `bun test src/plugin-handlers/` — all tests pass
  - [ ] In "multi-agent" mode: agents + skills + MCPs registered
  - [ ] In "skills-only" mode: only skills registered, no agents
  - [ ] Disabled components are excluded from registration
  - [ ] No synchronous MCP connections during registration

  **QA Scenarios**:

  ```
  Scenario: Config handler respects skills-only mode
    Tool: Bash (bun REPL)
    Preconditions: Config handler and mock data exist
    Steps:
      1. Create config with `orchestration_mode: 'skills-only'`
      2. Call applyConfig with mock agents and skills
      3. Verify agents array is empty in output config
      4. Verify skills array is NOT empty in output config
    Expected Result: Skills registered, agents skipped in skills-only mode
    Failure Indicators: Agents present in skills-only mode
    Evidence: .gstack/evidence/task-9-skills-only-mode.txt

  Scenario: Config handler excludes disabled MCPs
    Tool: Bash (bun REPL)
    Preconditions: Config handler exists
    Steps:
      1. Create config with `disabled_mcps: ['websearch']`
      2. Call applyConfig
      3. Verify websearch is NOT in MCP config
      4. Verify other 4 MCPs ARE in config
    Expected Result: Only websearch excluded, other 4 MCPs present
    Failure Indicators: websearch present, or other MCPs missing
    Evidence: .gstack/evidence/task-9-disabled-mcps.txt
  ```

  **Commit**: YES
  - Message: `feat(plugin): add config handler for agent/skill/tool/MCP registration`
  - Files: `src/plugin-handlers/config-handler.ts`, `src/plugin-handlers/index.ts`, `src/plugin-handlers/*.test.ts`
  - Pre-commit: `bun test src/plugin-handlers/`

- [x] 32. MCP factory + 5 individual MCP configs

  **What to do**:
  - Create `src/mcp/index.ts`:
    - `createBuiltinMcps(disabledMcps: string[], config?: GstackConfig): Record<string, McpServerConfig>`
    - Factory that creates all 5 MCP server configs, excluding disabled ones
    - Export `McpNameSchema` (Zod schema for valid MCP names)
  - Create `src/mcp/types.ts`:
    - `McpNameSchema` — Zod literal union: `'websearch' | 'context7' | 'contexthub' | 'grep_app' | 'backlog_md'`
    - `RemoteMcpConfig` type (for remote HTTP MCPs)
    - `StdioMcpConfig` type (for local stdio MCPs like contexthub, backlog_md)
  - Create `src/mcp/websearch.ts`:
    - `createWebsearchConfig(config?: WebsearchConfig): RemoteMcpConfig`
    - Support Exa (default) and Tavily providers
    - Read `EXA_API_KEY` / `TAVILY_API_KEY` from environment
    - Exa URL: `https://mcp.exa.ai/mcp?tools=web_search_exa`
    - Tavily URL: `https://mcp.tavily.com/mcp/`
  - Create `src/mcp/context7.ts`:
    - Static export: `{ type: 'remote', url: 'https://mcp.context7.com/mcp', enabled: true, oauth: false }`
    - Optional `CONTEXT7_API_KEY` header
  - Create `src/mcp/contexthub.ts`:
    - `createContexthubConfig(): StdioMcpConfig`
    - stdio type (local CLI): `{ type: 'stdio', command: 'npx', args: ['contexthub'], enabled: true }`
    - Lazy — only connected when a skill requests it
  - Create `src/mcp/grep-app.ts`:
    - Static export: `{ type: 'remote', url: 'https://mcp.grep.app', enabled: true, oauth: false }`
  - Create `src/mcp/backlog-md.ts`:
    - `createBacklogMdConfig(): StdioMcpConfig`
    - stdio type: `{ type: 'stdio', command: 'npx', args: ['backlog-md'], enabled: true }`
    - Lazy — only connected when sprint-backlog integration calls it
  - Write TDD tests: factory creates correct configs, disabling works

  **Must NOT do**:
  - Do NOT connect to MCP servers at config creation time — configs are data only
  - Do NOT throw if API keys are missing — some MCPs work without keys
  - Do NOT hard-code API keys — always read from environment

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 5 individual MCP configs with different connection types (remote + stdio) and provider logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9, 33)
  - **Blocks**: Tasks 9, 33, 22 (config handler, MCP config handler, SkillMcpManager all need MCP configs)
  - **Blocked By**: Tasks 1 (deps), 3 (types)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/mcp/index.ts` — Factory pattern: `createBuiltinMcps(disabledMcps, config)` — follow exactly
  - `researchs/oh-my-openagent/src/mcp/websearch.ts` — Exa/Tavily provider switching with env var API keys
  - `researchs/oh-my-openagent/src/mcp/context7.ts` — Static config export pattern
  - `researchs/oh-my-openagent/src/mcp/grep-app.ts` — Simplest config pattern (no auth)
  - `researchs/oh-my-openagent/src/mcp/types.ts` — McpNameSchema (Zod literal union)

  **External References**:
  - ContextHub GitHub: https://github.com/andrewyng/context-hub — stdio MCP connection details
  - Backlog.md GitHub: https://github.com/MrLesk/Backlog.md — stdio MCP connection details

  **WHY Each Reference Matters**:
  - `oh-my-openagent/src/mcp/` — The ENTIRE directory is our exact pattern. We add 2 new MCPs (contexthub, backlog_md) but follow the identical structure
  - websearch.ts — Shows how to handle provider switching and env var API keys safely

  **Acceptance Criteria**:
  - [ ] `bun test src/mcp/` — all tests pass
  - [ ] `createBuiltinMcps([])` returns 5 MCP configs
  - [ ] `createBuiltinMcps(['websearch'])` returns 4 MCP configs (websearch excluded)
  - [ ] websearch config switches between Exa and Tavily
  - [ ] contexthub and backlog_md use stdio type
  - [ ] context7 and grep_app use remote type
  - [ ] No MCP connections made during config creation

  **QA Scenarios**:

  ```
  Scenario: MCP factory creates all 5 configs when nothing disabled
    Tool: Bash (bun REPL)
    Preconditions: src/mcp/ exists
    Steps:
      1. Run `bun -e "import { createBuiltinMcps } from './src/mcp/index.ts'; const mcps = createBuiltinMcps([]); console.log(Object.keys(mcps).sort().join(','))"`
      2. Assert output is `backlog_md,context7,contexthub,grep_app,websearch`
    Expected Result: All 5 MCP names present as keys
    Failure Indicators: Missing MCPs or extra MCPs
    Evidence: .gstack/evidence/task-32-mcp-factory-all.txt

  Scenario: MCP factory excludes disabled MCPs
    Tool: Bash (bun REPL)
    Preconditions: src/mcp/ exists
    Steps:
      1. Run `bun -e "import { createBuiltinMcps } from './src/mcp/index.ts'; const mcps = createBuiltinMcps(['websearch', 'contexthub']); console.log(Object.keys(mcps).sort().join(','))"`
      2. Assert output is `backlog_md,context7,grep_app`
    Expected Result: websearch and contexthub excluded
    Failure Indicators: Excluded MCPs still present
    Evidence: .gstack/evidence/task-32-mcp-factory-disabled.txt

  Scenario: Stdio MCPs have correct connection type
    Tool: Bash (bun REPL)
    Preconditions: src/mcp/ exists
    Steps:
      1. Run `bun -e "import { createBuiltinMcps } from './src/mcp/index.ts'; const mcps = createBuiltinMcps([]); console.log(mcps.contexthub.type); console.log(mcps.backlog_md.type); console.log(mcps.context7.type)"`
      2. Assert line 1 is `stdio`
      3. Assert line 2 is `stdio`
      4. Assert line 3 is `remote`
    Expected Result: contexthub and backlog_md are stdio, context7 is remote
    Failure Indicators: Wrong connection types
    Evidence: .gstack/evidence/task-32-mcp-types.txt
  ```

  **Commit**: YES
  - Message: `feat(mcp): add MCP factory with 5 built-in server configs`
  - Files: `src/mcp/index.ts`, `src/mcp/types.ts`, `src/mcp/websearch.ts`, `src/mcp/context7.ts`, `src/mcp/contexthub.ts`, `src/mcp/grep-app.ts`, `src/mcp/backlog-md.ts`, `src/mcp/*.test.ts`
  - Pre-commit: `bun test src/mcp/`

- [x] 33. MCP config handler — 3-tier merge (built-in → user → skill-embedded)

  **What to do**:
  - Create `src/plugin-handlers/mcp-config-handler.ts`:
    - `applyMcpConfig(params: { config, pluginConfig }): Promise<void>`
    - Merges MCP configs from 3 tiers:
      1. **Built-in**: `createBuiltinMcps(disabledMcps, pluginConfig)` from Task 32
      2. **User**: existing `config.mcp` from OpenCode/user config
      3. **Skill-embedded**: MCPs from BuiltinSkill.mcpConfig (per-skill)
    - Merge order: built-in → user (overrides) → skill-embedded (overrides)
    - Respect `disabled_mcps` array — remove those from final result
    - Respect per-MCP `enabled: false` flag from user config
    - Write merged result back to `params.config.mcp`
  - Create `src/plugin-handlers/mcp-config-handler.test.ts`:
    - Test 3-tier merge ordering
    - Test disabled_mcps removal
    - Test per-MCP enabled:false handling
    - Test empty tiers (no user MCPs, no skill MCPs)

  **Must NOT do**:
  - Do NOT connect to any MCP servers — this is config merging only
  - Do NOT load `.mcp.json` files (we don't support Claude Code MCP loader)
  - Do NOT modify the pluginConfig — only modify `params.config.mcp`

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 3-tier merge with disable semantics requires careful ordering logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9, 32)
  - **Blocks**: Tasks 9, 22, 23 (config handler, SkillMcpManager, plugin integration)
  - **Blocked By**: Tasks 3 (types), 32 (MCP factory)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/plugin-handlers/mcp-config-handler.ts` — EXACT pattern: `applyMcpConfig()` with 3-tier merge, `captureUserDisabledMcps()` helper

  **WHY Each Reference Matters**:
  - `oh-my-openagent/mcp-config-handler.ts` — The 60-line file IS the pattern. We simplify slightly (no Claude Code MCP loader tier) but keep the merge ordering and disable semantics

  **Acceptance Criteria**:
  - [ ] `bun test src/plugin-handlers/mcp-config-handler.test.ts` — passes
  - [ ] Built-in MCPs appear in merged config
  - [ ] User MCPs override built-in configs
  - [ ] disabled_mcps are fully removed
  - [ ] per-MCP `enabled: false` disables without removing

  **QA Scenarios**:

  ```
  Scenario: 3-tier merge produces correct final config
    Tool: Bash (bun REPL)
    Preconditions: MCP config handler exists
    Steps:
      1. Create params with: built-in 5 MCPs, user overrides websearch url, disabled_mcps = ['contexthub']
      2. Call applyMcpConfig(params)
      3. Check params.config.mcp has 4 MCPs (contexthub removed)
      4. Check websearch has user's URL (not built-in)
    Expected Result: contexthub removed, websearch overridden by user, other 3 unchanged
    Failure Indicators: contexthub present, or websearch not overridden
    Evidence: .gstack/evidence/task-33-mcp-merge.txt

  Scenario: User disabled via enabled:false flag preserved after merge
    Tool: Bash (bun REPL)
    Preconditions: MCP config handler exists
    Steps:
      1. User config has `mcp: { context7: { enabled: false } }`
      2. disabled_mcps is empty (no hard removal)
      3. Call applyMcpConfig
      4. Verify context7 exists but has `enabled: false`
    Expected Result: context7 present in config but marked disabled
    Failure Indicators: context7 removed entirely, or enabled is true
    Evidence: .gstack/evidence/task-33-mcp-soft-disable.txt
  ```

  **Commit**: YES
  - Message: `feat(mcp): add MCP config handler with 3-tier merge`
  - Files: `src/plugin-handlers/mcp-config-handler.ts`, `src/plugin-handlers/mcp-config-handler.test.ts`
  - Pre-commit: `bun test src/plugin-handlers/mcp-config-handler.test.ts`

- [x] 10. Skills — Planning group (office-hours, plan-ceo-review, plan-eng-review, plan-design-review)

  **What to do**:
  - Create `src/features/builtin-skills/skills/office-hours.ts`:
    - Export `officeHoursSkill: GstackSkill` — CEO ideation and product reframing
    - Read original from `researchs/gstack/.agents/skills/gstack-office-hours/SKILL.md`
    - Use `transformSkillContent()` from Task 5 to adapt content
    - Set `group: 'planning'`, `browserRequired: false`, `originalSkillName: 'gstack-office-hours'`
    - Set `description` to a concise 1-2 sentence summary for OpenCode skill list
  - Create `src/features/builtin-skills/skills/plan-ceo-review.ts`:
    - Export `planCeoReviewSkill: GstackSkill` — CEO-level plan review
    - Read from `researchs/gstack/.agents/skills/gstack-plan-ceo-review/SKILL.md`
    - Set `group: 'planning'`, `browserRequired: false`
  - Create `src/features/builtin-skills/skills/plan-eng-review.ts`:
    - Export `planEngReviewSkill: GstackSkill` — Engineering plan review
    - Read from `researchs/gstack/.agents/skills/gstack-plan-eng-review/SKILL.md`
    - Set `group: 'planning'`, `browserRequired: false`
  - Create `src/features/builtin-skills/skills/plan-design-review.ts`:
    - Export `planDesignReviewSkill: GstackSkill` — Design plan review
    - Read from `researchs/gstack/.agents/skills/gstack-plan-design-review/SKILL.md`
    - Set `group: 'planning'`, `browserRequired: false`
  - Write TDD tests: verify each skill has required fields (name, description, template, group, browserRequired)

  **Must NOT do**:
  - Do NOT copy SKILL.md content verbatim — must run through `transformSkillContent()`
  - Do NOT leave `$B` or `~/.claude/` references in adapted templates
  - Do NOT modify original files in `researchs/gstack/`
  - Do NOT inline the full skill content in tests — test structure, not content verbatim

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Skill porting requires careful content analysis, pattern matching for Claude Code references, and creative adaptation for OpenCode context
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `gitnexus-exploring`: Not useful — reading external research files, not project codebase

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12, 13, 14)
  - **Blocks**: Task 14 (skill registry depends on all skill files)
  - **Blocked By**: Tasks 3 (GstackSkill type), 5 (skill adapter/transformer)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/features/builtin-skills/skills/git-master.ts` — BuiltinSkill object shape (name, description, template literal)
  - `src/features/skill-adapter/content-transformer.ts` (from Task 5) — `transformSkillContent()` function to process raw SKILL.md

  **API/Type References**:
  - `src/types/skill.ts` (from Task 3) — `GstackSkill` interface (extends BuiltinSkill with group, originalSkillName, browserRequired)

  **Test References**:
  - `researchs/gstack/.agents/skills/gstack-office-hours/SKILL.md` — Original content to port
  - `researchs/gstack/.agents/skills/gstack-plan-ceo-review/SKILL.md` — Original content
  - `researchs/gstack/.agents/skills/gstack-plan-eng-review/SKILL.md` — Original content
  - `researchs/gstack/.agents/skills/gstack-plan-design-review/SKILL.md` — Original content

  **WHY Each Reference Matters**:
  - `oh-my-openagent/skills/git-master.ts` — Shows exact shape of a BuiltinSkill export: object literal with name, description, template, and optional fields
  - Original SKILL.md files — Source content that must be adapted. Read each to understand what `$B`, `~/.claude/`, and `~/.gstack/` references need replacing
  - `transformSkillContent()` — The transformation pipeline from Task 5 that handles all Claude Code→OpenCode adaptations

  **Acceptance Criteria**:
  - [ ] `bun test src/features/builtin-skills/skills/` — planning skill tests pass
  - [ ] All 4 skills export valid `GstackSkill` objects
  - [ ] Each skill has `group: 'planning'` and `browserRequired: false`
  - [ ] No `$B` or `~/.claude/` references in any template content
  - [ ] Each skill's `name` matches expected OpenCode slash-command name

  **QA Scenarios**:

  ```
  Scenario: Planning skills are valid GstackSkill objects
    Tool: Bash (bun REPL)
    Preconditions: All 4 planning skill files exist
    Steps:
      1. Run `bun -e "import { officeHoursSkill } from './src/features/builtin-skills/skills/office-hours.ts'; console.log(officeHoursSkill.name); console.log(officeHoursSkill.group); console.log(officeHoursSkill.browserRequired); console.log(officeHoursSkill.template.length > 100)"`
      2. Assert line 1 is a valid skill name (e.g., `office-hours`)
      3. Assert line 2 is `planning`
      4. Assert line 3 is `false`
      5. Assert line 4 is `true` (template has substantial content)
    Expected Result: Skill has correct metadata and non-trivial template
    Failure Indicators: Missing fields, wrong group, empty template
    Evidence: .gstack/evidence/task-10-planning-skills.txt

  Scenario: Planning skills contain no Claude Code references
    Tool: Bash
    Preconditions: All 4 planning skill files exist
    Steps:
      1. Run `bun -e "import { officeHoursSkill } from './src/features/builtin-skills/skills/office-hours.ts'; import { planCeoReviewSkill } from './src/features/builtin-skills/skills/plan-ceo-review.ts'; const all = [officeHoursSkill, planCeoReviewSkill].map(s => s.template).join(''); console.log(!all.includes('$B')); console.log(!all.includes('~/.claude/'))"`
      2. Assert both lines are `true`
    Expected Result: No Claude Code-specific references remain in templates
    Failure Indicators: $B or ~/.claude/ found in template content
    Evidence: .gstack/evidence/task-10-no-claude-refs.txt
  ```

  **Commit**: YES
  - Message: `feat(skills): port planning skills (office-hours, plan-ceo-review, plan-eng-review, plan-design-review)`
  - Files: `src/features/builtin-skills/skills/office-hours.ts`, `src/features/builtin-skills/skills/plan-ceo-review.ts`, `src/features/builtin-skills/skills/plan-eng-review.ts`, `src/features/builtin-skills/skills/plan-design-review.ts`, `src/features/builtin-skills/skills/*.test.ts`
  - Pre-commit: `bun test src/features/builtin-skills/skills/`

- [x] 11. Skills — Review group (review, design-consultation)

  **What to do**:
  - Create `src/features/builtin-skills/skills/review.ts`:
    - Export `reviewSkill: GstackSkill` — code review skill
    - Read from `researchs/gstack/.agents/skills/gstack-review/SKILL.md`
    - Use `transformSkillContent()` to adapt
    - Set `group: 'review'`, `browserRequired: false`, `originalSkillName: 'gstack-review'`
  - Create `src/features/builtin-skills/skills/design-consultation.ts`:
    - Export `designConsultationSkill: GstackSkill` — design system consultation
    - Read from `researchs/gstack/.agents/skills/gstack-design-consultation/SKILL.md`
    - Set `group: 'review'`, `browserRequired: false`
    - Note: This skill writes DESIGN.md to repo root — preserve this behavior
  - Create `src/features/builtin-skills/skills/codex.ts`:
    - Export `codexSkill: GstackSkill` — Codex integration
    - Read from `researchs/gstack/.agents/skills/gstack/SKILL.md` (the root gstack skill)
    - Set `group: 'review'`, `browserRequired: false`
  - Write TDD tests

  **Must NOT do**:
  - Do NOT remove DESIGN.md creation behavior from design-consultation — it's cross-skill communication
  - Do NOT leave review readiness dashboard references pointing to `~/.gstack/`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Review skills have moderate browser refs and cross-skill communication patterns that need careful adaptation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 12, 13, 14)
  - **Blocks**: Task 14 (skill registry)
  - **Blocked By**: Tasks 3 (types), 5 (skill adapter)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/features/builtin-skills/skills/git-master.ts` — BuiltinSkill object pattern
  - `src/features/skill-adapter/content-transformer.ts` (from Task 5) — Content transformer

  **Test References**:
  - `researchs/gstack/.agents/skills/gstack-review/SKILL.md` — Review skill (5 browser refs)
  - `researchs/gstack/.agents/skills/gstack-design-consultation/SKILL.md` — Design consultation (22 browser refs)
  - `researchs/gstack/.agents/skills/gstack/SKILL.md` — Root gstack skill (96 browser refs — heaviest)

  **WHY Each Reference Matters**:
  - Review SKILL.md — Moderate browser refs that need adaptation. Review readiness dashboard refs → `.gstack/reviews/dashboard.json`
  - Design consultation SKILL.md — Creates DESIGN.md and writes to `~/.gstack/projects/` — paths need adapting to `.gstack/design-docs/`

  **Acceptance Criteria**:
  - [ ] `bun test` — review skill tests pass
  - [ ] All 3 skills export valid `GstackSkill` objects with `group: 'review'`
  - [ ] No `$B`, `~/.claude/`, or `~/.gstack/` references in templates
  - [ ] design-consultation skill preserves DESIGN.md output behavior

  **QA Scenarios**:

  ```
  Scenario: Review skills are valid and adapted
    Tool: Bash (bun REPL)
    Preconditions: Review skill files exist
    Steps:
      1. Run `bun -e "import { reviewSkill } from './src/features/builtin-skills/skills/review.ts'; console.log(reviewSkill.group); console.log(reviewSkill.browserRequired); console.log(reviewSkill.template.includes('.gstack/reviews') || !reviewSkill.template.includes('~/.gstack'))"`
      2. Assert line 1 is `review`, line 2 is `false`, line 3 is `true`
    Expected Result: Review skill properly categorized and adapted
    Failure Indicators: Wrong group or unadapted paths
    Evidence: .gstack/evidence/task-11-review-skills.txt
  ```

  **Commit**: YES
  - Message: `feat(skills): port review skills (review, design-consultation, codex)`
  - Files: `src/features/builtin-skills/skills/review.ts`, `src/features/builtin-skills/skills/design-consultation.ts`, `src/features/builtin-skills/skills/codex.ts`, tests
  - Pre-commit: `bun test src/features/builtin-skills/skills/`

- [x] 12. Skills — Safety group (careful, freeze, guard, unfreeze)

  **What to do**:
  - Create `src/features/builtin-skills/skills/careful.ts`:
    - Export `carefulSkill: GstackSkill` — extra caution mode for destructive operations
    - Read from `researchs/gstack/.agents/skills/gstack-careful/SKILL.md`
    - Set `group: 'safety'`, `browserRequired: false` (zero browser refs)
  - Create `src/features/builtin-skills/skills/freeze.ts`:
    - Export `freezeSkill: GstackSkill` — lock critical files from modification
    - Read from `researchs/gstack/.agents/skills/gstack-freeze/SKILL.md`
    - Set `group: 'safety'`, `browserRequired: false`
  - Create `src/features/builtin-skills/skills/guard.ts`:
    - Export `guardSkill: GstackSkill` — safety guard that activates careful + freeze
    - Read from `researchs/gstack/.agents/skills/gstack-guard/SKILL.md`
    - Set `group: 'safety'`, `browserRequired: false`
    - Note: guard skill references `/careful` and `/freeze` — ensure cross-skill references work in OpenCode context
  - Create `src/features/builtin-skills/skills/unfreeze.ts`:
    - Export `unfreezeSkill: GstackSkill` — unlock frozen files
    - Read from `researchs/gstack/.agents/skills/gstack-unfreeze/SKILL.md`
    - Set `group: 'safety'`, `browserRequired: false`
  - Write TDD tests

  **Must NOT do**:
  - Do NOT break cross-skill references (`/guard` → `/careful` + `/freeze`)
  - Do NOT add browser dependencies — all safety skills are zero-browser

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Safety skills are the cleanest (zero browser refs) but have cross-skill dependency patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 13, 14)
  - **Blocks**: Task 14 (skill registry)
  - **Blocked By**: Tasks 3 (types), 5 (skill adapter)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/features/builtin-skills/skills/git-master.ts` — BuiltinSkill object pattern

  **Test References**:
  - `researchs/gstack/.agents/skills/gstack-careful/SKILL.md` — Simplest skill (zero browser refs — good baseline test)
  - `researchs/gstack/.agents/skills/gstack-freeze/SKILL.md` — File locking logic
  - `researchs/gstack/.agents/skills/gstack-guard/SKILL.md` — Cross-skill references
  - `researchs/gstack/.agents/skills/gstack-unfreeze/SKILL.md` — Unlock logic

  **WHY Each Reference Matters**:
  - `gstack-careful/SKILL.md` — Zero browser refs makes this the cleanest port, ideal for verifying transformer works
  - `gstack-guard/SKILL.md` — Contains cross-skill invocations (`/careful`, `/freeze`) that must work in OpenCode's skill model

  **Acceptance Criteria**:
  - [ ] `bun test` — safety skill tests pass
  - [ ] All 4 safety skills export valid `GstackSkill` objects with `group: 'safety'`
  - [ ] All have `browserRequired: false`
  - [ ] Guard skill preserves cross-skill references to careful/freeze

  **QA Scenarios**:

  ```
  Scenario: Safety skills have zero browser dependencies
    Tool: Bash (bun REPL)
    Preconditions: Safety skill files exist
    Steps:
      1. Run `bun -e "import { carefulSkill } from './src/features/builtin-skills/skills/careful.ts'; import { guardSkill } from './src/features/builtin-skills/skills/guard.ts'; console.log(carefulSkill.browserRequired); console.log(guardSkill.browserRequired); console.log(guardSkill.group)"`
      2. Assert lines 1-2 are `false`, line 3 is `safety`
    Expected Result: All safety skills correctly marked as non-browser
    Failure Indicators: browserRequired is true for any safety skill
    Evidence: .gstack/evidence/task-12-safety-skills.txt
  ```

  **Commit**: YES
  - Message: `feat(skills): port safety skills (careful, freeze, guard, unfreeze)`
  - Files: `src/features/builtin-skills/skills/careful.ts`, `src/features/builtin-skills/skills/freeze.ts`, `src/features/builtin-skills/skills/guard.ts`, `src/features/builtin-skills/skills/unfreeze.ts`, tests
  - Pre-commit: `bun test src/features/builtin-skills/skills/`

- [x] 13. Skills — Utility group (investigate, retro)

  **What to do**:
  - Create `src/features/builtin-skills/skills/investigate.ts`:
    - Export `investigateSkill: GstackSkill` — debugging and root cause analysis
    - Read from `researchs/gstack/.agents/skills/gstack-investigate/SKILL.md`
    - Set `group: 'utility'`, `browserRequired: false` (6 browser refs — light, but these are optional browse commands)
    - Adapt browser references as optional/conditional
  - Create `src/features/builtin-skills/skills/retro.ts`:
    - Export `retroSkill: GstackSkill` — sprint retrospective analysis
    - Read from `researchs/gstack/.agents/skills/gstack-retro/SKILL.md`
    - Set `group: 'utility'`, `browserRequired: false` (8 browser refs — light)
    - Adapts analytics references from `~/.gstack/analytics/` to `.gstack/analytics/`
  - Write TDD tests

  **Must NOT do**:
  - Do NOT mark investigate or retro as browser-required — their browser usage is optional
  - Do NOT remove analytics tracking references — adapt paths only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Light browser refs need selective adaptation (keep as optional, not required)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12, 14)
  - **Blocks**: Task 14 (skill registry)
  - **Blocked By**: Tasks 3 (types), 5 (skill adapter)

  **References**:

  **Test References**:
  - `researchs/gstack/.agents/skills/gstack-investigate/SKILL.md` — Debugging skill with 6 browser refs
  - `researchs/gstack/.agents/skills/gstack-retro/SKILL.md` — Retrospective with analytics refs

  **WHY Each Reference Matters**:
  - investigate SKILL.md — Browser refs are for optional visual debugging; adapt as conditional
  - retro SKILL.md — References `~/.gstack/analytics/` for skill-usage and eureka data — must adapt to `.gstack/analytics/`

  **Acceptance Criteria**:
  - [ ] `bun test` — utility skill tests pass
  - [ ] Both skills export valid `GstackSkill` objects with `group: 'utility'`
  - [ ] Analytics paths adapted from `~/.gstack/analytics/` to `.gstack/analytics/`
  - [ ] No hard browser requirements

  **QA Scenarios**:

  ```
  Scenario: Utility skills have correct metadata
    Tool: Bash (bun REPL)
    Preconditions: Utility skill files exist
    Steps:
      1. Run `bun -e "import { investigateSkill } from './src/features/builtin-skills/skills/investigate.ts'; import { retroSkill } from './src/features/builtin-skills/skills/retro.ts'; console.log(investigateSkill.group); console.log(retroSkill.group); console.log(investigateSkill.browserRequired); console.log(retroSkill.browserRequired)"`
      2. Assert lines 1-2 are `utility`, lines 3-4 are `false`
    Expected Result: Both skills in utility group with no hard browser requirement
    Failure Indicators: Wrong group or browser required
    Evidence: .gstack/evidence/task-13-utility-skills.txt
  ```

  **Commit**: YES
  - Message: `feat(skills): port utility skills (investigate, retro)`
  - Files: `src/features/builtin-skills/skills/investigate.ts`, `src/features/builtin-skills/skills/retro.ts`, tests
  - Pre-commit: `bun test src/features/builtin-skills/skills/`

- [x] 14. Skill registry + createBuiltinSkills() factory

  **What to do**:
  - Create `src/features/builtin-skills/types.ts`:
    - Re-export `GstackSkill` and `BuiltinSkill` from `src/types/skill.ts`
    - Export `CreateBuiltinSkillsOptions`: `{ disabledSkills?: Set<string>, browserAvailable?: boolean }`
  - Create `src/features/builtin-skills/skills/index.ts`:
    - Barrel exports for ALL skill files from Tasks 10-13 (and later 15-16)
    - Export named: `officeHoursSkill`, `planCeoReviewSkill`, `planEngReviewSkill`, `planDesignReviewSkill`, `reviewSkill`, `designConsultationSkill`, `codexSkill`, `carefulSkill`, `freezeSkill`, `guardSkill`, `unfreezeSkill`, `investigateSkill`, `retroSkill`
    - Wave 4 skills (Tasks 15-16) will be added to this barrel later
  - Create `src/features/builtin-skills/skills.ts`:
    - `createBuiltinSkills(options: CreateBuiltinSkillsOptions): GstackSkill[]`
    - Collects ALL skill objects into array
    - Filters out disabled skills via `disabledSkills` Set
    - Filters out browser-required skills when `browserAvailable === false`
    - Returns remaining skills array
  - Create `src/features/builtin-skills/index.ts`:
    - Barrel exports: `createBuiltinSkills`, types, individual skills
  - Write TDD tests: verify factory output, filtering, disabling

  **Must NOT do**:
  - Do NOT hard-code skill count — the list grows when Wave 4 skills are added
  - Do NOT create a catch-all file — registry is `skills.ts`, types in `types.ts`, barrel in `index.ts`
  - Do NOT filter skills by name matching — use the `disabledSkills` Set

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Factory pattern with array filtering — straightforward, follows oh-my-openagent exactly
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Tasks 10-13 complete)
  - **Blocks**: Task 23 (plugin integration registers skills)
  - **Blocked By**: Tasks 3 (types), 10-13 (all Wave 3 skill files)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/features/builtin-skills/skills.ts` — EXACT pattern: `createBuiltinSkills(options)` factory with `disabledSkills` filter
  - `researchs/oh-my-openagent/src/features/builtin-skills/types.ts` — Types file pattern
  - `researchs/oh-my-openagent/src/features/builtin-skills/skills/index.ts` — Barrel export for all skills

  **WHY Each Reference Matters**:
  - `oh-my-openagent/skills.ts` — The 37-line factory IS our pattern. We add browserAvailable filtering and more skills, but same structure
  - `oh-my-openagent/types.ts` — 16-line BuiltinSkill interface — our GstackSkill extends it

  **Acceptance Criteria**:
  - [ ] `bun test src/features/builtin-skills/` — all tests pass
  - [ ] `createBuiltinSkills({})` returns array of 13 skills (Wave 3 batch)
  - [ ] `createBuiltinSkills({ disabledSkills: new Set(['review']) })` returns 12 skills
  - [ ] `createBuiltinSkills({ browserAvailable: false })` filters browser-required skills
  - [ ] All skills importable via barrel: `import { officeHoursSkill } from './src/features/builtin-skills'`

  **QA Scenarios**:

  ```
  Scenario: Factory returns all non-disabled skills
    Tool: Bash (bun REPL)
    Preconditions: All Wave 3 skill files + registry exist
    Steps:
      1. Run `bun -e "import { createBuiltinSkills } from './src/features/builtin-skills/index.ts'; const skills = createBuiltinSkills({}); console.log(skills.length >= 13); console.log(skills.every(s => s.name && s.template && s.group))"`
      2. Assert both lines are `true`
    Expected Result: At least 13 skills returned, all with required fields
    Failure Indicators: Wrong count or missing required fields
    Evidence: .gstack/evidence/task-14-skill-registry.txt

  Scenario: Factory filters disabled skills
    Tool: Bash (bun REPL)
    Preconditions: Registry exists
    Steps:
      1. Run `bun -e "import { createBuiltinSkills } from './src/features/builtin-skills/index.ts'; const all = createBuiltinSkills({}); const filtered = createBuiltinSkills({ disabledSkills: new Set(['review', 'careful']) }); console.log(all.length - filtered.length)"`
      2. Assert output is `2`
    Expected Result: Exactly 2 skills removed
    Failure Indicators: Wrong difference
    Evidence: .gstack/evidence/task-14-skill-filter.txt
  ```

  **Commit**: YES
  - Message: `feat(skills): add skill registry and createBuiltinSkills factory`
  - Files: `src/features/builtin-skills/types.ts`, `src/features/builtin-skills/skills.ts`, `src/features/builtin-skills/skills/index.ts`, `src/features/builtin-skills/index.ts`, tests
  - Pre-commit: `bun test src/features/builtin-skills/`

- [x] 15. Skills — Deploy group (ship, land-and-deploy, setup-deploy, document-release)

  **What to do**:
  - Create `src/features/builtin-skills/skills/ship.ts`:
    - Export `shipSkill: GstackSkill` — ship readiness gate and deployment trigger
    - Read from `researchs/gstack/.agents/skills/gstack-ship/SKILL.md`
    - Set `group: 'deploy'`, `browserRequired: false` (7 browser refs — optional)
    - Adapt: review readiness dashboard → `.gstack/reviews/dashboard.json`
    - Note: `/ship` auto-invokes `/review` and `/document-release` — preserve cross-skill references
  - Create `src/features/builtin-skills/skills/land-and-deploy.ts`:
    - Export `landAndDeploySkill: GstackSkill` — merge and deploy workflow
    - Read from `researchs/gstack/.agents/skills/gstack-land-and-deploy/SKILL.md`
    - Set `group: 'deploy'`, `browserRequired: false` (17 browser refs — moderate, but deploy-specific)
  - Create `src/features/builtin-skills/skills/setup-deploy.ts`:
    - Export `setupDeploySkill: GstackSkill` — deployment infrastructure setup
    - Read from `researchs/gstack/.agents/skills/gstack-setup-deploy/SKILL.md`
    - Set `group: 'deploy'`, `browserRequired: false`
  - Create `src/features/builtin-skills/skills/document-release.ts`:
    - Export `documentReleaseSkill: GstackSkill` — release documentation generator
    - Read from `researchs/gstack/.agents/skills/gstack-document-release/SKILL.md`
    - Set `group: 'deploy'`, `browserRequired: false`
  - Update `src/features/builtin-skills/skills/index.ts` — add barrel exports for all 4 deploy skills
  - Update `src/features/builtin-skills/skills.ts` — add deploy skills to factory array
  - Write TDD tests

  **Must NOT do**:
  - Do NOT break `/ship` → `/review` + `/document-release` cross-skill invocation chain
  - Do NOT remove review readiness dashboard logic — adapt path to `.gstack/reviews/`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Deploy skills have moderate browser refs and critical cross-skill dependencies (ship→review→document-release chain)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 16, 17, 18, 19)
  - **Blocks**: Task 23 (plugin integration)
  - **Blocked By**: Tasks 3 (types), 5 (skill adapter), 14 (skill registry barrel)

  **References**:

  **Test References**:
  - `researchs/gstack/.agents/skills/gstack-ship/SKILL.md` — Ship gate with review dashboard and cross-skill invocations
  - `researchs/gstack/.agents/skills/gstack-land-and-deploy/SKILL.md` — Deploy workflow (17 browser refs)
  - `researchs/gstack/.agents/skills/gstack-setup-deploy/SKILL.md` — Deploy setup
  - `researchs/gstack/.agents/skills/gstack-document-release/SKILL.md` — Release docs

  **WHY Each Reference Matters**:
  - ship SKILL.md — CRITICAL: Contains review readiness dashboard logic and auto-invokes other skills. Most complex deploy skill.
  - land-and-deploy — Heavy browser refs for canary/staging verification. Adapt browsing as optional.

  **Acceptance Criteria**:
  - [ ] `bun test` — deploy skill tests pass
  - [ ] All 4 deploy skills export valid `GstackSkill` objects with `group: 'deploy'`
  - [ ] Ship skill preserves cross-skill references
  - [ ] Review dashboard references point to `.gstack/reviews/`
  - [ ] Skills added to barrel export and factory

  **QA Scenarios**:

  ```
  Scenario: Deploy skills registered in factory
    Tool: Bash (bun REPL)
    Preconditions: All deploy skills and updated registry exist
    Steps:
      1. Run `bun -e "import { createBuiltinSkills } from './src/features/builtin-skills/index.ts'; const skills = createBuiltinSkills({}); const deploy = skills.filter(s => s.group === 'deploy'); console.log(deploy.length); console.log(deploy.map(s => s.name).sort().join(','))"`
      2. Assert line 1 is `4`
      3. Assert line 2 contains all 4 deploy skill names
    Expected Result: All 4 deploy skills in registry
    Failure Indicators: Missing skills or wrong group
    Evidence: .gstack/evidence/task-15-deploy-skills.txt
  ```

  **Commit**: YES
  - Message: `feat(skills): port deploy skills (ship, land-and-deploy, setup-deploy, document-release)`
  - Files: `src/features/builtin-skills/skills/ship.ts`, `src/features/builtin-skills/skills/land-and-deploy.ts`, `src/features/builtin-skills/skills/setup-deploy.ts`, `src/features/builtin-skills/skills/document-release.ts`, updated barrel + factory, tests
  - Pre-commit: `bun test src/features/builtin-skills/`

- [x] 16. Skills — Browser-dependent group (browse, qa, qa-only, design-review, benchmark, canary, setup-browser-cookies, upgrade)

  **What to do**:
  - Create `src/features/builtin-skills/skills/browse.ts`:
    - Export `browseSkill: GstackSkill` — headless browser interaction
    - Read from `researchs/gstack/.agents/skills/gstack-browse/SKILL.md` (63 browser refs)
    - Set `group: 'browser'`, `browserRequired: true`
    - Adapt browser daemon references to use plugin's internal browser API
  - Create `src/features/builtin-skills/skills/qa.ts`:
    - Export `qaSkill: GstackSkill` — full QA workflow
    - Read from `researchs/gstack/.agents/skills/gstack-qa/SKILL.md` (49 browser refs)
    - Set `group: 'browser'`, `browserRequired: true`
  - Create `src/features/builtin-skills/skills/qa-only.ts`:
    - Export `qaOnlySkill: GstackSkill` — QA testing without implementation
    - Read from `researchs/gstack/.agents/skills/gstack-qa-only/SKILL.md` (45 browser refs)
    - Set `group: 'browser'`, `browserRequired: true`
  - Create `src/features/builtin-skills/skills/design-review.ts`:
    - Export `designReviewSkill: GstackSkill` — visual design review
    - Read from `researchs/gstack/.agents/skills/gstack-design-review/SKILL.md` (36 browser refs)
    - Set `group: 'browser'`, `browserRequired: true`
  - Create `src/features/builtin-skills/skills/benchmark.ts`:
    - Export `benchmarkSkill: GstackSkill` — performance benchmarking
    - Read from `researchs/gstack/.agents/skills/gstack-benchmark/SKILL.md` (20 browser refs)
    - Set `group: 'browser'`, `browserRequired: true`
  - Create `src/features/builtin-skills/skills/canary.ts`:
    - Export `canarySkill: GstackSkill` — canary deployment verification
    - Read from `researchs/gstack/.agents/skills/gstack-canary/SKILL.md` (29 browser refs)
    - Set `group: 'browser'`, `browserRequired: true`
  - Create `src/features/builtin-skills/skills/setup-browser-cookies.ts`:
    - Export `setupBrowserCookiesSkill: GstackSkill` — browser cookie/session setup
    - Read from `researchs/gstack/.agents/skills/gstack-setup-browser-cookies/SKILL.md` (33 browser refs)
    - Set `group: 'browser'`, `browserRequired: true`
  - Create `src/features/builtin-skills/skills/upgrade.ts`:
    - Export `upgradeSkill: GstackSkill` — gstack self-update mechanism
    - Read from `researchs/gstack/.agents/skills/gstack-upgrade/SKILL.md`
    - Set `group: 'browser'`, `browserRequired: false` (zero browser refs — but grouped as utility/browser for upgrade purposes)
    - Adapt: This skill upgrades gstack itself — adapt to upgrade the OpenCode plugin instead
  - Update `src/features/builtin-skills/skills/index.ts` — add all 8 barrel exports
  - Update `src/features/builtin-skills/skills.ts` — add all 8 skills to factory array
  - Write TDD tests

  **Must NOT do**:
  - Do NOT remove browser daemon references — adapt to use plugin's browser daemon API (from Tasks 28-29)
  - Do NOT mark `upgrade` as `browserRequired: true` — it has zero browser refs
  - Do NOT inline full SKILL.md templates in test assertions — test structure only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 8 skills with heavy browser refs (20-63 each) requiring careful adaptation of browser daemon API calls
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 17, 18, 19)
  - **Blocks**: Task 23 (plugin integration)
  - **Blocked By**: Tasks 3 (types), 5 (skill adapter), 14 (skill registry barrel)

  **References**:

  **Test References**:
  - `researchs/gstack/.agents/skills/gstack-browse/SKILL.md` — Heaviest browser skill (63 refs) — defines @ref system, snapshot flags
  - `researchs/gstack/.agents/skills/gstack-qa/SKILL.md` — Full QA workflow (49 refs)
  - `researchs/gstack/.agents/skills/gstack-qa-only/SKILL.md` — QA-only variant (45 refs)
  - `researchs/gstack/.agents/skills/gstack-design-review/SKILL.md` — Visual design (36 refs)
  - `researchs/gstack/.agents/skills/gstack-benchmark/SKILL.md` — Performance (20 refs)
  - `researchs/gstack/.agents/skills/gstack-canary/SKILL.md` — Canary deploy (29 refs)
  - `researchs/gstack/.agents/skills/gstack-setup-browser-cookies/SKILL.md` — Cookie setup (33 refs)
  - `researchs/gstack/.agents/skills/gstack-upgrade/SKILL.md` — Self-update (0 refs)

  **External References**:
  - `researchs/gstack/BROWSER.md` — Full browser command reference for adapting browser API calls

  **WHY Each Reference Matters**:
  - browse SKILL.md — Core browser skill defines `@ref` element addressing, snapshot flags, browser HTTP API. ALL other browser skills depend on this vocabulary.
  - BROWSER.md — Complete command reference needed to understand what browser API calls need adapting

  **Acceptance Criteria**:
  - [ ] `bun test` — browser skill tests pass
  - [ ] 7 skills have `browserRequired: true`, upgrade has `browserRequired: false`
  - [ ] All browser skills reference plugin's browser daemon (not `$B` or local paths)
  - [ ] Total skill count after this task: 25 skills in factory
  - [ ] Skills added to barrel export and factory

  **QA Scenarios**:

  ```
  Scenario: Browser skills correctly marked and total count is 25
    Tool: Bash (bun REPL)
    Preconditions: All skill files and updated registry exist
    Steps:
      1. Run `bun -e "import { createBuiltinSkills } from './src/features/builtin-skills/index.ts'; const all = createBuiltinSkills({}); const browser = all.filter(s => s.browserRequired); console.log(all.length); console.log(browser.length)"`
      2. Assert line 1 is `25` (all skills)
      3. Assert line 2 is `7` (browser-required skills, excluding upgrade)
    Expected Result: 25 total skills, 7 browser-required
    Failure Indicators: Wrong counts
    Evidence: .gstack/evidence/task-16-browser-skills.txt

  Scenario: Browser skills filtered when browser unavailable
    Tool: Bash (bun REPL)
    Preconditions: Registry exists
    Steps:
      1. Run `bun -e "import { createBuiltinSkills } from './src/features/builtin-skills/index.ts'; const noB = createBuiltinSkills({ browserAvailable: false }); console.log(noB.length); console.log(noB.every(s => !s.browserRequired))"`
      2. Assert line 1 is `18` (25 total - 7 browser)
      3. Assert line 2 is `true`
    Expected Result: Browser-required skills filtered out
    Failure Indicators: Browser skills still present
    Evidence: .gstack/evidence/task-16-browser-filter.txt
  ```

  **Commit**: YES
  - Message: `feat(skills): port browser-dependent skills (browse, qa, qa-only, design-review, benchmark, canary, setup-browser-cookies, upgrade)`
  - Files: `src/features/builtin-skills/skills/browse.ts`, `src/features/builtin-skills/skills/qa.ts`, `src/features/builtin-skills/skills/qa-only.ts`, `src/features/builtin-skills/skills/design-review.ts`, `src/features/builtin-skills/skills/benchmark.ts`, `src/features/builtin-skills/skills/canary.ts`, `src/features/builtin-skills/skills/setup-browser-cookies.ts`, `src/features/builtin-skills/skills/upgrade.ts`, updated barrel + factory, tests
  - Pre-commit: `bun test src/features/builtin-skills/`

- [x] 17. Agent definitions — Core agents (CEO, Eng Manager, Designer, Builder, Reviewer, Debugger)

  **What to do**:
  - Create `src/agents/ceo.ts`:
    - Export `ceoAgent: GstackAgent`
    - `role: 'ceo'`, `name: 'CEO'`, `sprintPhase: 'think'`
    - `skills: ['office-hours', 'plan-ceo-review']`
    - `instructions`: Product vision prompt — reframe ideas, identify 10x opportunities, challenge assumptions. Derived from gstack's CEO review behavior.
  - Create `src/agents/eng-manager.ts`:
    - Export `engManagerAgent: GstackAgent`
    - `role: 'eng-manager'`, `name: 'Engineering Manager'`, `sprintPhase: 'plan'`
    - `skills: ['plan-eng-review']`
    - `instructions`: Architecture review, test plan creation, risk assessment
  - Create `src/agents/designer.ts`:
    - Export `designerAgent: GstackAgent`
    - `role: 'designer'`, `name: 'Designer'`, `sprintPhase: 'plan'`
    - `skills: ['plan-design-review', 'design-consultation', 'design-review']`
    - `instructions`: Design system consistency, visual audit, UX patterns
  - Create `src/agents/builder.ts`:
    - Export `builderAgent: GstackAgent`
    - `role: 'builder'`, `name: 'Builder'`, `sprintPhase: 'build'`
    - `skills: []` (general coding — no specific gstack skill)
    - `instructions`: Implementation executor — write code, follow patterns, run tests
  - Create `src/agents/reviewer.ts`:
    - Export `reviewerAgent: GstackAgent`
    - `role: 'reviewer'`, `name: 'Reviewer'`, `sprintPhase: 'review'`
    - `skills: ['review', 'codex']`
    - `instructions`: Code review, second opinion, standard enforcement
  - Create `src/agents/debugger.ts`:
    - Export `debuggerAgent: GstackAgent`
    - `role: 'debugger'`, `name: 'Debugger'`, `sprintPhase: 'build'`
    - `skills: ['investigate']`
    - `instructions`: Root cause analysis, error tracing, hypothesis testing
  - Write TDD tests: verify each agent has required fields, skills exist, sprint phase is valid

  **Must NOT do**:
  - Do NOT hard-code model assignments — `model` field is optional (user configures via JSONC)
  - Do NOT add runtime logic to agent files — agents are config objects, not classes
  - Do NOT create an over-engineered agent base class — simple object literals

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Agent instructions require careful derivation from gstack skill behaviors to create effective prompts for each role
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 16, 18, 19)
  - **Blocks**: Tasks 19 (agent registry), 20 (intent classifier)
  - **Blocked By**: Task 3 (GstackAgent type)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/agents/builtin-agents/` — Agent definition pattern (object literals, not classes)
  - `researchs/oh-my-openagent/src/agents/types.ts` — Agent type definition pattern

  **API/Type References**:
  - `src/types/agent.ts` (from Task 3) — `GstackAgent`, `AgentRole`, `SprintPhase` types

  **External References**:
  - Draft file agent mapping table — `.sisyphus/drafts/gstack-plugin.md` "Architecture Decisions" section

  **WHY Each Reference Matters**:
  - `oh-my-openagent/agents/` — Shows agent definitions as config objects (not classes). Each has `name`, `description`, `instructions`
  - Draft agent mapping table — The authoritative mapping of agents→skills→phases confirmed by user

  **Acceptance Criteria**:
  - [ ] `bun test src/agents/` — all core agent tests pass
  - [ ] All 6 agents export valid `GstackAgent` objects
  - [ ] Each agent references only skills that exist in the skill registry
  - [ ] No hard-coded models — model field is optional
  - [ ] Sprint phases are valid: think, plan, build, review

  **QA Scenarios**:

  ```
  Scenario: Core agents have correct sprint phase assignments
    Tool: Bash (bun REPL)
    Preconditions: All 6 core agent files exist
    Steps:
      1. Run `bun -e "import { ceoAgent } from './src/agents/ceo.ts'; import { engManagerAgent } from './src/agents/eng-manager.ts'; import { builderAgent } from './src/agents/builder.ts'; import { reviewerAgent } from './src/agents/reviewer.ts'; console.log(ceoAgent.sprintPhase); console.log(engManagerAgent.sprintPhase); console.log(builderAgent.sprintPhase); console.log(reviewerAgent.sprintPhase)"`
      2. Assert outputs: `think`, `plan`, `build`, `review`
    Expected Result: Each agent mapped to correct sprint phase
    Failure Indicators: Wrong phase assignments
    Evidence: .gstack/evidence/task-17-core-agents.txt

  Scenario: Agent skills reference existing skill names
    Tool: Bash (bun REPL)
    Preconditions: Agent files exist
    Steps:
      1. Run `bun -e "import { ceoAgent } from './src/agents/ceo.ts'; console.log(JSON.stringify(ceoAgent.skills)); console.log(ceoAgent.model === undefined)"`
      2. Assert line 1 is `["office-hours","plan-ceo-review"]`
      3. Assert line 2 is `true` (no hard-coded model)
    Expected Result: CEO agent has correct skills and no hard-coded model
    Failure Indicators: Wrong skills or model present
    Evidence: .gstack/evidence/task-17-agent-skills.txt
  ```

  **Commit**: YES
  - Message: `feat(agents): add core sprint-phase agent definitions (CEO, Eng Manager, Designer, Builder, Reviewer, Debugger)`
  - Files: `src/agents/ceo.ts`, `src/agents/eng-manager.ts`, `src/agents/designer.ts`, `src/agents/builder.ts`, `src/agents/reviewer.ts`, `src/agents/debugger.ts`, tests
  - Pre-commit: `bun test src/agents/`

- [x] 18. Agent definitions — Support agents (QA Lead, Release Engineer, Doc Engineer, Retro Lead, Safety Guard, Upgrader, Session Manager)

  **What to do**:
  - Create `src/agents/qa-lead.ts`:
    - Export `qaLeadAgent: GstackAgent`
    - `role: 'qa-lead'`, `sprintPhase: 'test'`, `skills: ['qa', 'qa-only', 'browse', 'benchmark']`
  - Create `src/agents/release-engineer.ts`:
    - Export `releaseEngineerAgent: GstackAgent`
    - `role: 'release-engineer'`, `sprintPhase: 'ship'`, `skills: ['ship', 'land-and-deploy', 'canary', 'setup-deploy']`
  - Create `src/agents/doc-engineer.ts`:
    - Export `docEngineerAgent: GstackAgent`
    - `role: 'doc-engineer'`, `sprintPhase: 'ship'`, `skills: ['document-release']`
  - Create `src/agents/retro-lead.ts`:
    - Export `retroLeadAgent: GstackAgent`
    - `role: 'retro-lead'`, `sprintPhase: 'reflect'`, `skills: ['retro']`
  - Create `src/agents/safety-guard.ts`:
    - Export `safetyGuardAgent: GstackAgent`
    - `role: 'safety-guard'`, `sprintPhase: 'cross-cutting'`, `skills: ['careful', 'freeze', 'guard', 'unfreeze']`
    - `instructions`: Cross-cutting safety concern — activate on destructive operations, production deploys, data migrations
  - Create `src/agents/upgrader.ts`:
    - Export `upgraderAgent: GstackAgent`
    - `role: 'upgrader'`, `sprintPhase: 'utility'`, `skills: ['upgrade']`
  - Create `src/agents/session-manager.ts`:
    - Export `sessionManagerAgent: GstackAgent`
    - `role: 'session-manager'`, `sprintPhase: 'utility'`, `skills: ['setup-browser-cookies']`
  - Write TDD tests

  **Must NOT do**:
  - Do NOT hard-code models — optional per user config
  - Do NOT create class hierarchies — simple config objects

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 7 agents with diverse responsibilities and skills-to-phase mappings
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 16, 17, 19)
  - **Blocks**: Tasks 19 (agent registry), 20 (intent classifier)
  - **Blocked By**: Task 3 (GstackAgent type)

  **References**:

  **Pattern References**:
  - `src/agents/ceo.ts` (from Task 17) — Follow same agent definition pattern
  - Draft agent mapping table — `.sisyphus/drafts/gstack-plugin.md` "Architecture Decisions" section

  **WHY Each Reference Matters**:
  - Task 17 agents — Establishes the pattern. Support agents follow identical structure.
  - Draft mapping — Contains the exact agent→skill→phase mapping confirmed by user

  **Acceptance Criteria**:
  - [ ] `bun test src/agents/` — all support agent tests pass
  - [ ] All 7 agents export valid `GstackAgent` objects
  - [ ] Total agents: 13 (6 core + 7 support)
  - [ ] Safety guard has `sprintPhase: 'cross-cutting'`
  - [ ] All agents reference only existing skill names

  **QA Scenarios**:

  ```
  Scenario: All 13 agents importable and have valid phases
    Tool: Bash (bun REPL)
    Preconditions: All agent files exist
    Steps:
      1. Run `bun -e "import { qaLeadAgent } from './src/agents/qa-lead.ts'; import { safetyGuardAgent } from './src/agents/safety-guard.ts'; import { retroLeadAgent } from './src/agents/retro-lead.ts'; console.log(qaLeadAgent.sprintPhase); console.log(safetyGuardAgent.sprintPhase); console.log(retroLeadAgent.sprintPhase)"`
      2. Assert outputs: `test`, `cross-cutting`, `reflect`
    Expected Result: Support agents have correct phase assignments
    Failure Indicators: Wrong phases
    Evidence: .gstack/evidence/task-18-support-agents.txt
  ```

  **Commit**: YES
  - Message: `feat(agents): add support agent definitions (QA Lead, Release Engineer, Doc Engineer, Retro Lead, Safety Guard, Upgrader, Session Manager)`
  - Files: `src/agents/qa-lead.ts`, `src/agents/release-engineer.ts`, `src/agents/doc-engineer.ts`, `src/agents/retro-lead.ts`, `src/agents/safety-guard.ts`, `src/agents/upgrader.ts`, `src/agents/session-manager.ts`, tests
  - Pre-commit: `bun test src/agents/`

- [x] 19. Agent registry + createGstackAgents() factory

  **What to do**:
  - Create `src/agents/types.ts`:
    - Re-export `GstackAgent`, `AgentRole`, `SprintPhase` from `src/types/agent.ts`
    - Export `CreateAgentsOptions`: `{ disabledAgents?: Set<string>, orchestrationMode?: OrchestrationMode }`
  - Create `src/agents/index.ts`:
    - Barrel exports for all 13 agent files
    - Export `createGstackAgents(options: CreateAgentsOptions): GstackAgent[]`
    - Collects all 13 agents into array
    - Filters out disabled agents via `disabledAgents` Set
    - In `'skills-only'` orchestration mode, returns empty array (no agents registered)
    - Export `getAgentByRole(role: AgentRole): GstackAgent | undefined` — lookup by role
    - Export `getAgentsByPhase(phase: SprintPhase): GstackAgent[]` — filter by sprint phase
  - Write TDD tests: factory output, filtering, mode switching, lookup helpers

  **Must NOT do**:
  - Do NOT return agents in 'skills-only' mode — they're only for orchestration
  - Do NOT create a class-based registry — simple function exports

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Factory + lookup pattern — straightforward, mirrors skill registry
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after Tasks 17-18 complete)
  - **Blocks**: Task 23 (plugin integration)
  - **Blocked By**: Tasks 3 (types), 17-18 (all agent definition files)

  **References**:

  **Pattern References**:
  - `src/features/builtin-skills/skills.ts` (from Task 14) — Same factory pattern with options and filtering
  - `researchs/oh-my-openagent/src/agents/builtin-agents.ts` — Agent registry pattern

  **WHY Each Reference Matters**:
  - Task 14 skill factory — Same pattern (collect, filter, return). Agents mirror skills registry.
  - oh-my-openagent agent registry — Shows how agents are collected and registered

  **Acceptance Criteria**:
  - [ ] `bun test src/agents/` — registry tests pass
  - [ ] `createGstackAgents({})` returns 13 agents
  - [ ] `createGstackAgents({ disabledAgents: new Set(['ceo']) })` returns 12 agents
  - [ ] `createGstackAgents({ orchestrationMode: 'skills-only' })` returns empty array
  - [ ] `getAgentByRole('ceo')` returns CEO agent
  - [ ] `getAgentsByPhase('plan')` returns Eng Manager + Designer

  **QA Scenarios**:

  ```
  Scenario: Agent factory returns all 13 agents in multi-agent mode
    Tool: Bash (bun REPL)
    Preconditions: All agent files and registry exist
    Steps:
      1. Run `bun -e "import { createGstackAgents, getAgentByRole, getAgentsByPhase } from './src/agents/index.ts'; const agents = createGstackAgents({}); console.log(agents.length); const ceo = getAgentByRole('ceo'); console.log(ceo?.name); const planners = getAgentsByPhase('plan'); console.log(planners.length)"`
      2. Assert line 1 is `13`
      3. Assert line 2 is `CEO`
      4. Assert line 3 is `2` (Eng Manager + Designer)
    Expected Result: Full agent registry with working lookups
    Failure Indicators: Wrong count or missing agents
    Evidence: .gstack/evidence/task-19-agent-registry.txt

  Scenario: Agent factory returns empty in skills-only mode
    Tool: Bash (bun REPL)
    Preconditions: Registry exists
    Steps:
      1. Run `bun -e "import { createGstackAgents } from './src/agents/index.ts'; console.log(createGstackAgents({ orchestrationMode: 'skills-only' }).length)"`
      2. Assert output is `0`
    Expected Result: No agents registered in skills-only mode
    Failure Indicators: Non-zero count
    Evidence: .gstack/evidence/task-19-skills-only-agents.txt
  ```

  **Commit**: YES
  - Message: `feat(agents): add agent registry and createGstackAgents factory`
  - Files: `src/agents/types.ts`, `src/agents/index.ts`, tests
  - Pre-commit: `bun test src/agents/`

- [x] 22. SkillMcpManager — per-session MCP connections

  **What to do**:

- Create `src/features/skill-mcp-manager/types.ts`:
  - Export `SkillMcpClientInfo`: `{ sessionID: string, skillName: string, serverName: string }`
  - Export `SkillMcpServerContext`: `{ config: McpServerConfig }` (McpServerConfig from Task 3 types)
  - Export `SkillMcpManagerState`: `{ clients: Map<string, Client>, pendingConnections: Map<string, Promise<Client>>, disconnectedSessions: Map<string, number>, idleTimeoutMs: number, disposed: boolean }`
- Create `src/features/skill-mcp-manager/connection.ts`:
  - Export `getOrCreateClient(params: { state: SkillMcpManagerState, clientKey: string, info: SkillMcpClientInfo, config: McpServerConfig }): Promise<Client>`
  - Check `state.clients` for existing connection → return if found
  - Check `state.pendingConnections` for in-flight connection → await if found
  - Otherwise create new connection via `@modelcontextprotocol/sdk` Client
  - Support both `stdio` and `sse` transport types from config
  - Store connected client in `state.clients`
  - Export `getOrCreateClientWithRetryImpl(params): Promise<Client>` — wrapper with 3 retry attempts
- Create `src/features/skill-mcp-manager/cleanup.ts`:
  - Export `disconnectSession(state: SkillMcpManagerState, sessionID: string): Promise<void>` — close all clients for a session
  - Export `disconnectAll(state: SkillMcpManagerState): Promise<void>` — close all clients
  - Export `forceReconnect(state: SkillMcpManagerState, clientKey: string): Promise<void>` — remove cached client, force new connection
- Create `src/features/skill-mcp-manager/manager.ts`:
  - Export `class SkillMcpManager` (following oh-my-openagent pattern exactly):
    - Private `state: SkillMcpManagerState`
    - `getOrCreateClient(info, config): Promise<Client>` — delegates to connection module
    - `disconnectSession(sessionID): Promise<void>`
    - `disconnectAll(): Promise<void>`
    - `listTools(info, context): Promise<Tool[]>`
    - `listResources(info, context): Promise<Resource[]>`
    - `callTool(info, context, name, args): Promise<unknown>`
    - `readResource(info, context, uri): Promise<unknown>`
    - Private `withOperationRetry<T>(info, config, operation): Promise<T>` — retry with forceReconnect on "not connected"
    - `getConnectedServers(): string[]`
    - `isConnected(info): boolean`
- Create `src/features/skill-mcp-manager/index.ts`:
  - Barrel exports for types, manager
- Write TDD tests: client creation, caching, session disconnect, retry on failure, listTools/callTool, concurrent connection dedup

**Must NOT do**:

- Do NOT implement OAuth handling — only bearer token and API key auth
- Do NOT build connection pooling from scratch — use `@modelcontextprotocol/sdk`'s built-in Client
- Do NOT make connections synchronous at plugin load — all connections are on-demand
- Do NOT persist MCP state across sessions — ephemeral per-session

**Recommended Agent Profile**:

- **Category**: `deep`
  - Reason: MCP protocol integration with retry logic, concurrent connection dedup, and SDK usage requires careful implementation
- **Skills**: []

**Parallelization**:

- **Can Run In Parallel**: YES (with Tasks 20, 21, 24, 25)
- **Parallel Group**: Wave 5
- **Blocks**: Task 23 (plugin integration)
- **Blocked By**: Task 1 (deps — `@modelcontextprotocol/sdk`), Task 3 (MCP types)

**References**:

**Pattern References**:

- `researchs/oh-my-openagent/src/features/skill-mcp-manager/manager.ts` — EXACT pattern to follow: SkillMcpManager class with state, getOrCreateClient, withOperationRetry, disconnect methods
- `researchs/oh-my-openagent/src/features/skill-mcp-manager/types.ts` — Type shapes for MCP client info and state

**API/Type References**:

- `@modelcontextprotocol/sdk` — Client, Tool, Resource, Prompt types from SDK
- `src/types/mcp.ts` (from Task 3) — McpServerConfig with transport, url, command, args, env

**External References**:

- `@modelcontextprotocol/sdk` npm — Client API for stdio and SSE transports

**WHY Each Reference Matters**:

- oh-my-openagent SkillMcpManager — This is THE reference implementation. Follow the exact class structure, state shape, and retry pattern. Our version is simpler (no OAuth) but same architecture.
- MCP SDK types — The Client, Tool, Resource types from the SDK are the contract. Don't redefine them.

**Acceptance Criteria**:

- [ ] `bun test src/features/skill-mcp-manager/` — all tests pass
- [ ] SkillMcpManager class exports with all documented methods
- [ ] Client caching: same (sessionID, skillName, serverName) returns same client
- [ ] Session disconnect: all clients for a session are closed
- [ ] Retry: 3 attempts on "not connected" errors
- [ ] No synchronous connections — all methods return Promise

**QA Scenarios**:

```
Scenario: SkillMcpManager instantiates without blocking
  Tool: Bash (bun REPL)
  Preconditions: SkillMcpManager module exists
  Steps:
    1. Run `bun -e "import { SkillMcpManager } from './src/features/skill-mcp-manager/manager.ts'; const m = new SkillMcpManager(); console.log(typeof m.getOrCreateClient); console.log(typeof m.disconnectAll); console.log(typeof m.listTools); console.log(m.getConnectedServers().length)"`
    2. Assert all lines: `function`, `function`, `function`, `0`
  Expected Result: Manager creates instantly with no connections, all methods available
  Failure Indicators: Constructor blocks, methods missing
  Evidence: .gstack/evidence/task-22-mcp-manager-init.txt

Scenario: Client caching returns same client for same key
  Tool: Bash (bun REPL)
  Preconditions: SkillMcpManager with mock config
  Steps:
    1. Run test that calls getOrCreateClient twice with same info, verify same Client instance returned
    2. Verify `getConnectedServers()` returns 1 entry (not 2)
  Expected Result: Connection deduplication works
  Failure Indicators: Two separate connections created
  Evidence: .gstack/evidence/task-22-client-caching.txt
```

**Commit**: YES

- Message: `feat(mcp): add SkillMcpManager for per-session MCP connections`
- Files: `src/features/skill-mcp-manager/types.ts`, `src/features/skill-mcp-manager/connection.ts`, `src/features/skill-mcp-manager/cleanup.ts`, `src/features/skill-mcp-manager/manager.ts`, `src/features/skill-mcp-manager/index.ts`, tests
- Pre-commit: `bun test src/features/skill-mcp-manager/`

- [x] 20. Orchestrator — Intent classifier (user intent → sprint phase → agent)

  **What to do**:

- Create `src/features/orchestrator/types.ts`:
  - Export `UserIntent`: `{ text: string, context?: { currentPhase?: SprintPhase, recentSkills?: string[], hasDesignDoc?: boolean, hasBacklog?: boolean } }`
  - Export `ClassifiedIntent`: `{ phase: SprintPhase, confidence: number, suggestedAgent: AgentRole, suggestedSkills: string[], reasoning: string }`
  - Export `IntentClassifierOptions`: `{ orchestrationMode: OrchestrationMode }`
- Create `src/features/orchestrator/intent-patterns.ts`:
  - Export `PHASE_PATTERNS`: Map<SprintPhase, RegExp[]> — keyword/phrase patterns for each sprint phase
  - Think: "brainstorm", "idea", "what if", "office hours", "product"
  - Plan: "plan", "architecture", "design", "review plan", "eng review", "ceo review"
  - Build: "implement", "build", "code", "create", "add feature"
  - Review: "review", "check", "audit", "second opinion", "codex"
  - Test: "test", "qa", "browse", "benchmark", "verify", "bug"
  - Ship: "ship", "deploy", "release", "land", "merge", "pr"
  - Reflect: "retro", "retrospective", "stats", "how did we do"
  - Export `SKILL_TO_PHASE_MAP`: Record<string, SprintPhase> — maps each of 25 skill names to its sprint phase
  - Export `PHASE_TO_DEFAULT_AGENT`: Record<SprintPhase, AgentRole> — maps phase to primary agent role
- Create `src/features/orchestrator/intent-classifier.ts`:
  - Export `classifyIntent(text: string, options: IntentClassifierOptions): ClassifiedIntent`
  - In `'skills-only'` mode, return `{ phase: 'build', confidence: 0, suggestedAgent: 'builder', suggestedSkills: [], reasoning: 'Orchestration disabled' }`
  - Match against `PHASE_PATTERNS` — pick highest match count
  - If explicit skill name found (e.g., "/review"), use `SKILL_TO_PHASE_MAP` directly (confidence: 1.0)
  - Map phase → agent via `PHASE_TO_DEFAULT_AGENT`
  - Suggest skills based on phase and context (e.g., if `hasDesignDoc`, suggest design-review skills)
  - Return confidence score: 1.0 for exact skill match, 0.7-0.9 for pattern match, 0.3-0.6 for weak/multiple matches
  - Export `extractExplicitSkillName(text: string): string | undefined` — detect `/skill-name` patterns
- Write TDD tests: exact skill match, pattern matching, low confidence fallback, skills-only mode bypass, context-aware suggestions

**Must NOT do**:

- Do NOT use LLM for classification — this is deterministic pattern matching (LLM can be added later as enhancement)
- Do NOT import from agent registry — only use type-level AgentRole
- Do NOT handle delegation — that's Task 21's responsibility

**Recommended Agent Profile**:

- **Category**: `deep`
  - Reason: Pattern matching logic with confidence scoring requires careful design and testing
- **Skills**: []

**Parallelization**:

- **Can Run In Parallel**: YES (with Tasks 21, 22, 24, 25)
- **Parallel Group**: Wave 5
- **Blocks**: Task 21 (delegation engine uses classified intent), Task 23 (integration)
- **Blocked By**: Task 3 (types — SprintPhase, AgentRole), Task 14 (skill names list)

**References**:

**Pattern References**:

- `researchs/gstack/README.md` — Sprint phases (Think → Plan → Build → Review → Test → Ship → Reflect) and skill-to-phase mapping table
- `src/types/agent.ts` (from Task 3) — `SprintPhase`, `AgentRole` type definitions
- `src/features/builtin-skills/skills.ts` (from Task 14) — All 25 skill names for SKILL_TO_PHASE_MAP

**WHY Each Reference Matters**:

- gstack README — Canonical source for which skills belong to which sprint phase. The classification must match this exactly.
- Agent types — The classifier output references AgentRole and SprintPhase, so it must align with the type union values.
- Skill registry — The classifier needs to know all valid skill names to detect explicit `/skill-name` invocations.

**Acceptance Criteria**:

- [ ] `bun test src/features/orchestrator/` — all intent classifier tests pass
- [ ] `classifyIntent('/review', {})` returns `{ phase: 'review', confidence: 1.0, suggestedAgent: 'reviewer', ... }`
- [ ] `classifyIntent('I want to build a login page', {})` returns phase `'build'`, agent `'builder'`
- [ ] `classifyIntent('anything', { orchestrationMode: 'skills-only' })` returns confidence 0
- [ ] `extractExplicitSkillName('/qa https://example.com')` returns `'qa'`
- [ ] All 25 skills are in SKILL_TO_PHASE_MAP
- [ ] All 7 sprint phases are in PHASE_TO_DEFAULT_AGENT

**QA Scenarios**:

```
Scenario: Explicit skill invocation classified with confidence 1.0
  Tool: Bash (bun REPL)
  Preconditions: Intent classifier module exists
  Steps:
    1. Run `bun -e "import { classifyIntent } from './src/features/orchestrator/intent-classifier.ts'; const r = classifyIntent('/qa https://staging.example.com', { orchestrationMode: 'multi-agent' }); console.log(r.phase); console.log(r.confidence); console.log(r.suggestedAgent)"`
    2. Assert line 1 is `test`
    3. Assert line 2 is `1`
    4. Assert line 3 is `qa-lead`
  Expected Result: Explicit skill name triggers exact phase match with full confidence
  Failure Indicators: Wrong phase, confidence < 1.0, wrong agent
  Evidence: .gstack/evidence/task-20-explicit-skill.txt

Scenario: Skills-only mode returns zero confidence bypass
  Tool: Bash (bun REPL)
  Preconditions: Intent classifier module exists
  Steps:
    1. Run `bun -e "import { classifyIntent } from './src/features/orchestrator/intent-classifier.ts'; const r = classifyIntent('build a feature', { orchestrationMode: 'skills-only' }); console.log(r.confidence); console.log(r.reasoning)"`
    2. Assert line 1 is `0`
    3. Assert line 2 contains `disabled`
  Expected Result: No classification happens in skills-only mode
  Failure Indicators: Non-zero confidence, missing reasoning
  Evidence: .gstack/evidence/task-20-skills-only.txt
```

**Commit**: YES

- Message: `feat(orchestrator): add intent classifier with pattern-based sprint phase detection`
- Files: `src/features/orchestrator/types.ts`, `src/features/orchestrator/intent-patterns.ts`, `src/features/orchestrator/intent-classifier.ts`, tests
- Pre-commit: `bun test src/features/orchestrator/`

- [x] 21. Orchestrator — Agent delegation engine

  **What to do**:

- Create `src/features/orchestrator/delegation-engine.ts`:
  - Export `DelegationResult`: `{ agent: GstackAgent, skills: BuiltinSkill[], phase: SprintPhase, reasoning: string, fallbackSkills?: BuiltinSkill[] }`
  - Export `DelegationOptions`: `{ agents: GstackAgent[], skills: BuiltinSkill[], orchestrationMode: OrchestrationMode, disabledAgents?: Set<string> }`
  - Export `delegateIntent(classified: ClassifiedIntent, options: DelegationOptions): DelegationResult | null`
  - In `'skills-only'` mode, return null (no delegation)
  - Look up agent by `classified.suggestedAgent` in agents array
  - If agent disabled or not found, fallback to `'builder'` agent
  - Filter skills to those matching the classified phase (use agent's `skillNames` array)
  - Add `classified.suggestedSkills` if not already in list
  - If low confidence (< 0.5), add reasoning note suggesting user confirm intent
  - Export `getPhaseSkills(phase: SprintPhase, allSkills: BuiltinSkill[]): BuiltinSkill[]` — helper to filter skills by phase tag
- Create `src/features/orchestrator/index.ts`:
  - Barrel exports for types, intent-patterns, intent-classifier, delegation-engine
  - Export `createOrchestrator(options: OrchestratorOptions): Orchestrator` factory
  - `OrchestratorOptions`: `{ agents: GstackAgent[], skills: BuiltinSkill[], config: GstackConfig }`
  - `Orchestrator` interface: `{ classify(text: string): ClassifiedIntent, delegate(classified: ClassifiedIntent): DelegationResult | null }`
  - Factory composes classifier + delegation engine with options
- Write TDD tests: delegation with valid agent, fallback on disabled agent, skills-only returns null, low confidence reasoning, phase skill filtering, orchestrator factory composition

**Must NOT do**:

- Do NOT execute agent work — delegation only SELECTS the agent and skills
- Do NOT persist delegation results — that's workspace state's job (Task 26)
- Do NOT interact with Backlog.md — that's sprint-backlog integration's job (Task 34)

**Recommended Agent Profile**:

- **Category**: `deep`
  - Reason: Delegation logic with fallbacks, edge cases, and composition requires careful design
- **Skills**: []

**Parallelization**:

- **Can Run In Parallel**: NO (depends on Task 20)
- **Parallel Group**: Wave 5 (after Task 20 completes)
- **Blocks**: Task 23 (plugin integration), Task 34 (sprint-backlog)
- **Blocked By**: Task 3 (types), Task 14 (skill registry), Task 19 (agent registry), Task 20 (intent classifier)

**References**:

**Pattern References**:

- `src/features/orchestrator/intent-classifier.ts` (from Task 20) — ClassifiedIntent output shape that delegation engine consumes
- `src/agents/index.ts` (from Task 19) — `getAgentByRole()`, `getAgentsByPhase()` lookup helpers
- `src/features/builtin-skills/skills.ts` (from Task 14) — `createBuiltinSkills()` factory output

**API/Type References**:

- `src/types/agent.ts` (from Task 3) — GstackAgent interface with `skillNames: string[]` and `sprintPhase`
- `src/types/skill.ts` (from Task 3) — BuiltinSkill interface
- `src/features/orchestrator/types.ts` (from Task 20) — ClassifiedIntent, UserIntent

**WHY Each Reference Matters**:

- Task 20 classifier output — The delegation engine takes ClassifiedIntent as input; shapes must match exactly
- Agent registry lookups — The engine uses `getAgentByRole()` to find the target agent and needs the fallback logic
- Skill registry — The engine filters skills by phase matching, needing to understand the skill interface

**Acceptance Criteria**:

- [ ] `bun test src/features/orchestrator/` — all delegation engine tests pass
- [ ] `delegateIntent({ phase: 'review', suggestedAgent: 'reviewer', ... }, options)` returns Reviewer agent with review + codex skills
- [ ] Delegation with disabled reviewer falls back to builder
- [ ] `'skills-only'` mode returns null
- [ ] Low confidence (< 0.5) adds reasoning note
- [ ] `createOrchestrator()` factory returns working Orchestrator with classify + delegate methods
- [ ] `getPhaseSkills('test', allSkills)` returns qa + qa-only + browse + benchmark

**QA Scenarios**:

```
Scenario: Full orchestrator classify → delegate pipeline
  Tool: Bash (bun REPL)
  Preconditions: Orchestrator module, agent registry, skill registry exist
  Steps:
    1. Run `bun -e "import { createOrchestrator } from './src/features/orchestrator/index.ts'; import { createGstackAgents } from './src/agents/index.ts'; import { createBuiltinSkills } from './src/features/builtin-skills/skills.ts'; const agents = createGstackAgents({}); const skills = createBuiltinSkills({}); const orch = createOrchestrator({ agents, skills, config: { orchestrationMode: 'multi-agent' } }); const classified = orch.classify('/review'); const result = orch.delegate(classified); console.log(result?.agent.role); console.log(result?.skills.length > 0); console.log(result?.phase)"`
    2. Assert line 1 is `reviewer`
    3. Assert line 2 is `true`
    4. Assert line 3 is `review`
  Expected Result: Orchestrator correctly classifies and delegates review intent
  Failure Indicators: null result, wrong agent, no skills
  Evidence: .gstack/evidence/task-21-orchestrator-pipeline.txt

Scenario: Skills-only mode returns null delegation
  Tool: Bash (bun REPL)
  Preconditions: Orchestrator module exists
  Steps:
    1. Run `bun -e "import { createOrchestrator } from './src/features/orchestrator/index.ts'; import { createGstackAgents } from './src/agents/index.ts'; import { createBuiltinSkills } from './src/features/builtin-skills/skills.ts'; const agents = createGstackAgents({ orchestrationMode: 'skills-only' }); const skills = createBuiltinSkills({}); const orch = createOrchestrator({ agents, skills, config: { orchestrationMode: 'skills-only' } }); const classified = orch.classify('build something'); console.log(orch.delegate(classified))"`
    2. Assert output is `null`
  Expected Result: No delegation in skills-only mode
  Failure Indicators: Non-null result
  Evidence: .gstack/evidence/task-21-skills-only-delegation.txt
```

**Commit**: YES

- Message: `feat(orchestrator): add delegation engine and createOrchestrator factory`
- Files: `src/features/orchestrator/delegation-engine.ts`, `src/features/orchestrator/index.ts`, tests
- Pre-commit: `bun test src/features/orchestrator/`

- [x] 23. Plugin integration — Wire skills + agents + config + orchestrator + MCPs

  **What to do**:
  - Update `src/index.ts` (skeleton from Task 7) — fill in the 5-step init:
    - Step 1: `loadPluginConfig(ctx.directory, ctx)` — from Task 6
    - Step 2: `createManagers(config)` — create SkillMcpManager (Task 22)
    - Step 3: `createSkillsAndAgents(config)` — call `createBuiltinSkills()` (Task 14) + `createGstackAgents()` (Task 19)
    - Step 4: `createOrchestrator({ agents, skills, config })` — from Task 21
    - Step 5: `createPluginInterface({ config, skills, agents, orchestrator, mcpManager })` — from Task 8
  - Create `src/create-managers.ts`:
    - Export `createManagers(config: GstackConfig): { mcpManager: SkillMcpManager }`
    - Instantiate SkillMcpManager (no blocking connections)
  - Create `src/create-skills-and-agents.ts`:
    - Export `createSkillsAndAgents(config: GstackConfig): { skills: BuiltinSkill[], agents: GstackAgent[] }`
    - Call `createBuiltinSkills({ disabledSkills: config.disabledSkills })` — returns BuiltinSkill[]
    - Call `createGstackAgents({ disabledAgents: config.disabledAgents, orchestrationMode: config.orchestrationMode })` — returns GstackAgent[]
  - Update `src/plugin-interface.ts` (from Task 8) to accept orchestrator and mcpManager in options:
    - Wire orchestrator into `chat.message` hook — classify intent, return delegation info in system message
    - Wire mcpManager into `event` hook — disconnect session MCP clients on session delete
    - Ensure `config` hook calls `applyMcpConfig()` from Task 33 to register built-in MCPs
  - Verify plugin export: `export default GstackOpenCodePlugin` (the ONLY default export from index.ts)
  - Write integration tests: full plugin init returns valid Plugin, all 8 hook handlers present, skills-only mode still works

  **Must NOT do**:
  - Do NOT put business logic in `src/index.ts` — only composition calls
  - Do NOT make synchronous MCP connections during init — CRITICAL: 10s plugin load timeout
  - Do NOT export anything except `default` and type re-exports from index.ts
  - Do NOT import orchestrator in skills-only mode init path (but still create it — it returns null for delegation)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: This is THE critical integration task — wiring all modules together. Requires understanding of every prior task's API surface.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (after Tasks 6-9, 14, 19-22, 26, 33, 34 complete)
  - **Blocks**: Task 27 (build pipeline needs complete plugin)
  - **Blocked By**: Tasks 6 (config), 7 (entry skeleton), 8 (plugin interface), 9 (config handler), 14 (skill registry), 19 (agent registry), 20-21 (orchestrator), 22 (MCP manager), 26 (workspace), 33 (MCP config handler), 34 (sprint-backlog)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/index.ts` — EXACT 5-step init pattern to follow
  - `researchs/oh-my-openagent/src/create-managers.ts` — Manager factory pattern
  - `researchs/oh-my-openagent/src/plugin-interface.ts` — How hook handlers are assembled and returned

  **API/Type References**:
  - `@opencode-ai/plugin` — Plugin type that the default export must satisfy
  - `src/plugin-config.ts` (Task 6) — `loadPluginConfig()` signature
  - `src/features/orchestrator/index.ts` (Task 21) — `createOrchestrator()` factory
  - `src/features/skill-mcp-manager/manager.ts` (Task 22) — SkillMcpManager class

  **WHY Each Reference Matters**:
  - oh-my-openagent index.ts — The init pattern is proven to work within OpenCode's 10s load timeout. Must follow the same async-but-fast pattern.
  - Each prior task's factory — This task ONLY composes; it calls factories from other tasks. Understanding their signatures is everything.
  - Plugin type — The return value must conform to OpenCode's Plugin interface. Any deviation breaks plugin loading.

  **Acceptance Criteria**:
  - [ ] `bun test src/` — integration tests pass
  - [ ] `bun -e "import p from './src/index.ts'; console.log(typeof p)"` → outputs `function`
  - [ ] Plugin init completes in < 2s (well within 10s timeout)
  - [ ] Plugin returns all 8 hook handler types (config, tool, chat.message, chat.params, chat.headers, event, tool.execute.before, tool.execute.after)
  - [ ] In multi-agent mode: skills + agents + orchestrator all populated
  - [ ] In skills-only mode: skills populated, agents empty, orchestrator returns null for delegation
  - [ ] Only `default` export from index.ts (no named function exports)

  **QA Scenarios**:

  ```
  Scenario: Plugin loads and returns valid hook handlers
    Tool: Bash (bun REPL)
    Preconditions: All prior tasks completed, full plugin assembled
    Steps:
      1. Run `bun -e "import GstackPlugin from './src/index.ts'; const plugin = await GstackPlugin({ client: {}, project: {}, directory: process.cwd(), $: {} }); console.log(Object.keys(plugin).sort().join(','))"`
      2. Assert output contains: `chat.headers,chat.message,chat.params,config,event,tool,tool.execute.after,tool.execute.before`
    Expected Result: All 8 OpenCode hook handlers present
    Failure Indicators: Missing handlers, plugin init throws, exceeds timeout
    Evidence: .gstack/evidence/task-23-plugin-hooks.txt

  Scenario: Plugin init completes under 2 seconds
    Tool: Bash (bun REPL)
    Preconditions: Full plugin assembled
    Steps:
      1. Run `bun -e "const start = Date.now(); const p = await import('./src/index.ts'); const plugin = await p.default({ client: {}, project: {}, directory: process.cwd(), $: {} }); console.log(Date.now() - start)"`
      2. Assert output is a number < 2000
    Expected Result: Plugin initializes fast (no blocking MCP connections)
    Failure Indicators: Value >= 2000, timeout
    Evidence: .gstack/evidence/task-23-init-timing.txt
  ```

  **Commit**: YES
  - Message: `feat(plugin): wire skills, agents, config, orchestrator, and MCPs into plugin entry point`
  - Files: `src/index.ts`, `src/create-managers.ts`, `src/create-skills-and-agents.ts`, `src/plugin-interface.ts` (updated), tests
  - Pre-commit: `bun test`

- [x] 24. CLI — install + doctor commands

  **What to do**:
  - Create `src/cli/index.ts`:
    - Entry point: `#!/usr/bin/env bun` shebang + `import { runCli } from './cli-program'` + `runCli()`
  - Create `src/cli/cli-program.ts`:
    - Use `commander` to define CLI program: `gstack`
    - `.version(packageVersion)` from package.json
    - Add `install` command: interactive setup wizard
    - Add `doctor` command: health diagnostics
  - Create `src/cli/install.ts`:
    - Export `runInstall(): Promise<void>`
    - Check if opencode.json exists at `~/.config/opencode/opencode.json`
    - If not, create with empty plugin array

- Add `"@nntoan/gstack"` to plugin array (if not already present)
  - Create default config file at `.opencode/gstack.jsonc` with sensible defaults:
    - Pre-fill `"$schema": "https://raw.githubusercontent.com/nntoan/opencode-gstack/main/schemas/config.schema.json"` at top of generated config (import `SCHEMA_URL` from `src/config/schema/constants.ts`)
    - Include commented-out example settings so users see what's available
    - Print success message with next steps
  - Create `src/cli/doctor/types.ts`:
    - Export `DoctorCheck`: `{ name: string, category: 'system' | 'config' | 'tools' | 'mcp', run: () => Promise<DoctorResult> }`
    - Export `DoctorResult`: `{ status: 'pass' | 'warn' | 'fail', message: string, detail?: string }`
  - Create `src/cli/doctor/checks/system.ts`:
    - Check: Bun version >= 1.0
    - Check: Plugin binary found (gstack in node_modules/.bin or global)
    - Check: Package version matches installed
  - Create `src/cli/doctor/checks/config.ts`:
    - Check: Config file parseable (JSONC valid)
    - Check: Config passes Zod schema validation
    - Check: Orchestration mode is valid value
  - Create `src/cli/doctor/checks/tools.ts`:
    - Check: Playwright installed (for browser daemon)
    - Check: git CLI available
  - Create `src/cli/doctor/checks/mcp.ts`:
    - Check: Backlog.md CLI available (`which backlog` or `npx backlog --version`)
    - Check: MCP config entries exist in opencode config (advisory, not blocking)
  - Create `src/cli/doctor/checks/index.ts`:
    - Barrel export collecting all checks from system, config, tools, mcp
  - Create `src/cli/doctor/runner.ts`:
    - Export `runDoctor(): Promise<void>`
    - Run all checks in parallel (Promise.allSettled)
    - Group results by category
    - Print formatted output with pass/warn/fail icons
  - Create `src/cli/doctor/index.ts`:
    - Barrel exports
  - Update `package.json` (in Task 27): `"bin": { "gstack": "dist/cli.js" }`
  - Write TDD tests: install creates config, doctor runs all checks, individual check functions

  **Must NOT do**:
  - Do NOT use interactive prompts (no @clack/prompts) — keep install non-interactive for now
  - Do NOT add `run` command — that's oh-my-openagent specific, not needed for gstack
  - Do NOT fail doctor on missing Backlog.md — it's optional (graceful degradation)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: CLI with commander.js, file system operations, and parallel checks — moderate complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20, 21, 22, 25)
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 23 (plugin integration needs CLI binary path), Task 27 (build pipeline needs bin entry)
  - **Blocked By**: Task 1 (deps — commander), Task 4 (config schema for validation checks)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/cli/cli-program.ts` — Commander.js program setup with subcommands
  - `researchs/oh-my-openagent/src/cli/install.ts` — Install command routing pattern
  - `researchs/oh-my-openagent/src/cli/doctor/runner.ts` — Parallel check execution pattern
  - `researchs/oh-my-openagent/src/cli/doctor/checks/` — Individual check file structure (4 categories)

  **API/Type References**:
  - `commander` npm — Command, program, action, option API
  - `src/config/schema/` (from Task 4) — Zod schema for config validation in doctor checks

  **WHY Each Reference Matters**:
  - oh-my-openagent CLI — Proven Commander.js patterns for OpenCode plugin CLIs. Follow the same structure for consistency.
  - Doctor checks pattern — 4-category check system with pass/warn/fail is battle-tested. Copy the organization.
  - Config schema — Doctor's config check validates user config against the Zod schema from Task 4.

  **Acceptance Criteria**:
  - [ ] `bun test src/cli/` — all CLI tests pass
  - [ ] `bun src/cli/index.ts --help` prints gstack CLI help
  - [ ] `bun src/cli/index.ts doctor` runs all checks and prints formatted output
  - [ ] Doctor checks are grouped by category: system, config, tools, mcp
  - [ ] Missing Backlog.md CLI → warn (not fail)
  - [ ] Install command creates config file if missing

  **QA Scenarios**:

  ```
  Scenario: CLI help displays available commands
    Tool: Bash
    Preconditions: CLI module exists
    Steps:
      1. Run `bun src/cli/index.ts --help`
      2. Assert output contains `install`
      3. Assert output contains `doctor`
      4. Assert output contains `gstack`
    Expected Result: Help shows both commands
    Failure Indicators: Missing commands, error on help
    Evidence: .gstack/evidence/task-24-cli-help.txt

  Scenario: Doctor runs all checks without crashing
    Tool: Bash
    Preconditions: CLI and all check modules exist
    Steps:
      1. Run `bun src/cli/index.ts doctor 2>&1`
      2. Assert exit code is 0
      3. Assert output contains category headers (system, config, tools, mcp)
      4. Assert output contains at least one pass/warn/fail indicator
    Expected Result: Doctor completes with categorized results
    Failure Indicators: Crash, uncaught error, missing categories
    Evidence: .gstack/evidence/task-24-doctor-run.txt
  ```

  **Commit**: YES
  - Message: `feat(cli): add install and doctor commands with health checks`
  - Files: `src/cli/index.ts`, `src/cli/cli-program.ts`, `src/cli/install.ts`, `src/cli/doctor/`, tests
  - Pre-commit: `bun test src/cli/`

- [x] 25. Local analytics (JSONL telemetry tracking)

  **What to do**:
  - Create `src/features/analytics/types.ts`:
    - Export `SkillUsageEvent`: `{ timestamp: string, skillName: string, duration: number, success: boolean, phase?: SprintPhase, version: string }`
    - Export `EurekaEvent`: `{ timestamp: string, skillName: string, insight: string, category: 'learning' | 'bug' | 'optimization' | 'pattern' }`
    - Export `SprintLogEvent`: `{ timestamp: string, phase: SprintPhase, action: 'started' | 'completed' | 'skipped', agent?: string, taskId?: string }`
    - Export `AnalyticsOptions`: `{ analyticsDir: string, enabled: boolean }`
  - Create `src/features/analytics/writer.ts`:
    - Export `appendJsonl(filePath: string, event: Record<string, unknown>): Promise<void>`
    - Append single JSON line to file (create if not exists)
    - Use `Bun.write` with append mode
    - Handle write errors gracefully (log but don't throw)
  - Create `src/features/analytics/skill-usage-tracker.ts`:
    - Export `createSkillUsageTracker(options: AnalyticsOptions): SkillUsageTracker`
    - `SkillUsageTracker.record(event: SkillUsageEvent): Promise<void>` — writes to `.gstack/analytics/skill-usage.jsonl`
    - `SkillUsageTracker.getRecent(limit: number): Promise<SkillUsageEvent[]>` — reads last N events
  - Create `src/features/analytics/eureka-tracker.ts`:
    - Export `createEurekaTracker(options: AnalyticsOptions): EurekaTracker`
    - `EurekaTracker.record(event: EurekaEvent): Promise<void>` — writes to `.gstack/analytics/eureka.jsonl`
    - `EurekaTracker.getInsights(skillName?: string): Promise<EurekaEvent[]>` — reads insights, optionally filtered
  - Create `src/features/analytics/sprint-logger.ts`:
    - Export `createSprintLogger(options: AnalyticsOptions): SprintLogger`
    - `SprintLogger.log(event: SprintLogEvent): Promise<void>` — writes to `.gstack/orchestrator/sprint-log.jsonl`
    - `SprintLogger.getPhaseHistory(): Promise<SprintLogEvent[]>` — reads full sprint log
  - Create `src/features/analytics/index.ts`:
    - Barrel exports + `createAnalytics(options: AnalyticsOptions): { skillUsage: SkillUsageTracker, eureka: EurekaTracker, sprintLog: SprintLogger }`
  - Write TDD tests: JSONL append, read back, empty file handling, analytics disabled mode (no-op)

  **Must NOT do**:
  - Do NOT implement Supabase remote telemetry — local JSONL only (Supabase is deferred/out of scope)
  - Do NOT block plugin operations on analytics writes — fire-and-forget
  - Do NOT create analytics directory eagerly — create on first write (lazy)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple JSONL append/read operations with straightforward file I/O
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20, 21, 22, 24)
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 23 (plugin integration wires analytics)
  - **Blocked By**: Task 2 (shared utilities — path helpers), Task 3 (types — SprintPhase)

  **References**:

  **Pattern References**:
  - `researchs/gstack/.agents/skills/gstack/SKILL.md` — gstack's telemetry format: `~/.gstack/analytics/skill-usage.jsonl` and `~/.gstack/analytics/eureka.jsonl`
  - `src/shared/path-helpers.ts` (from Task 2) — `getGstackDir()` for resolving `.gstack/analytics/` path

  **API/Type References**:
  - `src/types/agent.ts` (from Task 3) — SprintPhase for sprint log events

  **WHY Each Reference Matters**:
  - gstack's existing telemetry format — We must match the JSONL format so existing gstack analytics tools can read our output
  - Path helpers — Analytics writes to `.gstack/analytics/` which must be resolved via the shared path helper

  **Acceptance Criteria**:
  - [ ] `bun test src/features/analytics/` — all tests pass
  - [ ] Skill usage writes valid JSONL to `.gstack/analytics/skill-usage.jsonl`
  - [ ] Eureka writes to `.gstack/analytics/eureka.jsonl`
  - [ ] Sprint logger writes to `.gstack/orchestrator/sprint-log.jsonl`
  - [ ] Read functions parse JSONL back into typed arrays
  - [ ] Disabled analytics mode: record() is no-op, no files created
  - [ ] Directory creation is lazy (on first write, not on tracker creation)

  **QA Scenarios**:

  ```
  Scenario: Skill usage tracker writes and reads JSONL
    Tool: Bash (bun REPL)
    Preconditions: Analytics module exists, temp directory available
    Steps:
      1. Run `bun -e "import { createAnalytics } from './src/features/analytics/index.ts'; const a = createAnalytics({ analyticsDir: '/tmp/gstack-test-analytics', enabled: true }); await a.skillUsage.record({ timestamp: new Date().toISOString(), skillName: 'review', duration: 5000, success: true, version: '0.1.0' }); const events = await a.skillUsage.getRecent(10); console.log(events.length); console.log(events[0].skillName)"`
      2. Assert line 1 is `1`
      3. Assert line 2 is `review`
    Expected Result: JSONL round-trip works
    Failure Indicators: Empty array, parse error, wrong data
    Evidence: .gstack/evidence/task-25-skill-usage.txt

  Scenario: Analytics disabled mode produces no files
    Tool: Bash (bun REPL)
    Preconditions: Analytics module exists
    Steps:
      1. Run `bun -e "import { createAnalytics } from './src/features/analytics/index.ts'; const a = createAnalytics({ analyticsDir: '/tmp/gstack-test-disabled', enabled: false }); await a.skillUsage.record({ timestamp: new Date().toISOString(), skillName: 'review', duration: 1000, success: true, version: '0.1.0' }); const fs = require('fs'); console.log(fs.existsSync('/tmp/gstack-test-disabled'))"`
      2. Assert output is `false`
    Expected Result: No directory or file created when disabled
    Failure Indicators: Directory exists
    Evidence: .gstack/evidence/task-25-disabled-mode.txt
  ```

  **Commit**: YES
  - Message: `feat(telemetry): add local JSONL analytics — skill usage, eureka insights, sprint logger`
  - Files: `src/features/analytics/types.ts`, `src/features/analytics/writer.ts`, `src/features/analytics/skill-usage-tracker.ts`, `src/features/analytics/eureka-tracker.ts`, `src/features/analytics/sprint-logger.ts`, `src/features/analytics/index.ts`, tests
  - Pre-commit: `bun test src/features/analytics/`

- [x] 26. Workspace state manager (boulder, sessions, notepads, review dashboard)

  **What to do**:
  - Create `src/features/workspace-state/types.ts`:
    - Export `BoulderState`: `{ active_plan: string, started_at: string, session_ids: string[], plan_name: string, agent?: string, current_phase?: SprintPhase, task_sessions?: Record<string, TaskSessionState> }`
    - Export `TaskSessionState`: `{ task_key: string, task_label: string, task_title: string, session_id: string, agent?: string, category?: string, updated_at: string }`
    - Export `PlanProgress`: `{ total: number, completed: number, isComplete: boolean }`
    - Export `ReviewDashboardEntry`: `{ reviewType: 'eng' | 'ceo' | 'design', status: 'pending' | 'passed' | 'failed' | 'skipped', reviewer?: string, timestamp: string, findings?: string[] }`
    - Export `SessionRecord`: `{ sessionId: string, startedAt: string, phase: SprintPhase, agent: string, status: 'active' | 'completed' | 'abandoned' }`
  - Create `src/features/workspace-state/constants.ts`:
    - Export `GSTACK_DIR = '.gstack'`
    - Export `BOULDER_FILE = 'boulder.json'` (at `.gstack/orchestrator/boulder.json`)
    - Export `ORCHESTRATOR_DIR = 'orchestrator'`
    - Export `SESSIONS_DIR = 'sessions'`
    - Export `NOTEPADS_DIR = 'notepads'`
    - Export `REVIEWS_DIR = 'reviews'`
    - Export `PLANS_DIR = 'plans'`
    - Export `EVIDENCE_DIR = 'evidence'`
    - Export `DESIGN_DOCS_DIR = 'design-docs'`
    - Export `RULES_DIR = 'rules'`
  - Create `src/features/workspace-state/boulder-storage.ts`:
    - Export `getBoulderFilePath(directory: string): string`
    - Export `readBoulderState(directory: string): BoulderState | null`
    - Export `writeBoulderState(directory: string, state: BoulderState): boolean`
    - Export `appendSessionId(directory: string, sessionId: string): BoulderState | null`
    - Export `clearBoulderState(directory: string): boolean`
    - Export `createBoulderState(planPath: string, sessionId: string, agent?: string): BoulderState`
    - Follow oh-my-openagent's `boulder-state/storage.ts` pattern exactly (JSON read/write, mkdir recursive, RESERVED_KEYS guard)
  - Create `src/features/workspace-state/plan-progress.ts`:
    - Export `getPlanProgress(planPath: string): PlanProgress` — count markdown checkboxes
    - Export `getPlanName(planPath: string): string` — extract basename without extension
    - Export `findPlans(directory: string): string[]` — find `.gstack/plans/*.md` files sorted by mtime
  - Create `src/features/workspace-state/session-tracker.ts`:
    - Export `createSessionTracker(directory: string): SessionTracker`
    - `SessionTracker.start(sessionId: string, phase: SprintPhase, agent: string): Promise<void>` — writes to `.gstack/sessions/{sessionId}.json`
    - `SessionTracker.complete(sessionId: string): Promise<void>` — marks session completed
    - `SessionTracker.getActive(): Promise<SessionRecord[]>` — reads all active sessions
    - `SessionTracker.cleanup(maxAgeMs: number): Promise<number>` — removes stale sessions (default 2h, matching gstack's PID-based auto-clean)
  - Create `src/features/workspace-state/review-dashboard.ts`:
    - Export `createReviewDashboard(directory: string): ReviewDashboard`
    - `ReviewDashboard.record(entry: ReviewDashboardEntry): Promise<void>` — appends to `.gstack/reviews/dashboard.json`
    - `ReviewDashboard.getStatus(): Promise<ReviewDashboardEntry[]>` — reads all review entries
    - `ReviewDashboard.isShipReady(): Promise<{ ready: boolean, missing: string[] }>` — checks eng review required, CEO/design optional (matching gstack's Review Readiness Dashboard logic)
  - Create `src/features/workspace-state/notepad-manager.ts`:
    - Export `createNotepadManager(directory: string, planName: string): NotepadManager`
    - `NotepadManager.write(category: 'learnings' | 'decisions' | 'issues' | 'verification' | 'problems', content: string): Promise<void>` — appends to `.gstack/notepads/{planName}/{category}.md`
    - `NotepadManager.read(category: string): Promise<string>` — reads notepad content
    - `NotepadManager.list(): Promise<string[]>` — lists notepad categories for current plan
  - Create `src/features/workspace-state/ensure-workspace.ts`:
    - Export `ensureWorkspaceDir(directory: string): void` — creates `.gstack/` and adds to `.gitignore` if missing (port from `browse/src/config.ts:ensureStateDir`)
    - Export `ensureSubdir(directory: string, subdir: string): string` — creates subdirectory under `.gstack/`
  - Create `src/features/workspace-state/index.ts`:
    - Barrel exports + `createWorkspaceState(directory: string): WorkspaceState` factory
  - Write TDD tests: boulder CRUD, plan progress counting, session lifecycle, review dashboard ship-readiness, notepad read/write, ensure workspace creates correct subdirectories

  **Must NOT do**:
  - Do NOT store boulder.json at `.gstack/boulder.json` root — MUST be at `.gstack/orchestrator/boulder.json`
  - Do NOT store loose files in `.gstack/` root — everything in subdirectories (organized by concern)
  - Do NOT use oh-my-openagent's `.sisyphus/` paths — translate ALL to `.gstack/` equivalents
  - Do NOT mix session management with boulder state — separate files per concern

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple interrelated CRUD modules with filesystem I/O and JSON persistence patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20, 21, 22, 24, 25)
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 23 (plugin integration wires workspace state)
  - **Blocked By**: Task 2 (shared utilities — path helpers), Task 3 (types — SprintPhase)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/src/features/boulder-state/storage.ts` — EXACT pattern for boulder read/write/append/clear/create. Follow the same JSON persistence approach, RESERVED_KEYS guard, and error handling. Translate `.sisyphus/` paths to `.gstack/orchestrator/`
  - `researchs/oh-my-openagent/src/features/boulder-state/types.ts` — BoulderState, PlanProgress, TaskSessionState type shapes. Our types extend these with sprint-specific fields (current_phase, ReviewDashboardEntry)
  - `researchs/oh-my-openagent/src/features/boulder-state/constants.ts` — Path constants pattern. We replicate but with `.gstack/` subdirectory structure
  - `researchs/gstack/browse/src/config.ts:80-113` — `ensureStateDir()` function: creates `.gstack/` directory, adds to `.gitignore`. Port this exact logic for `ensureWorkspaceDir()`
  - `researchs/gstack/.agents/skills/gstack/SKILL.md` — gstack's session tracking: `~/.gstack/sessions/` with PID-based auto-cleanup after 2 hours. We adapt to project-local `.gstack/sessions/`

  **API/Type References**:
  - `src/types/agent.ts` (from Task 3) — SprintPhase type for session and boulder state
  - `src/shared/path-helpers.ts` (from Task 2) — `getGstackDir()` for resolving `.gstack/` path

  **WHY Each Reference Matters**:
  - oh-my-openagent's boulder-state — This is the EXACT model we're following. Same read/write JSON pattern, same session tracking, same plan progress counting. Only paths change
  - gstack's ensureStateDir — The `.gitignore` update logic is battle-tested (handles missing .gitignore, appends separator). Must port exactly
  - gstack's session tracking — The 2-hour cleanup interval is a deliberate gstack convention to prevent stale sessions

  **Acceptance Criteria**:
  - [ ] `bun test src/features/workspace-state/` — all tests pass
  - [ ] Boulder state CRUD works: create, read, write, append session, clear
  - [ ] Plan progress correctly counts `- [ ]` and `- [x]` checkboxes
  - [ ] Session tracker writes/reads individual JSON files in `.gstack/sessions/`
  - [ ] Session cleanup removes sessions older than specified max age
  - [ ] Review dashboard records entries and correctly determines ship-readiness
  - [ ] Notepad manager creates plan-specific subdirectories under `.gstack/notepads/`
  - [ ] `ensureWorkspaceDir()` creates `.gstack/` and adds to `.gitignore`
  - [ ] All state files land in correct `.gstack/` subdirectories (not root)

  **QA Scenarios**:

  ```
  Scenario: Boulder state full lifecycle
    Tool: Bash (bun REPL)
    Preconditions: Workspace state module exists, temp directory available
    Steps:
      1. Run `bun -e "import { createBoulderState, writeBoulderState, readBoulderState, appendSessionId, clearBoulderState } from './src/features/workspace-state/boulder-storage.ts'; import { mkdtempSync } from 'fs'; import { join } from 'path'; const dir = mkdtempSync('/tmp/ws-test-'); const state = createBoulderState(join(dir, '.gstack/plans/test.md'), 'ses_001'); const ok = writeBoulderState(dir, state); const read = readBoulderState(dir); const appended = appendSessionId(dir, 'ses_002'); console.log(ok, read?.plan_name, appended?.session_ids.length); clearBoulderState(dir); console.log(readBoulderState(dir))"`
      2. Assert output line 1 is `true test 2`
      3. Assert output line 2 is `null`
    Expected Result: Full CRUD lifecycle works correctly
    Failure Indicators: Write fails, read returns wrong data, clear doesn't remove file
    Evidence: .gstack/evidence/task-26-boulder-lifecycle.txt

  Scenario: Review dashboard ship-readiness check
    Tool: Bash (bun REPL)
    Preconditions: Workspace state module exists
    Steps:
      1. Run `bun -e "import { createReviewDashboard } from './src/features/workspace-state/review-dashboard.ts'; import { mkdtempSync } from 'fs'; const dir = mkdtempSync('/tmp/ws-test-'); const rd = createReviewDashboard(dir); await rd.record({ reviewType: 'eng', status: 'passed', timestamp: new Date().toISOString() }); const result = await rd.isShipReady(); console.log(result.ready, result.missing.length)"`
      2. Assert output is `true 0` (eng review passed = ship ready)
    Expected Result: Ship readiness correctly evaluates eng review requirement
    Failure Indicators: Returns not ready when eng review passed
    Evidence: .gstack/evidence/task-26-ship-readiness.txt

  Scenario: Ensure workspace creates subdirectories and updates .gitignore
    Tool: Bash (bun REPL)
    Preconditions: Workspace state module exists
    Steps:
      1. Run `bun -e "import { ensureWorkspaceDir } from './src/features/workspace-state/ensure-workspace.ts'; import { mkdtempSync, existsSync, readFileSync, writeFileSync } from 'fs'; import { join } from 'path'; const dir = mkdtempSync('/tmp/ws-test-'); writeFileSync(join(dir, '.gitignore'), 'node_modules/\n'); ensureWorkspaceDir(dir); console.log(existsSync(join(dir, '.gstack'))); console.log(readFileSync(join(dir, '.gitignore'), 'utf-8').includes('.gstack/'))"`
      2. Assert output line 1 is `true`
      3. Assert output line 2 is `true`
    Expected Result: .gstack/ created and .gitignore updated
    Failure Indicators: Directory not created, .gitignore not updated
    Evidence: .gstack/evidence/task-26-ensure-workspace.txt
  ```

  **Commit**: YES
  - Message: `feat(workspace): add workspace state manager — boulder, sessions, notepads, review dashboard`
  - Files: `src/features/workspace-state/types.ts`, `src/features/workspace-state/constants.ts`, `src/features/workspace-state/boulder-storage.ts`, `src/features/workspace-state/plan-progress.ts`, `src/features/workspace-state/session-tracker.ts`, `src/features/workspace-state/review-dashboard.ts`, `src/features/workspace-state/notepad-manager.ts`, `src/features/workspace-state/ensure-workspace.ts`, `src/features/workspace-state/index.ts`, tests
  - Pre-commit: `bun test src/features/workspace-state/`

- [x] 34. Sprint-backlog integration (orchestrator ↔ Backlog.md lifecycle)

  **What to do**:
  - Create `src/features/sprint-backlog/types.ts`:
    - Export `BacklogTask`: `{ id: string, title: string, status: 'todo' | 'in-progress' | 'done' | 'archived', priority: 'p0' | 'p1' | 'p2', assignee?: string, dependencies?: string[], definitionOfDone?: string[], implementationPlan?: string }`
    - Export `SprintContext`: `{ sprintId: string, phase: SprintPhase, activeTasks: BacklogTask[], completedTasks: BacklogTask[] }`
    - Export `BacklogMcpAvailability`: `{ available: boolean, reason?: string }`
  - Create `src/features/sprint-backlog/backlog-client.ts`:
    - Export `createBacklogClient(mcpTools: McpToolInvoker): BacklogClient`
    - `BacklogClient.isAvailable(): Promise<BacklogMcpAvailability>` — checks if Backlog.md MCP is connected and responsive (graceful degradation)
    - `BacklogClient.createTask(title: string, opts: { priority?: string, assignee?: string, description?: string }): Promise<BacklogTask | null>` — invokes `backlog task create` via MCP tool
    - `BacklogClient.updateStatus(taskId: string, status: string): Promise<boolean>` — invokes `backlog task edit` via MCP tool
    - `BacklogClient.listTasks(filter?: { status?: string }): Promise<BacklogTask[]>` — invokes `backlog task list` via MCP tool
    - `BacklogClient.archiveTask(taskId: string): Promise<boolean>` — invokes `backlog task archive` via MCP tool
    - ALL operations go through MCP tools — NEVER directly read/write `.backlog/` files
  - Create `src/features/sprint-backlog/think-plan-creator.ts`:
    - Export `createThinkPlanTaskCreator(client: BacklogClient): ThinkPlanTaskCreator`
    - `ThinkPlanTaskCreator.createSprintTasks(planName: string, objectives: string[]): Promise<BacklogTask[]>` — auto-creates `.backlog/` tasks from plan objectives during Think/Plan phases
    - Maps plan objectives to individual backlog tasks with appropriate priorities
    - Assigns agent names as task assignees based on sprint phase
  - Create `src/features/sprint-backlog/build-status-updater.ts`:
    - Export `createBuildStatusUpdater(client: BacklogClient): BuildStatusUpdater`
    - `BuildStatusUpdater.markInProgress(taskId: string, agent: string): Promise<void>` — called when agent starts working on a task
    - `BuildStatusUpdater.markDone(taskId: string, agent: string): Promise<void>` — called when agent completes a task
    - `BuildStatusUpdater.recordBlocker(taskId: string, reason: string): Promise<void>` — records blocker in task description
  - Create `src/features/sprint-backlog/ship-readiness-checker.ts`:
    - Export `createShipReadinessChecker(client: BacklogClient): ShipReadinessChecker`
    - `ShipReadinessChecker.check(): Promise<{ ready: boolean, pendingTasks: BacklogTask[], completionPercentage: number }>` — checks all backlog tasks for completion before `/ship`
    - Returns structured report of what's done and what's blocking
  - Create `src/features/sprint-backlog/graceful-degradation.ts`:
    - Export `withBacklogFallback<T>(operation: () => Promise<T>, fallback: T, context: string): Promise<T>` — wraps all backlog operations with graceful degradation
    - Logs warning when Backlog.md is unavailable but doesn't throw
    - Returns fallback value so orchestrator can continue without sprint tracking
  - Create `src/features/sprint-backlog/index.ts`:
    - Barrel exports + `createSprintBacklog(mcpTools: McpToolInvoker): SprintBacklog` factory
    - Returns composed object: `{ client, taskCreator, statusUpdater, shipChecker, isAvailable }`
  - Write TDD tests: backlog client with mocked MCP tools, task creation from plan objectives, status updates, ship readiness calculation, graceful degradation when MCP unavailable

  **Must NOT do**:
  - Do NOT directly read/write `.backlog/` files — ALWAYS go through Backlog.md MCP tools
  - Do NOT build a custom sprint state machine — leverage Backlog.md's native status/priority system
  - Do NOT make Backlog.md a hard dependency — MUST gracefully degrade if CLI not installed or MCP not connected
  - Do NOT persist sprint state redundantly — `.backlog/` IS the source of truth (don't duplicate in `.gstack/`)
  - Do NOT import `@modelcontextprotocol/sdk` directly — use the McpToolInvoker abstraction from SkillMcpManager

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex integration between orchestrator lifecycle phases and external MCP tool invocations with graceful degradation patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20, 21, 22, 24, 25, 26)
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 23 (plugin integration wires sprint-backlog into orchestrator)
  - **Blocked By**: Task 3 (types — SprintPhase), Task 22 (SkillMcpManager — McpToolInvoker abstraction)

  **References**:

  **Pattern References**:
  - `researchs/gstack/.agents/skills/gstack-ship/SKILL.md` — gstack's ship flow: Review Readiness Dashboard checks before shipping. Our `shipReadinessChecker` replaces this with Backlog.md completion checks
  - `researchs/gstack/TODOS.md` — gstack's informal P0/P1/P2 backlog format. Backlog.md replaces this with structured YAML frontmatter tasks
  - `researchs/oh-my-openagent/src/features/skill-mcp-manager/manager.ts` — SkillMcpManager provides the MCP tool invocation interface. `BacklogClient` will use this to call Backlog.md tools

  **API/Type References**:
  - `src/types/agent.ts` (from Task 3) — SprintPhase for phase-aware task creation
  - `src/features/skill-mcp-manager/types.ts` (from Task 22) — McpToolInvoker interface for calling MCP tools

  **External References**:
  - Backlog.md CLI reference: https://github.com/MrLesk/Backlog.md — task CRUD commands, YAML frontmatter format, status values

  **WHY Each Reference Matters**:
  - gstack's ship flow — We're replacing the informal Review Readiness Dashboard with Backlog.md completion checks. Understanding the original helps us maintain parity
  - SkillMcpManager — The BacklogClient can't call MCP tools directly — it must go through the managed MCP connection layer
  - Backlog.md CLI — Need to know exact tool names and parameter formats for MCP invocations

  **Acceptance Criteria**:
  - [ ] `bun test src/features/sprint-backlog/` — all tests pass
  - [ ] BacklogClient wraps all CRUD operations through MCP tool invocations
  - [ ] ThinkPlanTaskCreator creates backlog tasks from plan objectives
  - [ ] BuildStatusUpdater transitions task status during agent work
  - [ ] ShipReadinessChecker returns completion percentage and pending tasks
  - [ ] Graceful degradation: all operations return fallback values when Backlog.md MCP is unavailable
  - [ ] No direct `.backlog/` file manipulation — verified by grep for `readFile.*backlog` patterns
  - [ ] No hard dependency on Backlog.md — plugin loads and works without it

  **QA Scenarios**:

  ```
  Scenario: Sprint backlog graceful degradation when MCP unavailable
    Tool: Bash (bun REPL)
    Preconditions: Sprint backlog module exists, mock MCP tools that reject
    Steps:
      1. Run `bun -e "import { createSprintBacklog } from './src/features/sprint-backlog/index.ts'; const mockMcp = { invoke: async () => { throw new Error('MCP not connected') } }; const sb = createSprintBacklog(mockMcp as any); const avail = await sb.isAvailable(); const tasks = await sb.taskCreator.createSprintTasks('test', ['obj1']); console.log(avail.available, tasks.length)"`
      2. Assert output is `false 0`
    Expected Result: Returns unavailable status and empty array without throwing
    Failure Indicators: Throws error, crashes, returns unexpected values
    Evidence: .gstack/evidence/task-34-graceful-degradation.txt

  Scenario: Ship readiness checker with mock completed tasks
    Tool: Bash (bun REPL)
    Preconditions: Sprint backlog module exists, mock MCP tools that return tasks
    Steps:
      1. Run `bun -e "import { createShipReadinessChecker } from './src/features/sprint-backlog/ship-readiness-checker.ts'; const mockClient = { listTasks: async () => [{ id: '1', title: 'Task 1', status: 'done', priority: 'p0' }, { id: '2', title: 'Task 2', status: 'todo', priority: 'p1' }] }; const checker = createShipReadinessChecker(mockClient as any); const result = await checker.check(); console.log(result.ready, result.completionPercentage, result.pendingTasks.length)"`
      2. Assert output is `false 50 1`
    Expected Result: Correctly identifies 50% completion with 1 pending task
    Failure Indicators: Wrong completion percentage, missing pending task
    Evidence: .gstack/evidence/task-34-ship-readiness.txt
  ```

  **Commit**: YES
  - Message: `feat(sprint): add sprint-backlog integration — orchestrator ↔ Backlog.md lifecycle via MCP`
  - Files: `src/features/sprint-backlog/types.ts`, `src/features/sprint-backlog/backlog-client.ts`, `src/features/sprint-backlog/think-plan-creator.ts`, `src/features/sprint-backlog/build-status-updater.ts`, `src/features/sprint-backlog/ship-readiness-checker.ts`, `src/features/sprint-backlog/graceful-degradation.ts`, `src/features/sprint-backlog/index.ts`, tests
  - Pre-commit: `bun test src/features/sprint-backlog/`

- [x] 27. Build pipeline + package.json finalization

  **What to do**:
  - Update `package.json`:
    - Add `"main": "dist/index.js"` and `"types": "dist/index.d.ts"`
    - Add `"bin": { "gstack": "dist/cli.js" }`
    - Add `"files": ["dist/", "README.md", "LICENSE"]`
    - Add `"exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }`
    - Add build scripts:
      - `"build": "bun build src/index.ts --outdir dist --target bun --format esm && tsc --emitDeclarationOnly"`
      - `"build:cli": "bun build src/cli/index.ts --outdir dist --target bun --format esm --outfile dist/cli.js"`
      - `"build:all": "bun run build && bun run build:cli"`
      - `"typecheck": "tsc --noEmit"`
      - `"prepublishOnly": "bun run build:all"`
    - Add runtime dependencies:
      - `"@opencode-ai/plugin": "latest"`
      - `"@modelcontextprotocol/sdk": "^1.0.0"`
      - `"zod": "^3.24.0"`
      - `"commander": "^12.0.0"`
      - `"playwright": "^1.50.0"` (peerDependency, optional)
    - Add `"peerDependencies": { "playwright": ">=1.40.0" }` with `"peerDependenciesMeta": { "playwright": { "optional": true } }`
    - Keep existing devDependencies (vitest, eslint, prettier, typescript, bun-types)
  - Update `tsconfig.json`:
    - Add `"declaration": true`
    - Add `"declarationDir": "dist"`
    - Add `"outDir": "dist"`
    - Add `"rootDir": "src"`
    - Remove `"noEmit": true` (if present)
    - Keep `"moduleResolution": "bundler"` and `"module": "ESNext"`
  - Create `src/cli/index.ts`:
    - Add `#!/usr/bin/env bun` shebang
    - Import and call `runCli()` from `src/cli/cli-program.ts` (created in Task 24)
  - Verify build pipeline:
    - Run `bun run build:all` and confirm `dist/index.js`, `dist/index.d.ts`, `dist/cli.js` are generated
    - Run `bun run typecheck` and confirm zero errors
    - Verify the built output is importable: `bun -e "import plugin from './dist/index.js'; console.log(typeof plugin)"`

  **Must NOT do**:
  - Do NOT add `@ast-grep/napi` as a dependency — it's not needed for this plugin
  - Do NOT add platform-specific dependencies here — those go in Task 35
  - Do NOT change the package name from `@nntoan/gstack`
  - Do NOT run `bun publish` — publishing is handled by CI/CD (Task 31)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Primarily configuration changes (package.json, tsconfig.json) with build verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on ALL Wave 1-5 tasks being complete
  - **Parallel Group**: Wave 6 (with Tasks 28, 29, 30, 31 — after Wave 5 complete)
  - **Blocks**: Task 31 (CI/CD needs build scripts), Task 35 (platform binaries needs build)
  - **Blocked By**: Task 23 (plugin integration — all source files must exist before build)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/package.json` — Reference for exports, bin, files, build scripts, peerDependencies patterns. Our package.json should follow the same structure
  - `researchs/oh-my-openagent/tsconfig.json` — Reference for TypeScript config with declaration generation. Follow same compiler options

  **API/Type References**:
  - `src/index.ts` (from Task 8) — Plugin entry point that build targets
  - `src/cli/cli-program.ts` (from Task 24) — CLI program that `src/cli/index.ts` wraps

  **External References**:
  - OpenCode Plugin docs: https://opencode.ai/docs/plugins — Plugin packaging and distribution requirements

  **WHY Each Reference Matters**:
  - oh-my-openagent's package.json — This is the exact distribution pattern we're matching. Same exports format, same bin pattern, same build approach
  - Plugin docs — Must comply with OpenCode's plugin loading requirements (ESM, default export)

  **Acceptance Criteria**:
  - [ ] `bun run build:all` completes without errors
  - [ ] `dist/index.js` exists and exports default plugin function
  - [ ] `dist/index.d.ts` exists with TypeScript declarations
  - [ ] `dist/cli.js` exists with shebang line
  - [ ] `bun run typecheck` passes with zero errors
  - [ ] `bun -e "import plugin from './dist/index.js'; console.log(typeof plugin)"` outputs `function`
  - [ ] package.json has correct main, types, exports, bin, files fields
  - [ ] Playwright is listed as optional peer dependency

  **QA Scenarios**:

  ```
  Scenario: Build pipeline produces valid outputs
    Tool: Bash
    Preconditions: All source files exist from previous tasks
    Steps:
      1. Run `bun run build:all`
      2. Assert exit code is 0
      3. Run `ls dist/index.js dist/index.d.ts dist/cli.js`
      4. Assert all three files exist
      5. Run `bun -e "import plugin from './dist/index.js'; console.log(typeof plugin)"`
      6. Assert output is `function`
    Expected Result: Build produces importable plugin and CLI
    Failure Indicators: Build errors, missing output files, wrong export type
    Evidence: .gstack/evidence/task-27-build-pipeline.txt

  Scenario: TypeScript type checking passes
    Tool: Bash
    Preconditions: All source files exist, tsconfig updated
    Steps:
      1. Run `bun run typecheck`
      2. Assert exit code is 0
      3. Assert no error output
    Expected Result: Zero type errors across entire codebase
    Failure Indicators: Type errors in output
    Evidence: .gstack/evidence/task-27-typecheck.txt
  ```

  **Commit**: YES
  - Message: `build: finalize package.json, tsconfig, and build pipeline for npm distribution`
  - Files: `package.json`, `tsconfig.json`, `src/cli/index.ts`
  - Pre-commit: `bun run build:all && bun run typecheck`

- [x] 28. Browser daemon port — core server (Playwright + Bun.serve)

  **What to do**:
  - Create `src/features/browser-daemon/types.ts`:
    - Export `BrowseConfig`: `{ projectDir: string, stateDir: string, stateFile: string, consoleLog: string, networkLog: string, dialogLog: string }`
    - Export `ServerState`: `{ pid: number, port: number, token: string, startedAt: string, serverPath: string, binaryVersion?: string }`
    - Export `HealthResponse`: `{ status: 'healthy' | 'unhealthy', uptime: number, pageCount: number }`
    - Export `CommandRequest`: `{ command: string, args: string[] }`
    - Export `CommandResponse`: `{ ok: boolean, data?: string, error?: string, hint?: string }`
  - Create `src/features/browser-daemon/config.ts`:
    - Port `researchs/gstack/browse/src/config.ts` with path adaptations:
      - `resolveConfig()` — same resolution logic (BROWSE_STATE_FILE env → git root → cwd), but state paths adapted:
        - `stateFile`: `.gstack/browser/browse.json` (was `.gstack/browse.json`)
        - `consoleLog`: `.gstack/browser/console.log` (was `.gstack/browse-console.log`)
        - `networkLog`: `.gstack/browser/network.log` (was `.gstack/browse-network.log`)
        - `dialogLog`: `.gstack/browser/dialog.log` (was `.gstack/browse-dialog.log`)
      - `getGitRoot()` — direct port, Bun.spawnSync + git rev-parse
      - `ensureBrowserStateDir()` — creates `.gstack/browser/` subdirectory (adapted from `ensureStateDir`)
      - `getRemoteSlug()` — direct port for project identification
    - Do NOT add `.gitignore` management here — that's handled by `ensureWorkspaceDir()` in Task 26
  - Create `src/features/browser-daemon/buffers.ts`:
    - Port `researchs/gstack/browse/src/buffers.ts` — CircularBuffer class for console/network/dialog log buffering
    - Same capacity limits, same clear/dump interface
  - Create `src/features/browser-daemon/browser-manager.ts`:
    - Port `researchs/gstack/browse/src/browser-manager.ts` — BrowserManager class:
      - Playwright browser lifecycle (launch, close, reconnect)
      - Page management (create, switch, close tabs)
      - Ref system storage (`Map<string, RefEntry>` for @e1, @e2 refs)
      - Console/network/dialog event listeners → circular buffers
      - Idle timeout (auto-close browser after inactivity)
  - Create `src/features/browser-daemon/server.ts`:
    - Port `researchs/gstack/browse/src/server.ts` — main HTTP server:
      - `Bun.serve()` with routes: `/command` (POST, bearer auth), `/health` (GET)
      - Bearer token authentication (crypto.randomUUID)
      - State file write on startup (`.gstack/browser/browse.json` with pid, port, token, startedAt)
      - Idle timeout with auto-shutdown
      - Graceful shutdown on SIGTERM/SIGINT
      - Command dispatch to read/write/meta command handlers
    - Adapt ALL state file paths to `.gstack/browser/` subdirectory
  - Write TDD tests: config resolution with env overrides, circular buffer capacity and clear, server state file write/read, health endpoint response format

  **Must NOT do**:
  - Do NOT change Playwright API usage — port as-is (same launch args, same page methods)
  - Do NOT change the HTTP API format — `/command` POST with `{ command, args }` body must be identical
  - Do NOT change bearer token auth mechanism — same `crypto.randomUUID()` pattern
  - Do NOT store state files at `.gstack/browse.json` root — MUST be at `.gstack/browser/browse.json`
  - Do NOT add `.gitignore` management in browser config — use `ensureWorkspaceDir()` from Task 26

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex porting of 4 tightly coupled source files (server, browser-manager, config, buffers) with Playwright integration and HTTP server. Requires understanding the full daemon lifecycle
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 27, 30, 31)
  - **Parallel Group**: Wave 6
  - **Blocks**: Task 29 (browser commands depend on server + browser-manager)
  - **Blocked By**: Task 23 (plugin integration must exist), Task 26 (workspace state — ensureWorkspaceDir for .gstack/browser/)

  **References**:

  **Pattern References**:
  - `researchs/gstack/browse/src/server.ts` — FULL 369-line server: Bun.serve setup, bearer auth, command dispatch, state file, idle timeout, graceful shutdown. Port with path adaptations only
  - `researchs/gstack/browse/src/browser-manager.ts` — BrowserManager class: Playwright lifecycle, page management, ref storage, event listeners. Direct port
  - `researchs/gstack/browse/src/config.ts` — resolveConfig(), getGitRoot(), ensureStateDir(), getRemoteSlug(). Port with path changes (.gstack/browser/ subdirectory)
  - `researchs/gstack/browse/src/buffers.ts` — CircularBuffer for console/network/dialog logs. Direct port

  **API/Type References**:
  - `src/features/workspace-state/ensure-workspace.ts` (from Task 26) — `ensureSubdir()` for creating `.gstack/browser/` directory
  - `src/features/workspace-state/constants.ts` (from Task 26) — `GSTACK_DIR` constant

  **External References**:
  - Playwright API: https://playwright.dev/docs/api/class-browser — Browser.newPage(), Page events, launch options
  - gstack BROWSER.md: `researchs/gstack/BROWSER.md` — Full command reference for browse daemon

  **WHY Each Reference Matters**:
  - gstack's server.ts — This IS the code we're porting. Every line matters: the auth flow, idle timeout, state file format, command dispatch. Only paths change
  - browser-manager.ts — The ref system (@e1, @e2) is gstack's key innovation for browser interaction. Must port exactly
  - config.ts — Path resolution logic is critical for finding git root and computing state paths

  **Acceptance Criteria**:
  - [ ] `bun test src/features/browser-daemon/` — core tests pass (config, buffers, state file)
  - [ ] `resolveConfig()` returns correct `.gstack/browser/` paths for state files
  - [ ] CircularBuffer correctly limits capacity and supports clear/dump
  - [ ] Server can start, write state file, and respond to `/health` endpoint
  - [ ] Bearer token auth rejects unauthorized requests with 401
  - [ ] State file written to `.gstack/browser/browse.json` (not `.gstack/browse.json`)
  - [ ] Logs written to `.gstack/browser/console.log`, `.gstack/browser/network.log`, `.gstack/browser/dialog.log`

  **QA Scenarios**:

  ```
  Scenario: Browser config resolves to .gstack/browser/ subdirectory
    Tool: Bash (bun REPL)
    Preconditions: Browser daemon module exists
    Steps:
      1. Run `bun -e "import { resolveConfig } from './src/features/browser-daemon/config.ts'; const config = resolveConfig({ BROWSE_STATE_FILE: '/tmp/test/.gstack/browser/browse.json' }); console.log(config.stateFile); console.log(config.consoleLog); console.log(config.stateDir)"`
      2. Assert line 1 contains `.gstack/browser/browse.json`
      3. Assert line 2 contains `.gstack/browser/console.log`
      4. Assert line 3 contains `.gstack/browser`
    Expected Result: All paths use .gstack/browser/ subdirectory
    Failure Indicators: Paths use old .gstack/ root format
    Evidence: .gstack/evidence/task-28-config-paths.txt

  Scenario: CircularBuffer enforces capacity limit
    Tool: Bash (bun REPL)
    Preconditions: Buffers module exists
    Steps:
      1. Run `bun -e "import { CircularBuffer } from './src/features/browser-daemon/buffers.ts'; const buf = new CircularBuffer(3); buf.push('a'); buf.push('b'); buf.push('c'); buf.push('d'); console.log(buf.dump().join(','))"`
      2. Assert output is `b,c,d` (oldest evicted)
    Expected Result: Buffer evicts oldest entry when capacity exceeded
    Failure Indicators: Buffer grows beyond capacity or evicts wrong entry
    Evidence: .gstack/evidence/task-28-circular-buffer.txt
  ```

  **Commit**: YES
  - Message: `feat(browser): port core browser daemon — server, browser-manager, config, buffers`
  - Files: `src/features/browser-daemon/types.ts`, `src/features/browser-daemon/config.ts`, `src/features/browser-daemon/buffers.ts`, `src/features/browser-daemon/browser-manager.ts`, `src/features/browser-daemon/server.ts`, tests
  - Pre-commit: `bun test src/features/browser-daemon/`

- [x] 29. Browser daemon port — commands + snapshot + @ref system

  **What to do**:
  - Create `src/features/browser-daemon/commands.ts`:
    - Port `researchs/gstack/browse/src/commands.ts` — command registry:
      - Export `READ_COMMANDS`, `WRITE_COMMANDS`, `META_COMMANDS`, `ALL_COMMANDS` sets
      - Export `COMMAND_DESCRIPTIONS` record with category, description, usage per command
      - Include load-time validation (description ↔ command set consistency check)
  - Create `src/features/browser-daemon/read-commands.ts`:
    - Port `researchs/gstack/browse/src/read-commands.ts` — read command handlers:
      - `text`, `html`, `links`, `forms`, `accessibility` — page content extraction
      - `js`, `eval`, `css`, `attrs` — JavaScript execution and element inspection
      - `console`, `network`, `dialog` — log buffer access (with `--clear`/`--errors` flags)
      - `cookies`, `storage`, `perf` — browser state inspection
      - `is` — element state checks (visible/hidden/enabled/disabled/checked/editable/focused)
  - Create `src/features/browser-daemon/write-commands.ts`:
    - Port `researchs/gstack/browse/src/write-commands.ts` — write command handlers:
      - Navigation: `goto`, `back`, `forward`, `reload`
      - Interaction: `click`, `fill`, `select`, `hover`, `type`, `press`, `scroll`, `wait`
      - Config: `viewport`, `cookie`, `cookie-import`, `header`, `useragent`
      - File: `upload`
      - Dialog: `dialog-accept`, `dialog-dismiss`
  - Create `src/features/browser-daemon/meta-commands.ts`:
    - Port `researchs/gstack/browse/src/meta-commands.ts` — meta command handlers:
      - Tabs: `tabs`, `tab`, `newtab`, `closetab`
      - Server: `status`, `stop`, `restart`
      - Visual: `screenshot`, `pdf`, `responsive`
      - Compare: `diff` (text diff between URLs)
      - Snapshot: `snapshot` (delegates to snapshot module)
      - Session: `handoff`, `resume`
      - Pipeline: `chain` (multi-command JSON from stdin)
  - Create `src/features/browser-daemon/snapshot.ts`:
    - Port `researchs/gstack/browse/src/snapshot.ts` — the @ref system (gstack's key browser innovation):
      - `snapshot()` — page.locator(scope).ariaSnapshot() → parse YAML tree → assign @e1, @e2 refs → build Locator map → return compact text
      - `SNAPSHOT_FLAGS` metadata array (flag parsing and doc generation source of truth)
      - Support flags: `-i` interactive only, `-c` compact, `-d N` depth, `-s sel` scope, `-D` diff, `-a` annotated screenshot, `-o path` output, `-C` cursor-interactive
      - Diff mode: compare against previous snapshot using `diff` package
  - Create `src/features/browser-daemon/cookie-import-browser.ts`:
    - Port `researchs/gstack/browse/src/cookie-import-browser.ts` — import cookies from real browsers (Chrome, Arc, Brave, Edge, Comet)
  - Create `src/features/browser-daemon/cookie-picker-routes.ts`:
    - Port `researchs/gstack/browse/src/cookie-picker-routes.ts` — HTTP routes for cookie picker UI
  - Create `src/features/browser-daemon/cookie-picker-ui.ts`:
    - Port `researchs/gstack/browse/src/cookie-picker-ui.ts` — HTML/JS for cookie domain selection UI
  - Create `src/features/browser-daemon/url-validation.ts`:
    - Port `researchs/gstack/browse/src/url-validation.ts` — URL sanitization and validation
  - Create `src/features/browser-daemon/platform.ts`:
    - Port `researchs/gstack/browse/src/platform.ts` — platform detection, TEMP_DIR, isPathWithin
  - Create `src/features/browser-daemon/find-browse.ts`:
    - Port `researchs/gstack/browse/src/find-browse.ts` — locate browse binary/script
    - Adapt paths: look for browse within `@nntoan/gstack` package installation
  - Create `src/features/browser-daemon/cli.ts`:
    - Port `researchs/gstack/browse/src/cli.ts` — CLI thin wrapper:
      - Read `.gstack/browser/browse.json` for port + token
      - Auto-start server if missing/stale PID
      - Health check + version mismatch detection
      - Send command via HTTP POST
    - Adapt ALL state file paths to `.gstack/browser/`
  - Write TDD tests: command registry consistency, URL validation, platform detection, snapshot flag parsing, @ref assignment from accessibility tree

  **Must NOT do**:
  - Do NOT modify the snapshot @ref algorithm — this is gstack's key innovation, port exactly as-is
  - Do NOT change command names or argument formats — backward compatibility with gstack SKILL.md templates
  - Do NOT simplify the cookie import system — it supports multiple browsers and is used by `/setup-browser-cookies`
  - Do NOT change the CLI flow — same ensureServer → sendCommand pattern

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Large porting task (11 files) but mostly mechanical translation. The snapshot @ref system requires careful handling but is well-documented
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Task 28 (server + browser-manager must exist first)
  - **Parallel Group**: Wave 6 (sequential after Task 28)
  - **Blocks**: Task 15 (deploy skills reference browser), Task 16 (browser-dependent skills)
  - **Blocked By**: Task 28 (browser daemon core — server.ts, browser-manager.ts, config.ts, buffers.ts)

  **References**:

  **Pattern References**:
  - `researchs/gstack/browse/src/commands.ts` — Command registry with READ/WRITE/META sets and COMMAND_DESCRIPTIONS. Port exactly — this is the source of truth for all browse commands
  - `researchs/gstack/browse/src/read-commands.ts` — Read command implementations. Direct port
  - `researchs/gstack/browse/src/write-commands.ts` — Write command implementations. Direct port
  - `researchs/gstack/browse/src/meta-commands.ts` — Meta command implementations. Direct port
  - `researchs/gstack/browse/src/snapshot.ts` — @ref system: ariaSnapshot → parse → assign refs → Locator map. THIS IS THE CORE INNOVATION — port with zero changes to the algorithm
  - `researchs/gstack/browse/src/cli.ts` — CLI wrapper: readState → ensureServer → sendCommand. Adapt paths to `.gstack/browser/`
  - `researchs/gstack/browse/src/cookie-import-browser.ts`, `cookie-picker-routes.ts`, `cookie-picker-ui.ts` — Cookie import system. Direct port
  - `researchs/gstack/browse/src/url-validation.ts` — URL sanitization. Direct port
  - `researchs/gstack/browse/src/platform.ts` — Platform detection, TEMP_DIR. Direct port
  - `researchs/gstack/browse/src/find-browse.ts` — Binary location. Adapt to package installation paths

  **API/Type References**:
  - `src/features/browser-daemon/server.ts` (from Task 28) — Server dispatches commands to these handlers
  - `src/features/browser-daemon/browser-manager.ts` (from Task 28) — BrowserManager interface used by all command handlers
  - `src/features/browser-daemon/buffers.ts` (from Task 28) — CircularBuffer used by console/network/dialog commands

  **External References**:
  - `researchs/gstack/BROWSER.md` — Full command reference with examples and usage patterns
  - Playwright API: https://playwright.dev/docs/api/class-page — Page methods used by commands

  **WHY Each Reference Matters**:
  - commands.ts — Source of truth for all 50+ browse commands. The consistency validation ensures no command is undocumented
  - snapshot.ts — The @ref system is what makes gstack's browser unique (assign accessibility tree elements to @e1, @e2 refs for AI interaction). Must port exactly
  - cli.ts — The client-side wrapper handles server lifecycle (start, health check, reconnect). Path adaptations are the only change

  **Acceptance Criteria**:
  - [ ] `bun test src/features/browser-daemon/` — all tests pass (including command, snapshot, and CLI tests)
  - [ ] Command registry has consistent sets (all described, all categorized)
  - [ ] `ALL_COMMANDS` union equals `READ_COMMANDS ∪ WRITE_COMMANDS ∪ META_COMMANDS`
  - [ ] Snapshot @ref system assigns sequential @e1, @e2, @e3 refs
  - [ ] SNAPSHOT_FLAGS metadata matches all supported flags
  - [ ] URL validation rejects malformed URLs
  - [ ] CLI reads state from `.gstack/browser/browse.json` (not `.gstack/browse.json`)
  - [ ] Cookie import supports Chrome, Arc, Brave, Edge browsers
  - [ ] Platform detection works on Linux, macOS, Windows

  **QA Scenarios**:

  ```
  Scenario: Command registry is internally consistent
    Tool: Bash (bun REPL)
    Preconditions: Browser daemon commands module exists
    Steps:
      1. Run `bun -e "import { READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS, ALL_COMMANDS, COMMAND_DESCRIPTIONS } from './src/features/browser-daemon/commands.ts'; console.log(ALL_COMMANDS.size); console.log(Object.keys(COMMAND_DESCRIPTIONS).length); console.log(ALL_COMMANDS.size === Object.keys(COMMAND_DESCRIPTIONS).length)"`
      2. Assert line 3 is `true` (all commands have descriptions)
    Expected Result: Every command in sets has a description entry and vice versa
    Failure Indicators: Size mismatch, missing description, load-time validation error
    Evidence: .gstack/evidence/task-29-command-registry.txt

  Scenario: URL validation rejects invalid URLs
    Tool: Bash (bun REPL)
    Preconditions: URL validation module exists
    Steps:
      1. Run `bun -e "import { isValidUrl } from './src/features/browser-daemon/url-validation.ts'; console.log(isValidUrl('https://example.com')); console.log(isValidUrl('not-a-url')); console.log(isValidUrl('javascript:alert(1)'))"`
      2. Assert output is `true` then `false` then `false`
    Expected Result: Accepts valid HTTPS URLs, rejects invalid and javascript: URLs
    Failure Indicators: Accepts invalid URLs or rejects valid ones
    Evidence: .gstack/evidence/task-29-url-validation.txt
  ```

  **Commit**: YES
  - Message: `feat(browser): port browser commands, snapshot @ref system, CLI wrapper, and cookie import`
  - Files: `src/features/browser-daemon/commands.ts`, `src/features/browser-daemon/read-commands.ts`, `src/features/browser-daemon/write-commands.ts`, `src/features/browser-daemon/meta-commands.ts`, `src/features/browser-daemon/snapshot.ts`, `src/features/browser-daemon/cookie-import-browser.ts`, `src/features/browser-daemon/cookie-picker-routes.ts`, `src/features/browser-daemon/cookie-picker-ui.ts`, `src/features/browser-daemon/url-validation.ts`, `src/features/browser-daemon/platform.ts`, `src/features/browser-daemon/find-browse.ts`, `src/features/browser-daemon/cli.ts`, tests
  - Pre-commit: `bun test src/features/browser-daemon/`

- [x] 30. Upstream sync script

  **What to do**:
  - Create `scripts/upstream-sync.ts`:
    - Accept CLI args: `--repo <url>` (default: `https://github.com/garrytan/gstack.git`), `--branch <name>` (default: `main`), `--output <path>` (default: `.gstack/sync-report.md`)
    - Clone/pull gstack repo to temp directory (`/tmp/gstack-upstream-sync/`)
    - Compare SKILL.md.tmpl files:
      - For each `.agents/skills/gstack-*/SKILL.md.tmpl` in upstream:
        - Compute content hash (SHA-256)
        - Compare against our stored hashes in `.gstack/orchestrator/upstream-hashes.json`
        - If hash changed: include in diff report
    - Compare browse/ source files:
      - For each `browse/src/*.ts` in upstream:
        - Compute content hash
        - Compare against stored hashes
        - If changed: flag for manual review
    - Generate Markdown change report:
      - Section per changed skill: skill name, lines changed (+/-), key changes summary
      - Section for browse/ changes
      - Section for new skills (present upstream but not in our hashes)
      - Section for removed skills (in our hashes but not upstream)
    - Update hash file: write new hashes to `.gstack/orchestrator/upstream-hashes.json`
    - Exit codes: 0 = no changes, 1 = changes detected, 2 = error
  - Create `scripts/upstream-sync-types.ts`:
    - Export `UpstreamHash`: `{ path: string, hash: string, lastSync: string }`
    - Export `SyncReport`: `{ changedSkills: SkillChange[], changedBrowse: FileChange[], newSkills: string[], removedSkills: string[] }`
    - Export `SkillChange`: `{ name: string, linesAdded: number, linesRemoved: number, summary: string }`
    - Export `FileChange`: `{ path: string, linesAdded: number, linesRemoved: number }`
  - Add package.json script: `"sync:upstream": "bun scripts/upstream-sync.ts"`
  - Write TDD tests: hash computation, diff detection, report generation (with fixture SKILL.md files)

  **Must NOT do**:
  - Do NOT auto-apply upstream changes — report only, human/AI review required
  - Do NOT modify any source files during sync — read-only operation that produces a report
  - Do NOT clone the full git history — use `--depth 1` for shallow clone
  - Do NOT store the cloned repo permanently — use temp directory, clean up after

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: File comparison, hash computation, and report generation across multiple skill directories. Requires careful diff logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 27, 28, 31)
  - **Parallel Group**: Wave 6
  - **Blocks**: None (standalone utility)
  - **Blocked By**: Task 23 (plugin integration must exist so sync script knows which skills to compare)

  **References**:

  **Pattern References**:
  - `researchs/gstack/scripts/gen-skill-docs.ts` — Template generator that processes SKILL.md.tmpl files. Understanding the template structure helps identify what's changing in upstream
  - `researchs/gstack/.agents/skills/` — Directory structure of original skill files. The sync script must mirror this structure for comparison

  **API/Type References**:
  - `src/features/workspace-state/constants.ts` (from Task 26) — `GSTACK_DIR`, `ORCHESTRATOR_DIR` for hash file path

  **External References**:
  - gstack GitHub: https://github.com/garrytan/gstack — Upstream repo URL for cloning

  **WHY Each Reference Matters**:
  - gen-skill-docs.ts — Shows us the `.tmpl` template structure. Changes to templates affect all generated SKILL.md files, so tracking `.tmpl` changes (not generated output) is the right approach
  - Skill directory structure — Need to know the exact path pattern (`.agents/skills/gstack-*/SKILL.md.tmpl`) for file enumeration

  **Acceptance Criteria**:
  - [ ] `bun test scripts/` — sync script tests pass
  - [ ] Script clones upstream repo with `--depth 1` (shallow)
  - [ ] Detects changed SKILL.md.tmpl files by hash comparison
  - [ ] Generates readable Markdown change report
  - [ ] Stores hashes in `.gstack/orchestrator/upstream-hashes.json`
  - [ ] Exit code 0 when no changes, 1 when changes detected
  - [ ] Cleans up temp directory after completion
  - [ ] `bun run sync:upstream` command works from package.json

  **QA Scenarios**:

  ```
  Scenario: Upstream sync detects changes against stored hashes
    Tool: Bash
    Preconditions: Sync script exists, git is available
    Steps:
      1. Create a temp directory with mock upstream and stored hashes
      2. Run `bun scripts/upstream-sync.ts --repo /tmp/mock-upstream --output /tmp/sync-report.md`
      3. Assert exit code is 1 (changes detected)
      4. Assert `/tmp/sync-report.md` contains "Changed Skills" section
      5. Assert `.gstack/orchestrator/upstream-hashes.json` was updated
    Expected Result: Report generated with changed files, hashes updated
    Failure Indicators: Exit code 0 when changes exist, missing report, hash file not updated
    Evidence: .gstack/evidence/task-30-sync-detect.txt

  Scenario: Upstream sync reports no changes when hashes match
    Tool: Bash
    Preconditions: Sync script exists, hashes pre-populated matching upstream
    Steps:
      1. Run `bun scripts/upstream-sync.ts --repo /tmp/mock-upstream-unchanged`
      2. Assert exit code is 0
    Expected Result: Clean exit with no report generated
    Failure Indicators: Exit code 1 when nothing changed
    Evidence: .gstack/evidence/task-30-sync-no-change.txt
  ```

  **Commit**: YES
  - Message: `feat(sync): add upstream sync script for tracking gstack SKILL.md changes`
  - Files: `scripts/upstream-sync.ts`, `scripts/upstream-sync-types.ts`, tests
  - Pre-commit: `bun test scripts/`

- [x] 31. CI/CD workflows (ci.yml, publish.yml)

  **What to do**:
  - Create `.github/workflows/ci.yml`:
    - Trigger: push to `main`/`dev`, pull_request to `main`/`dev`
    - Jobs:
      - `test`: Run on `ubuntu-latest`, setup Bun (latest), `bun install`, `bun test`
      - `typecheck`: Run on `ubuntu-latest`, setup Bun, `bun install`, `bun run typecheck`
      - `build`: Run on `ubuntu-latest`, setup Bun, `bun install`, `bun run build:all`, verify `dist/` outputs exist
      - `lint`: Run on `ubuntu-latest`, setup Bun, `bun install`, `bun run lint`
    - All jobs run in parallel (no inter-job dependencies)
    - Use `actions/checkout@v4`, `oven-sh/setup-bun@v2`
  - Create `.github/workflows/publish.yml`:
    - Trigger: `workflow_dispatch` with inputs:
      - `version_bump`: choice (`patch`, `minor`, `major`, `prerelease`)
      - `dry_run`: boolean (default false)
    - Steps:
      1. Checkout with `fetch-depth: 0` (for git tagging)
      2. Setup Bun
      3. `bun install`
      4. `bun test` — fail fast if tests fail
      5. `bun run typecheck` — fail fast if type errors
      6. `bun run build:all`
      7. Version bump: `npm version ${{ inputs.version_bump }} --no-git-tag-version`
      8. `npm publish --access public` (skip if dry_run)
      9. Git tag + push: `git tag v{version} && git push origin v{version}` (skip if dry_run)
      10. Create GitHub release via `gh release create v{version} --generate-notes` (skip if dry_run)
    - Requires `NPM_TOKEN` secret for npm publish
    - Requires `GITHUB_TOKEN` (default) for release creation
    - Optionally triggers `publish-platform.yml` (from Task 35) after successful publish
  - Add branch protection recommendation in workflow comments (require CI pass before merge)

  **Must NOT do**:
  - Do NOT auto-publish on push — publishing MUST be manual dispatch only
  - Do NOT include Supabase or telemetry secrets — local analytics only for now
  - Do NOT run Playwright browser tests in CI — those require browser installation (add `playwright install` step ONLY if browser daemon tests need it, otherwise skip)
  - Do NOT use `npm` for installing dependencies — use `bun install` exclusively
  - Do NOT hardcode version numbers — use `npm version` command for semver bumps

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: GitHub Actions YAML files following well-established patterns
  - **Skills**: [`git-master`]
    - `git-master`: CI/CD workflows involve git operations (tagging, pushing)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 28, 29, 30)
  - **Parallel Group**: Wave 6
  - **Blocks**: Task 35 (platform binaries workflow references publish.yml)
  - **Blocked By**: Task 27 (build pipeline — CI needs build scripts to exist)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/.github/workflows/` — oh-my-openagent's CI/CD pipeline structure. Our workflows follow the same pattern (ci on push/PR, publish on manual dispatch, platform binaries as called workflow)

  **API/Type References**:
  - `package.json` (from Task 27) — Build scripts referenced in CI steps

  **External References**:
  - GitHub Actions docs: https://docs.github.com/en/actions — Workflow syntax, secrets, triggers
  - oven-sh/setup-bun action: https://github.com/oven-sh/setup-bun — Bun setup action for CI

  **WHY Each Reference Matters**:
  - oh-my-openagent's workflows — Same publish pattern: manual dispatch with version bump, npm publish, GitHub release. We follow this proven approach
  - package.json build scripts — CI steps must reference the exact script names we defined

  **Acceptance Criteria**:
  - [ ] `.github/workflows/ci.yml` exists with test, typecheck, build, lint jobs
  - [ ] `.github/workflows/publish.yml` exists with manual dispatch trigger
  - [ ] CI workflow triggers on push to main/dev and PRs
  - [ ] Publish workflow has version_bump and dry_run inputs
  - [ ] All jobs use `oven-sh/setup-bun@v2` for Bun setup
  - [ ] Publish requires NPM_TOKEN secret
  - [ ] YAML is valid (no syntax errors)

  **QA Scenarios**:

  ```
  Scenario: CI workflow YAML is valid
    Tool: Bash
    Preconditions: CI workflow file exists
    Steps:
      1. Run `bun -e "const yaml = require('js-yaml'); const fs = require('fs'); const content = fs.readFileSync('.github/workflows/ci.yml', 'utf-8'); yaml.load(content); console.log('valid')"`
      2. Assert output is `valid`
      3. Run `grep -c 'runs-on:' .github/workflows/ci.yml`
      4. Assert output is `4` (4 parallel jobs)
    Expected Result: Valid YAML with 4 CI jobs
    Failure Indicators: YAML parse error, wrong job count
    Evidence: .gstack/evidence/task-31-ci-yaml.txt

  Scenario: Publish workflow has manual dispatch with inputs
    Tool: Bash
    Preconditions: Publish workflow file exists
    Steps:
      1. Run `grep 'workflow_dispatch' .github/workflows/publish.yml`
      2. Assert output contains `workflow_dispatch`
      3. Run `grep 'version_bump' .github/workflows/publish.yml`
      4. Assert output contains `version_bump`
      5. Run `grep 'dry_run' .github/workflows/publish.yml`
      6. Assert output contains `dry_run`
    Expected Result: Publish workflow has manual dispatch with version_bump and dry_run inputs
    Failure Indicators: Missing triggers or inputs
    Evidence: .gstack/evidence/task-31-publish-yaml.txt
  ```

  **Commit**: YES
  - Message: `ci: add CI/CD workflows — ci.yml for testing, publish.yml for npm releases`
  - Files: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`
  - Pre-commit: None (YAML files, no tests)

- [x] 35. Platform binary packaging (publish-platform.yml + optionalDeps)

  **What to do**:
  - Create `packages/` monorepo directory with platform-specific packages:
    - Create packages for 12 targets (matching oh-my-openagent pattern):
      - `packages/gstack-darwin-arm64/package.json`
      - `packages/gstack-darwin-x64/package.json`
      - `packages/gstack-linux-arm64/package.json`
      - `packages/gstack-linux-x64/package.json`
      - `packages/gstack-linux-arm64-musl/package.json`
      - `packages/gstack-linux-x64-musl/package.json`
      - `packages/gstack-win32-arm64/package.json`
      - `packages/gstack-win32-x64/package.json`
      - `packages/gstack-win32-ia32/package.json`
      - `packages/gstack-freebsd-x64/package.json`
      - `packages/gstack-freebsd-arm64/package.json`
      - `packages/gstack-openbsd-x64/package.json`
    - Each package.json contains:
      - `"name": "@nntoan/gstack-{platform}-{arch}"` (scoped)
      - `"version"`: matches root package version
      - `"os"`: platform filter array
      - `"cpu"`: architecture filter array
      - `"bin"`: points to compiled binary
      - `"files"`: only the binary
  - Update root `package.json`:
    - Add `"optionalDependencies"` with all 12 platform packages
    - Add `"scripts"` entry: `"build:platform": "bun run scripts/build-platform.ts"`
  - Create `scripts/build-platform.ts`:
    - Accept `--target` arg for Bun compile target
    - Run `bun build --compile --target={target} src/cli/index.ts --outfile packages/{name}/bin/gstack`
    - Compute and store binary hash for integrity verification
  - Create `.github/workflows/publish-platform.yml`:
    - Trigger: `workflow_call` from publish.yml OR `workflow_dispatch` for manual runs
    - Matrix strategy: all 12 platform targets
    - Steps per target:
      1. Checkout
      2. Setup Bun
      3. `bun install`
      4. `bun run build:platform --target={matrix.target}`
      5. `npm publish packages/{name} --access public` (skip if dry_run)
    - Runs on appropriate runners: `ubuntu-latest` for Linux, `macos-latest` for macOS, `windows-latest` for Windows
    - Cross-compilation where needed (Bun compile supports cross-compilation)

  **Must NOT do**:
  - Do NOT publish platform packages independently — they MUST be published together with root package via publish.yml
  - Do NOT include platform binaries in the root npm package — they're separate optional dependencies
  - Do NOT skip the binary hash verification step — integrity matters
  - Do NOT hardcode version numbers in platform packages — they must sync with root version

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Monorepo setup with 12 platform packages, cross-compilation scripts, and CI/CD workflow. Requires understanding Bun compile targets
  - **Skills**: [`git-master`]
    - `git-master`: Monorepo management involves git operations

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on Tasks 27 and 31
  - **Parallel Group**: Wave 6 (after Tasks 27, 31)
  - **Blocks**: None (final distribution task)
  - **Blocked By**: Task 27 (build pipeline), Task 31 (publish.yml must exist to add workflow_call trigger)

  **References**:

  **Pattern References**:
  - `researchs/oh-my-openagent/packages/` — oh-my-openagent's monorepo with 12 platform-specific packages. EXACT pattern to follow: package.json structure, os/cpu filters, bin entries
  - `researchs/oh-my-openagent/.github/workflows/publish-platform.yml` — Platform binary publish workflow with matrix strategy. Follow same runner selection and cross-compilation approach

  **API/Type References**:
  - `package.json` (from Task 27) — Root package where optionalDependencies are added

  **External References**:
  - Bun compile docs: https://bun.sh/docs/bundler/executables — `bun build --compile` targets and cross-compilation
  - npm optionalDependencies: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#optionaldependencies — Platform-specific optional package pattern

  **WHY Each Reference Matters**:
  - oh-my-openagent's packages/ — This IS the pattern we're copying. Same 12 targets, same package.json structure, same optionalDependencies approach
  - publish-platform.yml — Matrix strategy with per-platform runners is the proven approach for cross-platform binary distribution

  **Acceptance Criteria**:
  - [ ] `packages/` directory contains 12 platform package directories
  - [ ] Each platform package.json has correct `name`, `os`, `cpu`, `bin`, `files` fields
  - [ ] Root package.json has `optionalDependencies` listing all 12 platform packages
  - [ ] `scripts/build-platform.ts` compiles CLI for specified target
  - [ ] `.github/workflows/publish-platform.yml` exists with matrix strategy
  - [ ] Publish workflow can be triggered by `workflow_call` from publish.yml
  - [ ] Platform package versions match root package version

  **QA Scenarios**:

  ```
  Scenario: Platform packages have correct structure
    Tool: Bash
    Preconditions: Platform packages exist
    Steps:
      1. Run `ls packages/ | wc -l`
      2. Assert output is `12`
      3. Run `bun -e "const pkg = require('./packages/gstack-linux-x64/package.json'); console.log(pkg.os, pkg.cpu, !!pkg.bin)"`
      4. Assert output contains `linux`, `x64`, `true`
    Expected Result: 12 platform packages with correct os/cpu/bin fields
    Failure Indicators: Wrong count, missing fields, wrong platform values
    Evidence: .gstack/evidence/task-35-platform-packages.txt

  Scenario: Build platform script compiles CLI binary
    Tool: Bash
    Preconditions: Build pipeline works (Task 27), bun compile available
    Steps:
      1. Run `bun scripts/build-platform.ts --target=bun-linux-x64`
      2. Assert exit code is 0
      3. Assert binary exists at `packages/gstack-linux-x64/bin/gstack`
    Expected Result: Binary compiled for target platform
    Failure Indicators: Compilation error, missing binary
    Evidence: .gstack/evidence/task-35-build-platform.txt
  ```

  **Commit**: YES
  - Message: `build: add platform binary packaging — 12 targets with publish-platform workflow`
  - Files: `packages/*/package.json`, `scripts/build-platform.ts`, `.github/workflows/publish-platform.yml`
  - Pre-commit: None (package configs and workflows)

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .gstack/evidence/. Compare deliverables against plan. Verify all 5 MCP configs exist and are lazily initialized. Verify Backlog.md integration has graceful degradation.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | MCPs [5/5] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
      Run `tsc --noEmit` + `bun run lint` + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check 200 LOC limit compliance. Check no catch-all files (utils.ts, helpers.ts, service.ts). Check kebab-case file naming. Verify no synchronous MCP connections in plugin load path.
      Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Plugin QA** — `unspecified-high`
      Start from clean state. Build the plugin (`bun run build`). Create a test OpenCode config that includes `@nntoan/gstack` in plugins array. Verify plugin loads without errors within 10s. Verify skills are discoverable. Verify config mode switch works (multi-agent vs skills-only). Verify MCP configs are present and disableable. Verify CLI doctor command runs. Verify `.gstack/` directory structure created on first session. Save evidence to `.gstack/evidence/final-qa/`.
      Output: `Build [PASS/FAIL] | Plugin Load [PASS/FAIL] | Skills [N/25] | Agents [N/13] | MCPs [N/5] | Config [PASS/FAIL] | CLI [PASS/FAIL] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes. Verify `.gstack/` uses subdirectory structure (no loose files at root except flags). Verify `.backlog/` is only accessed through MCP tools.
      Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------- |
| 1    | `chore(deps): add runtime dependencies and fix tsconfig` — package.json, tsconfig.json                               |
| 1    | `feat(shared): add logger, deep-merge, and path helpers` — src/shared/\*.ts                                          |
| 1    | `feat(types): add core type definitions` — src/types.ts, src/types/\*.ts                                             |
| 1    | `feat(config): add Zod v4 schema definitions and JSON Schema generation` — src/config/schema/\*.ts, schemas/         |
| 1    | `feat(skills): add skill template adapter` — src/features/skill-adapter/\*.ts                                        |
| 2    | `feat(config): add JSONC config loader with multi-level merge` — src/plugin-config.ts                                |
| 2    | `feat(plugin): add plugin entry point and interface` — src/index.ts, src/plugin-interface.ts                         |
| 2    | `feat(plugin): add config handler for agent/skill/tool/MCP registration` — src/plugin/config-handler.ts              |
| 2    | `feat(mcp): add MCP factory with 5 built-in server configs` — src/mcp/\*.ts                                          |
| 2    | `feat(mcp): add MCP config handler with 3-tier merge` — src/plugin-handlers/mcp-config-handler.ts                    |
| 3    | `feat(skills): port planning skills` — src/features/builtin-skills/skills/\*.ts                                      |
| 3    | `feat(skills): port review skills` — src/features/builtin-skills/skills/\*.ts                                        |
| 3    | `feat(skills): port safety skills` — src/features/builtin-skills/skills/\*.ts                                        |
| 3    | `feat(skills): port utility skills` — src/features/builtin-skills/skills/\*.ts                                       |
| 3    | `feat(skills): add skill registry and createBuiltinSkills factory` — src/features/builtin-skills/\*.ts               |
| 4    | `feat(skills): port deploy skills` — src/features/builtin-skills/skills/\*.ts                                        |
| 4    | `feat(skills): port browser-dependent skills` — src/features/builtin-skills/skills/\*.ts                             |
| 4    | `feat(agents): add core sprint-phase agent definitions` — src/agents/\*.ts                                           |
| 4    | `feat(agents): add support agent definitions` — src/agents/\*.ts                                                     |
| 4    | `feat(agents): add agent registry and createGstackAgents factory` — src/agents/index.ts                              |
| 5    | `feat(orchestrator): add intent classifier and agent delegation engine` — src/features/orchestrator/\*.ts            |
| 5    | `feat(mcp): add SkillMcpManager for per-session MCP connections` — src/features/skill-mcp-manager/\*.ts              |
| 5    | `feat(plugin): wire skills, agents, config, orchestrator, and MCPs into plugin` — src/index.ts, src/create-\*.ts     |
| 5    | `feat(cli): add install and doctor commands` — src/cli/\*.ts                                                         |
| 5    | `feat(telemetry): add local JSONL analytics, eureka, and sprint logger` — src/features/analytics/\*.ts               |
| 5    | `feat(workspace): add boulder state, session manager, notepads, and review dashboard` — src/features/workspace/\*.ts |
| 5    | `feat(sprint): add Backlog.md sprint integration for orchestrator lifecycle` — src/features/sprint-backlog/\*.ts     |
| 6    | `chore(build): finalize build pipeline and package.json` — package.json, scripts                                     |
| 6    | `feat(browse): port browser daemon core (Playwright + Bun.serve)` — src/features/browser-daemon/\*.ts                |
| 6    | `feat(browse): port commands, snapshot, and ref system` — src/features/browser-daemon/\*.ts                          |
| 6    | `feat(sync): add upstream sync script` — scripts/upstream-sync.ts                                                    |
| 6    | `ci: add CI/CD workflows` — .github/workflows/\*.yml                                                                 |
| 6    | `ci: add platform binary packaging` — packages/\*, .github/workflows/publish-platform.yml                            |

---

## Success Criteria

### Verification Commands

```bash
bun run build                    # Expected: dist/index.js + dist/index.d.ts exist
bun test                         # Expected: all tests pass, >90% coverage
bun run lint                     # Expected: 0 errors
bun -e "import p from './dist/index.js'; console.log(typeof p)"  # Expected: "function"
tsc --noEmit                     # Expected: 0 errors
bunx @nntoan/gstack doctor      # Expected: all checks pass
```

### Final Checklist

- [ ] All 25 gstack skills ported and adapted
- [ ] All 13 agents registered with instructions
- [ ] All 5 MCP servers configured and individually disableable
- [ ] MCP connections are lazy/on-demand (no blocking at plugin load)
- [ ] Backlog.md integration creates/updates tasks via MCP (graceful degradation if unavailable)
- [ ] Config mode switch works (multi-agent vs skills-only)
- [ ] `schemas/config.schema.json` exists, is valid JSON Schema, and matches Zod schema
- [ ] Config files generated by CLI `install` command include `$schema` reference to GitHub raw URL
- [ ] Plugin loads in OpenCode within 10s timeout
- [ ] CLI install + doctor commands functional
- [ ] Browser daemon operational (browse, qa, qa-only skills work)
- [ ] Local analytics recording skill usage
- [ ] `.gstack/` workspace fully functional — organized by concern (10 subdirectories)
- [ ] `.backlog/` accessed only through Backlog.md MCP tools (no direct file manipulation)
- [ ] Upstream sync script detects SKILL.md changes
- [ ] Build produces valid ESM bundle with declarations
- [ ] All tests pass
- [ ] No `as any`, `@ts-ignore`, or catch-all files
- [ ] No verbatim SKILL.md copies — all adapted for OpenCode
- [ ] No references to `~/.claude/skills/gstack/bin/`
- [ ] No synchronous MCP connections in plugin load path
- [ ] No loose files in `.gstack/` root (except flag files)
