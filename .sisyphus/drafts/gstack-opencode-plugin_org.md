# gstack-opencode — OpenCode Plugin Port (v2)

## TL;DR

> **Quick Summary**: Port Garry Tan's gstack (25 SKILL.md-based AI engineering workflow) into a standalone OpenCode plugin (`gstack-opencode`) with a multi-agent orchestrator, 5 built-in MCP servers (websearch, context7, contexthub, grep_app, backlog.md), Backlog.md-powered sprint management, and a comprehensive `.gstack/` workspace directory organized by concern.
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

Build and ship `gstack-opencode` as a production-ready npm package that brings Garry Tan's complete sprint workflow to OpenCode users, with both autonomous multi-agent orchestration and backward-compatible individual skill commands, powered by 5 built-in MCP servers and Backlog.md-integrated sprint management.

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
- [ ] `bunx gstack-opencode doctor` reports healthy system
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

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .gstack/evidence/. Compare deliverables against plan. Verify all 5 MCP configs exist and are lazily initialized. Verify Backlog.md integration has graceful degradation.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | MCPs [5/5] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `tsc --noEmit` + `bun run lint` + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check 200 LOC limit compliance. Check no catch-all files (utils.ts, helpers.ts, service.ts). Check kebab-case file naming. Verify no synchronous MCP connections in plugin load path.
      Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Plugin QA** — `unspecified-high`
      Start from clean state. Build the plugin (`bun run build`). Create a test OpenCode config that includes `gstack-opencode` in plugins array. Verify plugin loads without errors within 10s. Verify skills are discoverable. Verify config mode switch works (multi-agent vs skills-only). Verify MCP configs are present and disableable. Verify CLI doctor command runs. Verify `.gstack/` directory structure created on first session. Save evidence to `.gstack/evidence/final-qa/`.
      Output: `Build [PASS/FAIL] | Plugin Load [PASS/FAIL] | Skills [N/25] | Agents [N/13] | MCPs [N/5] | Config [PASS/FAIL] | CLI [PASS/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes. Verify `.gstack/` uses subdirectory structure (no loose files at root except flags). Verify `.backlog/` is only accessed through MCP tools.
      Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------- |
| 1    | `chore(deps): add runtime dependencies and fix tsconfig` — package.json, tsconfig.json                               |
| 1    | `feat(shared): add logger, deep-merge, and path helpers` — src/shared/\*.ts                                          |
| 1    | `feat(types): add core type definitions` — src/types.ts, src/types/\*.ts                                             |
| 1    | `feat(config): add Zod v4 schema definitions` — src/config/schema/\*.ts                                              |
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
bunx gstack-opencode doctor      # Expected: all checks pass
```

### Final Checklist

- [ ] All 25 gstack skills ported and adapted
- [ ] All 13 agents registered with instructions
- [ ] All 5 MCP servers configured and individually disableable
- [ ] MCP connections are lazy/on-demand (no blocking at plugin load)
- [ ] Backlog.md integration creates/updates tasks via MCP (graceful degradation if unavailable)
- [ ] Config mode switch works (multi-agent vs skills-only)
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
