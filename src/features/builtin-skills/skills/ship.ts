import type { GstackSkill } from '../../../types/skill.ts';
import { transformSkillContent } from '../../skill-adapter/content-transformer.ts';

const rawTemplate = `\`\`\`bash
mkdir -p .gstack/analytics
echo '{"skill":"ship","ts":"'\$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> .gstack/analytics/skill-usage.jsonl 2>/dev/null || true
\`\`\`

# Ship: Fully Automated Ship Workflow

You are running the \`/ship\` workflow. This is a **non-interactive, fully automated** workflow. Do NOT ask for confirmation at any step. The user said \`/ship\` which means DO IT. Run straight through and output the PR URL at the end.

**Only stop for:**
- On the base branch (abort)
- Merge conflicts that can't be auto-resolved (stop, show conflicts)
- Test failures (stop, show failures)
- Pre-landing review finds ASK items that need user judgment
- MINOR or MAJOR version bump needed (ask — see Step 4)
- TODOS.md missing and user wants to create one (ask — see Step 5.5)
- TODOS.md disorganized and user wants to reorganize (ask — see Step 5.5)

**Never stop for:**
- Uncommitted changes (always include them)
- Version bump choice (auto-pick MICRO or PATCH — see Step 4)
- CHANGELOG content (auto-generate from diff)
- Commit message approval (auto-commit)
- Multi-file changesets (auto-split into bisectable commits)
- TODOS.md completed-item detection (auto-mark)
- Auto-fixable review findings (dead code, N+1, stale comments — fixed automatically)
- Test coverage gaps (auto-generate and commit, or flag in PR body)

---

## Step 1: Pre-flight

1. Check the current branch. If on the base branch or the repo's default branch, **abort**: "You're on the base branch. Ship from a feature branch."

2. Run \`git status\` (never use \`-uall\`). Uncommitted changes are always included — no need to ask.

3. Run \`git diff <base>...HEAD --stat\` and \`git log <base>..HEAD --oneline\` to understand what's being shipped.

4. Check review readiness:

Read the review dashboard from \`.gstack/reviews/dashboard.json\` if it exists:

\`\`\`bash
cat .gstack/reviews/dashboard.json 2>/dev/null || echo "NO_REVIEWS"
\`\`\`

Parse the output. Find the most recent entry for each skill (plan-ceo-review, plan-eng-review, plan-design-review, design-review-lite, adversarial-review, codex-review). Ignore entries with timestamps older than 7 days. Display:

\`\`\`
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review          | Runs | Last Run            | Status    | Required |
|-----------------|------|---------------------|-----------|----------|
| Eng Review      |  1   | 2026-03-16 15:00    | CLEAR     | YES      |
| CEO Review      |  0   | —                   | —         | no       |
| Design Review   |  0   | —                   | —         | no       |
| Adversarial     |  0   | —                   | —         | no       |
+--------------------------------------------------------------------+
| VERDICT: CLEARED — Eng Review passed                                |
+====================================================================+
\`\`\`

**Review tiers:**
- **Eng Review (required by default):** The only review that gates shipping. Covers architecture, code quality, tests, performance.
- **CEO Review (optional):** Recommend it for big product/business changes, new user-facing features, or scope decisions. Skip for bug fixes, refactors, infra, and cleanup.
- **Design Review (optional):** Recommend it for UI/UX changes. Skip for backend-only, infra, or prompt-only changes.
- **Adversarial Review (automatic):** Auto-scales by diff size. Small diffs (<50 lines) skip adversarial. Medium diffs (50–199) get cross-model adversarial. Large diffs (200+) get all 4 passes.

**Verdict logic:**
- **CLEARED**: Eng Review has >= 1 entry within 7 days with status "clean"
- **NOT CLEARED**: Eng Review missing, stale (>7 days), or has open issues
- CEO, Design, and Codex reviews are shown for context but never block shipping

**Staleness detection:** For each review entry, compare its stored commit against the current HEAD. If different, count elapsed commits: \`git rev-list --count STORED_COMMIT..HEAD\`. Display: "Note: {skill} review from {date} may be stale — {N} commits since review"

If the Eng Review is NOT "CLEAR":

1. **Check for a prior override on this branch:**
   \`\`\`bash
   SLUG=\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
   BRANCH=\$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
   grep '"skill":"ship-review-override"' .gstack/reviews/\$BRANCH-reviews.jsonl 2>/dev/null || echo "NO_OVERRIDE"
   \`\`\`
   If an override exists, display the dashboard and note "Review gate previously accepted — continuing." Do NOT ask again.

2. **If no override exists,** use AskUserQuestion:
   - Show that Eng Review is missing or has open issues
   - RECOMMENDATION: Choose C if the change is obviously trivial (< 20 lines, typo fix, config-only); Choose B for larger changes
   - Options: A) Ship anyway  B) Abort — run /plan-eng-review first  C) Change is too small to need eng review

3. **If the user chooses A or C,** persist the decision so future \`/ship\` runs on this branch skip the gate:
   \`\`\`bash
   SLUG=\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
   BRANCH=\$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
   mkdir -p .gstack/reviews
   echo '{"skill":"ship-review-override","timestamp":"'"\$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","decision":"USER_CHOICE"}' >> .gstack/reviews/\$BRANCH-reviews.jsonl
   \`\`\`

---

## Step 2: Merge the base branch (BEFORE tests)

Fetch and merge the base branch into the feature branch so tests run against the merged state:

\`\`\`bash
git fetch origin <base> && git merge origin/<base> --no-edit
\`\`\`

**If there are merge conflicts:** Try to auto-resolve if they are simple (VERSION, schema.rb, CHANGELOG ordering). If conflicts are complex or ambiguous, **STOP** and show them.

**If already up to date:** Continue silently.

---

## Step 2.5: Test Framework Bootstrap

**Detect existing test framework and project runtime:**

\`\`\`bash
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
[ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK:rails"
[ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "FRAMEWORK:nextjs"
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
[ -f .gstack/no-test-bootstrap ] && echo "BOOTSTRAP_DECLINED"
\`\`\`

**If test framework detected:** Print "Test framework detected: {name} ({N} existing tests). Skipping bootstrap."

**If BOOTSTRAP_DECLINED:** Print "Test bootstrap previously declined — skipping."

**If NO runtime detected:** Use AskUserQuestion to ask which runtime to set up.

**If runtime detected but no test framework — bootstrap:** Follow B2–B8 steps for research, framework selection, install, configure, create example test, CI setup, create TESTING.md, update CLAUDE.md, and commit.

---

## Step 3: Run tests (on merged code)

Run the project's test suite:

\`\`\`bash
{detected test command} 2>&1 | tee /tmp/ship_tests.txt
\`\`\`

**If any test fails:** Show the failures and **STOP**. Do not proceed.

**If all pass:** Continue silently — just note the counts briefly.

---

## Step 3.25: Eval Suites (conditional)

Skip this step if no prompt-related files are in the diff. If the diff touches prompt-related files (AI evaluation files, LLM prompt templates), run affected eval suites. If any eval fails: show the failures and **STOP**.

---

## Step 3.4: Test Coverage Audit

100% coverage is the goal — every untested path is a path where bugs hide.

**1. Before/after test count:**

\`\`\`bash
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
\`\`\`

**2. Trace every codepath changed** using \`git diff origin/<base>...HEAD\`. Read every changed file. For each one, trace how data flows through the code. Build an ASCII diagram showing every function, conditional branch, error path, and edge case.

**3. Output ASCII coverage diagram** showing both code paths and user flows, with [TESTED/GAP] annotations and coverage percentages.

**4. Generate tests for uncovered paths** (max 20 tests, cap 30 code paths). Run each test. Passes → commit. Fails → revert, note gap.

**5. After-count:** \`Tests: {before} → {after} (+{delta} new)\`

---

## Step 3.5: Pre-Landing Review

1. Read \`.gstack/rules/review-checklist.md\` if it exists, otherwise use universal code review checklist.

2. Run \`git diff origin/<base>\` to get the full diff.

3. Apply the review checklist in two passes:
   - **Pass 1 (CRITICAL):** SQL & Data Safety, Security vulnerabilities, LLM Output Trust Boundary
   - **Pass 2 (INFORMATIONAL):** All remaining categories

4. If diff touches frontend files (check for .tsx/.ts/.css/.scss/.html/.vue files):
   \`\`\`bash
   CHANGED_FILES=\$(git diff origin/<base> --name-only 2>/dev/null)
   SCOPE_FRONTEND=false
   echo "\$CHANGED_FILES" | grep -qE '\\.(tsx?|jsx?|css|scss|html|vue|svelte)$' && SCOPE_FRONTEND=true
   \`\`\`
   If SCOPE_FRONTEND=true, read \`.gstack/rules/design-checklist.md\` and apply it.

5. Classify findings as AUTO-FIX or ASK. Apply all AUTO-FIX items. Present ASK items in one AskUserQuestion.

6. After all fixes: If ANY fixes were applied, commit fixed files, then **STOP** and tell user to run \`/ship\` again to re-test.

---

## Step 3.75: Address Greptile Review Comments (if PR exists)

Read \`.gstack/rules/greptile-triage.md\` and follow the fetch, filter, classify, and escalation detection steps. If no PR exists or there are zero Greptile comments, skip silently.

---

## Step 4: Version bump (auto-decide)

1. Read the current \`VERSION\` file (4-digit format: \`MAJOR.MINOR.PATCH.MICRO\`)

2. Auto-decide the bump level based on the diff:
   - **MICRO** (4th digit): < 50 lines changed, trivial tweaks, typos, config
   - **PATCH** (3rd digit): 50+ lines changed, bug fixes, small-medium features
   - **MINOR** (2nd digit): **ASK the user** — only for major features or significant architectural changes
   - **MAJOR** (1st digit): **ASK the user** — only for milestones or breaking changes

3. Compute the new version. Bumping a digit resets all digits to its right to 0.

4. Write the new version to the \`VERSION\` file.

---

## Step 5: CHANGELOG (auto-generate)

1. Read \`CHANGELOG.md\` header to know the format.

2. Auto-generate the entry from ALL commits on the branch:
   - \`git log <base>..HEAD --oneline\`
   - \`git diff <base>...HEAD\`
   - Categorize: Added, Changed, Fixed, Removed
   - Insert after the file header, dated today
   - Format: \`## [X.Y.Z.W] - YYYY-MM-DD\`

**Do NOT ask the user to describe changes.** Infer from the diff and commit history.

---

## Step 5.5: TODOS.md (auto-update)

Cross-reference TODOS.md against the changes being shipped. Mark completed items automatically. Read \`.gstack/rules/TODOS-format.md\` for canonical format reference if it exists.

If TODOS.md does not exist: Use AskUserQuestion asking whether to create one.

If TODOS.md is disorganized: Use AskUserQuestion asking whether to reorganize it.

Auto-detect completed TODOs from the diff. Be conservative — only mark items with clear evidence.

---

## Step 6: Commit (bisectable chunks)

Create small, logical commits that work well with \`git bisect\`:

1. Group changes into logical commits (one coherent change per commit)
2. **Commit ordering:** Infrastructure → Models & services → Controllers & views → VERSION + CHANGELOG + TODOS.md
3. Rules: A model and its test file go in the same commit. Migrations are their own commit.
4. Each commit must be independently valid — no broken imports.

Final commit:
\`\`\`bash
git commit -m "\$(cat <<'EOF'
chore: bump version and changelog (vX.Y.Z.W)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
\`\`\`

---

## Step 6.5: Verification Gate

**IRON LAW: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**

Before pushing, re-verify if code changed during Steps 4–6:

1. **Test verification:** If ANY code changed after Step 3's test run, re-run the test suite. Paste fresh output. Stale output from Step 3 is NOT acceptable.
2. **Build verification:** If the project has a build step, run it.

**If tests fail here:** STOP. Do not push.

---

## Step 7: Push

\`\`\`bash
git push -u origin <branch-name>
\`\`\`

---

## Step 8: Create PR

\`\`\`bash
gh pr create --base <base> --title "<type>: <summary>" --body "\$(cat <<'EOF'
## Summary
<bullet points from CHANGELOG>

## Test Coverage
<coverage diagram from Step 3.4, or "All new code paths have test coverage.">
<Tests: {before} → {after} (+{delta} new)>

## Pre-Landing Review
<findings from Step 3.5 code review, or "No issues found.">

## Design Review
<If design review ran: findings summary. If no frontend files changed: "No frontend files changed — design review skipped.">

## TODOS
<If items marked complete: bullet list of completed items with version>
<If no items completed: "No TODO items completed in this PR.">

## Test plan
- [x] All tests pass
EOF
)"
\`\`\`

**Output the PR URL** — then proceed to Step 8.5.

---

## Step 8.5: Auto-invoke /document-release

After the PR is created, automatically sync project documentation. Follow the \`/document-release\` skill workflow:

1. Discover all .md files in the project (excluding .git, node_modules, .gstack)
2. Cross-reference each doc file against the diff and update anything that drifted
3. If any docs were updated, commit the changes and push to the same branch
4. If no docs needed updating, say "Documentation is current — no updates needed."

This step is automatic. Do not ask the user for confirmation.

---

## Important Rules

- **Never skip tests.** If tests fail, stop.
- **Never force push.** Use regular \`git push\` only.
- **Never ask for trivial confirmations** (e.g., "ready to push?", "create PR?"). DO stop for: version bumps (MINOR/MAJOR), pre-landing review findings (ASK items).
- **Always use the 4-digit version format** from the VERSION file.
- **Date format in CHANGELOG:** \`YYYY-MM-DD\`
- **Split commits for bisectability** — each commit = one logical change.
- **TODOS.md completion detection must be conservative.** Only mark items as completed when the diff clearly shows the work is done.
- **Never push without fresh verification evidence.** If code changed after Step 3 tests, re-run before pushing.
- **The goal is: user says \`/ship\`, next thing they see is the review + PR URL + auto-synced docs.**`;

export const shipSkill: GstackSkill = {
  name: 'ship',
  description:
    'Fully automated ship workflow: run tests, audit coverage, create bisectable commits, open PR, and auto-sync docs.',
  template: transformSkillContent(rawTemplate),
  group: 'deploy',
  originalSkillName: 'gstack-ship',
  browserRequired: false,
};
