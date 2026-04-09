---
phase: 03-company-orchestration-and-prompt-projection
plan: 01
subsystem: orchestrator, prompts, company-surface
tags: [company-mode, prompt-projection, leak-prevention, system-prompts, tdd]
dependency_graph:
  requires: []
  provides:
    - company-only system prompt projection that hides specialist identity in normal UX
    - mode-aware prompt builder with explicit company vs legacy-multi behavior
  affects:
    - src/features/orchestrator/system-prompt-builder.ts
    - src/plugin-interface.ts
    - src/features/company/company-prompt-builder.ts
tech_stack:
  added: []
  patterns:
    - company-facing prompt composition lives in a dedicated builder rather than reusing raw delegation output
    - legacy-multi prompt output remains backward compatible through an explicit mode switch
    - visible Company text is sanitized before rendering to prevent persona leakage
key_files:
  created:
    - src/features/company/company-prompt-builder.ts
    - src/features/company/company-prompt-builder.test.ts
  modified:
    - src/features/orchestrator/system-prompt-builder.ts
    - src/features/orchestrator/system-prompt-builder.test.ts
decisions:
  - 'Company-mode prompt rendering excludes agent identity and raw delegation reasoning entirely instead of trying to selectively redact the legacy format'
  - 'System prompt construction now branches by explicit surface mode so Company UX and legacy multi-agent UX can coexist safely'
  - 'Skill visibility stays outcome-focused in Company mode by rendering concise capability bullets instead of specialist-oriented skill sections'
metrics:
  duration: ~1 session
  completed: '2026-04-09'
  tasks_completed: 2
  files_changed: 4
---

# Phase 03 Plan 01: Company Prompt Projection — Summary

**One-liner:** Company-mode system prompts now present only The Company, with sanitized capability summaries and an explicit fallback to legacy multi-agent prompt output when Company mode is not active.

## What Changed

### Task 1 — Dedicated Company Prompt Builder

Added `src/features/company/company-prompt-builder.ts` and `src/features/company/company-prompt-builder.test.ts` to define a Company-safe prompt projection boundary.

- Renders `## The Company — Active Context`
- Supports optional runtime status and execution guidance
- Lists capabilities as concise `- **/skill**: description` bullets
- Sanitizes persona labels and hidden-specialist identifiers from embedded instruction text
- Never prints `agent.name`, `agent.role`, or raw delegation reasoning

### Task 2 — Mode-Aware Orchestrator Prompt Builder

Updated `src/features/orchestrator/system-prompt-builder.ts` and tests so `buildDelegationSystemPrompt()` accepts a surface mode:

- `mode: 'company'` routes through `buildCompanySystemPrompt(...)`
- `mode: 'legacy-multi'` preserves the existing specialist-facing format
- No-options calls still default to legacy behavior for compatibility

## Verification

- `bun test src/features/company/company-prompt-builder.test.ts` ✓
- `bun test src/features/orchestrator/system-prompt-builder.test.ts` ✓
- Included in full repo verification on 2026-04-09:
  - `bun run test` ✓
  - `bun run typecheck` ✓
  - `bun run lint` ✓ (only pre-existing warning in generated `.opencode` code)
  - `bun run build:all` ✓

## Issues Encountered

- A comment/docstring hook rejected newly added field docstrings during Phase 3 work. The docstrings were removed and the implementation proceeded without them.

## Decisions Made

- Used a separate Company prompt builder instead of patching the legacy prompt text in place, because the Company surface has stricter leak-prevention rules.
- Kept legacy prompt behavior intact by making Company mode an explicit branch rather than changing the default surface.

## Next Phase Readiness

- Prompt projection is ready for runtime activation by `plugin-interface.ts`.
- Company-mode runtime can now safely inject prompt context without exposing hidden specialist metadata.

## Commit Status

- No commit created in this session. The user did not request a commit.
