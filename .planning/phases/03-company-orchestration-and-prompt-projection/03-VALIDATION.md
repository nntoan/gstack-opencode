---
phase: 03
slug: company-orchestration-and-prompt-projection
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-08
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| **Framework**          | Bun test runner (vitest-compatible API)                     |
| **Config file**        | none — Bun default                                          |
| **Quick run command**  | `bun test src/features/company/ src/features/orchestrator/` |
| **Full suite command** | `bun run test && bun run typecheck && bun run lint`         |
| **Estimated runtime**  | ~60 seconds                                                 |

---

## Sampling Rate

- **After every task commit:** Run `bun test src/features/company/ src/features/orchestrator/`
- **After every plan wave:** Run `bun run test && bun run typecheck && bun run lint`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement  | Threat Ref | Secure Behavior                                                                                                             | Test Type   | Automated Command                                                                                                              | File Exists | Status   |
| -------- | ---- | ---- | ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------- | -------- |
| 03-01-01 | 01   | 1    | R10          | T-03-01    | Company prompt never exposes hidden-specialist names in normal mode                                                         | unit        | `bun test src/features/company/company-prompt-builder.test.ts src/features/orchestrator/system-prompt-builder.test.ts`         | ✅          | ✅ green |
| 03-01-02 | 01   | 1    | R10, R12     | T-03-02    | Company-mode system prompt uses compact skill summaries and minimal runtime context only                                    | unit        | `bun test src/features/company/company-prompt-builder.test.ts src/features/orchestrator/system-prompt-builder.test.ts`         | ✅          | ✅ green |
| 03-02-01 | 02   | 1    | R7, R12      | T-03-03    | Decision waits persist workflow-bound state, deferred request text, and deferred classified intent                          | unit        | `bun test src/features/company/company-decision-wait.test.ts`                                                                  | ✅          | ✅ green |
| 03-02-02 | 02   | 1    | R7, R12, R14 | T-03-04    | Canonical state writes, resolves, archives decision waits, and persists retry lineage safely                                | unit        | `bun test src/features/company/storage.test.ts`                                                                                | ✅          | ✅ green |
| 03-02-03 | 02   | 1    | R6, R12      | T-03-05    | DelegationResult accepts additive Company workflow metadata without breaking legacy callers                                 | unit        | `bun test src/features/orchestrator/delegation-engine.test.ts`                                                                 | ✅          | ✅ green |
| 03-03-01 | 03   | 1    | R5, R7       | T-03-06    | Low-confidence routing asks first and explicit commands still delegate immediately                                          | unit        | `bun test src/features/company/company-ambiguity-policy.test.ts src/features/orchestrator/intent-classifier.test.ts`           | ✅          | ✅ green |
| 03-03-02 | 03   | 1    | R7, R12      | T-03-08    | Rejected confirmations produce alternatives, multi-intent requests are sequenced, and expert hints appear only after stalls | unit        | `bun test src/features/company/company-ambiguity-policy.test.ts`                                                               | ✅          | ✅ green |
| 03-03-03 | 03   | 1    | R7, R12      | T-03-13    | Pending Company context preserves deferred intent, request text, and approval kind across sessions                          | unit        | `bun test src/features/orchestrator/delegation-state.test.ts`                                                                  | ✅          | ✅ green |
| 03-04-01 | 04   | 2    | R7, R10      | T-03-09    | Ask/confirm/approval waits are checkpoint-bound and skip delegation until answered                                          | integration | `bun test src/plugin-interface.test.ts`                                                                                        | ✅          | ✅ green |
| 03-04-02 | 04   | 2    | R5, R7, R12  | T-03-14    | Delegated Company workflows reuse one workflow identity and parse yes/no/debug answers deterministically                    | integration | `bun test src/plugin-interface.test.ts`                                                                                        | ✅          | ✅ green |
| 03-05-01 | 05   | 3    | R7, R10, R14 | T-03-15    | Recovery and progress output uses Company language by default and hides hidden-specialist provenance                        | unit        | `bun test src/features/session-continuity/session-continuity.test.ts`                                                          | ✅          | ✅ green |
| 03-05-02 | 05   | 3    | R12, R14     | T-03-18    | Debug trace output is explicit, causality-first, and shown only when trace visibility is debug                              | unit        | `bun test src/features/session-continuity/session-continuity.test.ts src/features/quality-scorecard/quality-scorecard.test.ts` | ✅          | ✅ green |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [x] `src/features/company/company-prompt-builder.test.ts` — implemented for R10, R12
- [x] `src/features/company/company-ambiguity-policy.test.ts` — implemented for R5, R7, R12
- [x] `src/features/company/company-decision-wait.test.ts` — implemented for R7, R12, R14
- [x] `src/plugin-interface.test.ts` — focused integration coverage for Company ask/confirm wiring

---

## Manual-Only Verifications

All phase behaviors should have automated verification. No manual-only validation is planned for this phase.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete — full suite passed on 2026-04-09 including `bun run test`, `bun run typecheck`, `bun run lint`, and `bun run build:all`
