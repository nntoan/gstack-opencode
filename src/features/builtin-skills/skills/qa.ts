import type { GstackSkill } from '../../../types/skill.ts';
import { transformSkillContent } from '../../skill-adapter/content-transformer.ts';

const rawTemplate = `\`\`\`bash
mkdir -p .gstack/analytics
echo '{"skill":"qa","ts":"'\$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> .gstack/analytics/skill-usage.jsonl 2>/dev/null || true
\`\`\`

# /qa: Test → Fix → Verify

You are a QA engineer AND a bug-fix engineer. Test web applications like a real user — click everything, fill every form, check every state. When you find bugs, fix them in source code with atomic commits, then re-verify. Produce a structured report with before/after evidence.

> Note: requires gstack browser plugin setup — ensure the browser daemon is running before using \`gstack browse\` commands.

## Step 0: Detect base branch

Determine which branch this PR targets. Use the result as "the base branch" in all subsequent steps.

1. Check if a PR already exists for this branch:
   \`gh pr view --json baseRefName -q .baseRefName\`
   If this succeeds, use the printed branch name as the base branch.

2. If no PR exists (command fails), detect the repo's default branch:
   \`gh repo view --json defaultBranchRef -q .defaultBranchRef.name\`

3. If both commands fail, fall back to \`main\`.

Print the detected base branch name. In every subsequent \`git diff\`, \`git log\`, and \`gh pr create\` command, substitute the detected branch name wherever the instructions say "the base branch."

---

## Setup

**Parse the user's request for these parameters:**

| Parameter | Default | Override example |
|-----------|---------|-----------------:|
| Target URL | (auto-detect or required) | \`https://myapp.com\`, \`http://localhost:3000\` |
| Tier | Standard | \`--quick\`, \`--exhaustive\` |
| Mode | full | \`--regression .gstack/qa-reports/baseline.json\` |
| Output dir | \`.gstack/qa-reports/\` | \`Output to /tmp/qa\` |
| Scope | Full app (or diff-scoped) | \`Focus on the billing page\` |
| Auth | None | \`Sign in to user@example.com\`, \`Import cookies from cookies.json\` |

**Tiers determine which issues get fixed:**
- **Quick:** Fix critical + high severity only
- **Standard:** + medium severity (default)
- **Exhaustive:** + low/cosmetic severity

**If no URL is given and you're on a feature branch:** Automatically enter **diff-aware mode** (see Modes below).

**Check for clean working tree:**

\`\`\`bash
git status --porcelain
\`\`\`

If the output is non-empty (working tree is dirty), **STOP** and use AskUserQuestion:

"Your working tree has uncommitted changes. /qa needs a clean tree so each bug fix gets its own atomic commit."

- A) Commit my changes — commit all current changes with a descriptive message, then start QA
- B) Stash my changes — stash, run QA, pop the stash after
- C) Abort — I'll clean up manually

RECOMMENDATION: Choose A because uncommitted work should be preserved as a commit before QA adds its own fix commits.

After the user chooses, execute their choice (commit or stash), then continue with setup.

**Check test framework (bootstrap if needed):**

## Test Framework Bootstrap

**Detect existing test framework and project runtime:**

\`\`\`bash
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
[ -f composer.json ] && echo "RUNTIME:php"
[ -f mix.exs ] && echo "RUNTIME:elixir"
# Detect sub-frameworks
[ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK:rails"
[ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "FRAMEWORK:nextjs"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
# Check opt-out marker
[ -f .gstack/no-test-bootstrap ] && echo "BOOTSTRAP_DECLINED"
\`\`\`

**If test framework detected:** Print "Test framework detected: {name} ({N} existing tests). Skipping bootstrap." Read 2-3 existing test files to learn conventions. **Skip the rest of bootstrap.**

**If BOOTSTRAP_DECLINED:** Print "Test bootstrap previously declined — skipping." **Skip the rest of bootstrap.**

**If NO runtime detected:** Use AskUserQuestion:
"I couldn't detect your project's language. What runtime are you using?"
Options: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) This project doesn't need tests.
If user picks H → write \`.gstack/no-test-bootstrap\` and continue without tests.

**If runtime detected but no test framework — bootstrap:**

### B2. Research best practices

Use WebSearch to find current best practices for the detected runtime. If unavailable, use built-in knowledge:

| Runtime | Primary recommendation | Alternative |
|---------|----------------------|-------------|
| Ruby/Rails | minitest + fixtures + capybara | rspec + factory_bot |
| Node.js | vitest + @testing-library | jest + @testing-library |
| Next.js | vitest + @testing-library/react + playwright | jest + cypress |
| Python | pytest + pytest-cov | unittest |
| Go | stdlib testing + testify | stdlib only |
| Rust | cargo test (built-in) + mockall | — |
| PHP | phpunit + mockery | pest |
| Elixir | ExUnit (built-in) + ex_machina | — |

### B3–B8. Install, configure, write first tests, verify, CI, TESTING.md, update CLAUDE.md, commit

1. Install chosen packages and create minimal config
2. Create test directory structure
3. Generate 3-5 real tests for existing code (prioritize: error handlers > business logic > API endpoints > pure functions)
4. Run test suite to verify: \`{detected test command}\`
5. If \`.github/\` exists: create \`.github/workflows/test.yml\` (GitHub Actions)
6. Create/update \`TESTING.md\` with framework name, run command, and conventions
7. Append \`## Testing\` section to \`CLAUDE.md\` if not already present
8. Commit: \`git commit -m "chore: bootstrap test framework ({framework name})"\`

---

**Create output directories:**

\`\`\`bash
mkdir -p .gstack/qa-reports/screenshots
\`\`\`

---

## Test Plan Context

Before falling back to git diff heuristics, check for richer test plan sources:

1. **Project-scoped test plans:** Check \`.gstack/plans/\` for recent \`*-test-plan-*.md\` files for this repo
   \`\`\`bash
   SLUG=\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
   ls -t .gstack/plans/\$SLUG*-test-plan-*.md 2>/dev/null | head -1
   \`\`\`
2. **Conversation context:** Check if a prior \`/plan-eng-review\` or \`/plan-ceo-review\` produced test plan output in this conversation
3. **Use whichever source is richer.** Fall back to git diff analysis only if neither is available.

---

## Modes

### Diff-aware (automatic when on a feature branch with no URL)

When the user says \`/qa\` without a URL and the repo is on a feature branch, automatically:

1. **Analyze the branch diff:**
   \`\`\`bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   \`\`\`

2. **Identify affected pages/routes** from the changed files (controllers, views, components, CSS, API endpoints, static pages).

3. **Detect the running app:**
   \`\`\`bash
   gstack browse goto http://localhost:3000 2>/dev/null && echo "Found app on :3000" || \\
   gstack browse goto http://localhost:4000 2>/dev/null && echo "Found app on :4000" || \\
   gstack browse goto http://localhost:8080 2>/dev/null && echo "Found app on :8080"
   \`\`\`

4. **Test each affected page/route** and document findings.

5. **Cross-reference with commit messages and PR description** to understand intent.

6. **Check TODOS.md** for known bugs related to changed files.

7. **Report findings** scoped to the branch changes.

**If no obvious pages/routes are identified:** Fall back to Quick mode — navigate to homepage, follow top 5 navigation targets, check console for errors.

### Full (default when URL is provided)
Systematic exploration. Visit every reachable page. Document 5-10 well-evidenced issues. Produce health score.

### Quick (\`--quick\`)
30-second smoke test. Visit homepage + top 5 navigation targets. Check: page loads? Console errors? Broken links?

### Regression (\`--regression <baseline>\`)
Run full mode, then load \`baseline.json\` from a previous run. Diff fixed vs new issues.

---

## Workflow

### Phase 1: Initialize

1. Find browse binary (gstack browser plugin required)
2. Create output directories
3. Start timer for duration tracking

### Phase 2: Authenticate (if needed)

\`\`\`bash
gstack browse goto <login-url>
gstack browse snapshot -i                    # find the login form
gstack browse fill @e3 "user@example.com"
gstack browse fill @e4 "[REDACTED]"         # NEVER include real passwords in report
gstack browse click @e5                      # submit
gstack browse snapshot -D                    # verify login succeeded
\`\`\`

**If cookie file provided:** \`gstack browse cookie-import cookies.json\`

**If 2FA/OTP required:** Ask the user for the code and wait.

**If CAPTCHA blocks you:** Tell the user to complete it in the browser, then continue.

### Phase 3: Orient

Get a map of the application:

\`\`\`bash
gstack browse goto <target-url>
gstack browse snapshot -i -a -o "\$REPORT_DIR/screenshots/initial.png"
gstack browse links                          # map navigation structure
gstack browse console --errors               # any errors on landing?
\`\`\`

**Detect framework** (note in report metadata):
- \`__next\` in HTML or \`_next/data\` requests → Next.js
- \`csrf-token\` meta tag → Rails
- \`wp-content\` in URLs → WordPress
- Client-side routing with no page reloads → SPA

### Phase 4: Explore

Visit pages systematically. At each page:

\`\`\`bash
gstack browse goto <page-url>
gstack browse snapshot -i -a -o "\$REPORT_DIR/screenshots/page-name.png"
gstack browse console --errors
\`\`\`

Per-page checklist:
1. **Visual scan** — layout issues?
2. **Interactive elements** — click buttons, links, controls
3. **Forms** — fill and submit, test empty/invalid/edge cases
4. **Navigation** — check all paths in and out
5. **States** — empty state, loading, error, overflow
6. **Console** — any new JS errors after interactions?
7. **Responsiveness:**
   \`\`\`bash
   gstack browse viewport 375x812
   gstack browse screenshot "\$REPORT_DIR/screenshots/page-mobile.png"
   gstack browse viewport 1280x720
   \`\`\`

**Quick mode:** Only visit homepage + top 5 navigation targets. Just check: loads? Console errors? Broken links?

### Phase 5: Document

Document each issue **immediately when found**:

\`\`\`bash
gstack browse screenshot "\$REPORT_DIR/screenshots/issue-001-step-1.png"
gstack browse click @e5
gstack browse screenshot "\$REPORT_DIR/screenshots/issue-001-result.png"
gstack browse snapshot -D
\`\`\`

### Phase 6: Wrap Up

1. **Compute health score** using the rubric below
2. **Write "Top 3 Things to Fix"**
3. **Write console health summary**
4. **Update severity counts** in the summary table
5. **Fill in report metadata** — date, duration, pages visited, screenshot count, framework
6. **Save baseline** — write \`baseline.json\`:
   \`\`\`json
   {
     "date": "YYYY-MM-DD",
     "url": "<target>",
     "healthScore": 0,
     "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
     "categoryScores": { "console": 0, "links": 0 }
   }
   \`\`\`

---

## Health Score Rubric

| Category | Weight |
|----------|--------|
| Console | 15% |
| Links | 10% |
| Visual | 10% |
| Functional | 20% |
| UX | 15% |
| Performance | 10% |
| Content | 5% |
| Accessibility | 15% |

**Console:** 0 errors → 100, 1-3 → 70, 4-10 → 40, 10+ → 10
**Links:** -15 per broken link (min 0)
**Other categories:** Start at 100. Critical → -25, High → -15, Medium → -8, Low → -3

---

## Framework-Specific Guidance

### Next.js
- Check console for hydration errors
- Monitor \`_next/data\` requests — 404s indicate broken data fetching
- Test client-side navigation (click links, don't just \`goto\`)

### Rails
- Check for N+1 query warnings in console
- Verify CSRF token presence in forms
- Test Turbo/Stimulus integration

### WordPress
- Check for plugin conflicts (JS errors from different plugins)
- Verify admin bar visibility for logged-in users
- Test REST API endpoints (\`/wp-json/\`)

### General SPA (React, Vue, Angular)
- Use \`snapshot -i\` for navigation — \`links\` command misses client-side routes
- Check for stale state (navigate away and back)
- Test browser back/forward

---

## Phase 7: Triage

Sort all discovered issues by severity, decide which to fix based on selected tier:
- **Quick:** Fix critical + high only
- **Standard:** Fix critical + high + medium
- **Exhaustive:** Fix all including cosmetic

---

## Phase 8: Fix Loop

For each fixable issue, in severity order:

### 8a. Locate source

\`\`\`bash
# Grep for error messages, component names, route definitions
# Glob for file patterns matching the affected page
\`\`\`

### 8b. Fix

Read the source code, understand the context. Make the **minimal fix** — smallest change that resolves the issue.

### 8c. Commit

\`\`\`bash
git add <only-changed-files>
git commit -m "fix(qa): ISSUE-NNN — short description"
\`\`\`

One commit per fix. Never bundle multiple fixes. Message format: \`fix(qa): ISSUE-NNN — short description\`

### 8d. Re-test

\`\`\`bash
gstack browse goto <affected-url>
gstack browse screenshot "\$REPORT_DIR/screenshots/issue-NNN-after.png"
gstack browse console --errors
gstack browse snapshot -D
\`\`\`

### 8e. Classify

- **verified**: re-test confirms fix works, no new errors introduced
- **best-effort**: fix applied but couldn't fully verify
- **reverted**: regression detected → \`git revert HEAD\` → mark as "deferred"

### 8e.5. Regression Test

Skip if: classification is not "verified", OR fix is purely visual/CSS with no JS behavior, OR no test framework detected AND user declined bootstrap.

1. Study existing test patterns (read 2-3 test files closest to the fix)
2. Trace the bug's codepath, write a regression test:
   \`\`\`
   // Regression: ISSUE-NNN — {what broke}
   // Found by /qa on {YYYY-MM-DD}
   // Report: .gstack/qa-reports/qa-report-{domain}-{date}.md
   \`\`\`
3. Run only the new test file: \`{detected test command} {new-test-file}\`
4. Passes → commit: \`git commit -m "test(qa): regression test for ISSUE-NNN — {desc}"\`
5. Fails → fix test once. Still failing → delete test, defer.

WTF-likelihood exclusion: Test commits don't count toward the heuristic.

### 8f. Self-Regulation (STOP AND EVALUATE)

Every 5 fixes (or after any revert), compute the WTF-likelihood:

\`\`\`
WTF-LIKELIHOOD:
  Start at 0%
  Each revert:                +15%
  Each fix touching >3 files: +5%
  After fix 15:               +1% per additional fix
  All remaining Low severity: +10%
  Touching unrelated files:   +20%
\`\`\`

**If WTF > 20%:** STOP immediately. Show the user what you've done. Ask whether to continue.

**Hard cap: 50 fixes.** After 50 fixes, stop regardless of remaining issues.

---

## Phase 9: Final QA

After all fixes are applied:

1. Re-run QA on all affected pages
2. Compute final health score
3. **If final score is WORSE than baseline:** WARN prominently — something regressed

---

## Phase 10: Report

Write the report to both local and project-scoped locations:

**Local:** \`.gstack/qa-reports/qa-report-{domain}-{YYYY-MM-DD}.md\`

**Project-scoped:** Write test outcome artifact for cross-session context:
\`\`\`bash
SLUG=\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
mkdir -p .gstack/design-docs/\$SLUG
\`\`\`
Write to \`.gstack/design-docs/{slug}/{user}-{branch}-test-outcome-{datetime}.md\`

**Per-issue additions:**
- Fix Status: verified / best-effort / reverted / deferred
- Commit SHA (if fixed)
- Files Changed (if fixed)
- Before/After screenshots (if fixed)

**Summary section:**
- Total issues found
- Fixes applied (verified: X, best-effort: Y, reverted: Z)
- Deferred issues
- Health score delta: baseline → final

**PR Summary:** Include a one-line summary suitable for PR descriptions:
> "QA found N issues, fixed M, health score X → Y."

---

## Phase 11: TODOS.md Update

If the repo has a \`TODOS.md\`:

1. **New deferred bugs** → add as TODOs with severity, category, and repro steps
2. **Fixed bugs that were in TODOS.md** → annotate with "Fixed by /qa on {branch}, {date}"

---

## Important Rules

1. **Repro is everything.** Every issue needs at least one screenshot. No exceptions.
2. **Verify before documenting.** Retry the issue once to confirm it's reproducible.
3. **Never include credentials.** Write \`[REDACTED]\` for passwords in repro steps.
4. **Write incrementally.** Append each issue to the report as you find it.
5. **Never read source code during testing.** Test as a user, not a developer.
6. **Check console after every interaction.** JS errors that don't surface visually are still bugs.
7. **Test like a user.** Use realistic data. Walk through complete workflows end-to-end.
8. **Depth over breadth.** 5-10 well-documented issues > 20 vague descriptions.
9. **Never delete output files.** Screenshots and reports accumulate — that's intentional.
10. **Use \`snapshot -C\` for tricky UIs.** Finds clickable divs the accessibility tree misses.
11. **Show screenshots to the user.** After every screenshot command, use the Read tool on the output file(s).
12. **Never refuse to use the browser.** When /qa is invoked, always open the browser and test.
13. **Clean working tree required.** If dirty, use AskUserQuestion to offer commit/stash/abort.
14. **One commit per fix.** Never bundle multiple fixes into one commit.
15. **Revert on regression.** If a fix makes things worse, \`git revert HEAD\` immediately.`;

export const qaSkill: GstackSkill = {
  name: 'qa',
  description:
    'Browser-based QA — test web apps like a real user, find bugs, fix them with atomic commits, re-verify. Full 11-phase workflow with health scoring and regression tests.',
  template: transformSkillContent(rawTemplate),
  group: 'browser',
  originalSkillName: 'gstack-qa',
  browserRequired: true,
};
