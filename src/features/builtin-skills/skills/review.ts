import type { GstackSkill } from '../../../types/skill.ts';
import { transformSkillContent } from '../../skill-adapter/content-transformer.ts';

const rawTemplate = `\`\`\`bash
mkdir -p .gstack/analytics
echo '{"skill":"review","ts":"'\$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> .gstack/analytics/skill-usage.jsonl 2>/dev/null || true
\`\`\`

Determine which branch this PR targets. Use the result as "the base branch" in all subsequent steps.

1. Check if a PR already exists for this branch:
   \`gh pr view --json baseRefName -q .baseRefName\`
   If this succeeds, use the printed branch name as the base branch.

2. If no PR exists (command fails), detect the repo's default branch:
   \`gh repo view --json defaultBranchRef -q .defaultBranchRef.name\`

3. If both commands fail, fall back to \`main\`.

Print the detected base branch name. In every subsequent \`git diff\`, \`git log\`,
\`git fetch\`, \`git merge\`, and \`gh pr create\` command, substitute the detected
branch name wherever the instructions say "the base branch."

---

# Pre-Landing PR Review

You are running the \`/review\` workflow. Analyze the current branch's diff against the base branch for structural issues that tests don't catch.

---

## Step 1: Check branch

1. Run \`git branch --show-current\` to get the current branch.
2. If on the base branch, output: **"Nothing to review — you're on the base branch or have no changes against it."** and stop.
3. Run \`git fetch origin <base> --quiet && git diff origin/<base> --stat\` to check if there's a diff. If no diff, output the same message and stop.

---

## Step 1.5: Scope Drift Detection

Before reviewing code quality, check: **did they build what was requested — nothing more, nothing less?**

1. Read \`TODOS.md\` (if it exists). Read PR description (\`gh pr view --json body --jq .body 2>/dev/null || true\`).
   Read commit messages (\`git log origin/<base>..HEAD --oneline\`).
   **If no PR exists:** rely on commit messages and TODOS.md for stated intent — this is the common case since /review runs before /ship creates the PR.
2. Identify the **stated intent** — what was this branch supposed to accomplish?
3. Run \`git diff origin/<base> --stat\` and compare the files changed against the stated intent.
4. Evaluate with skepticism:

   **SCOPE CREEP detection:**
   - Files changed that are unrelated to the stated intent
   - New features or refactors not mentioned in the plan
   - "While I was in there..." changes that expand blast radius

   **MISSING REQUIREMENTS detection:**
   - Requirements from TODOS.md/PR description not addressed in the diff
   - Test coverage gaps for stated requirements
   - Partial implementations (started but not finished)

5. Output (before the main review begins):
   \`\`\`
   Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
   Intent: <1-line summary of what was requested>
   Delivered: <1-line summary of what the diff actually does>
   [If drift: list each out-of-scope change]
   [If missing: list each unaddressed requirement]
   \`\`\`

6. This is **INFORMATIONAL** — does not block the review. Proceed to Step 2.

---

## Step 2: Read the checklist

Read \`.gstack/review/checklist.md\` if it exists, or proceed with the universal review checklist:
- SQL & Data Safety: parameterized queries, no raw string interpolation
- Race Conditions & Concurrency: proper locking, atomic operations
- LLM Output Trust Boundary: validate/sanitize before use or DB write
- Enum & Value Completeness: all switch branches, all status values handled
- Conditional Side Effects: no side effects inside conditions
- Magic Numbers & String Coupling: constants named, not inlined
- Dead Code & Consistency: removed dead code, consistent style
- Test Gaps: new code paths have corresponding tests
- View/Frontend: accessibility, loading states, error states
- Performance & Bundle Impact: no N+1 queries, no unnecessary bundle size

---

## Step 2.5: Check for Greptile review comments

Read \`.gstack/review/greptile-triage.md\` if it exists and follow the fetch, filter, classify, and escalation detection steps.

**If no PR exists, \`gh\` fails, API returns an error, or there are zero Greptile comments:** Skip this step silently. Greptile integration is additive — the review works without it.

**If Greptile comments are found:** Store the classifications (VALID & ACTIONABLE, VALID BUT ALREADY FIXED, FALSE POSITIVE, SUPPRESSED) — you will need them in Step 5.

---

## Step 3: Get the diff

Fetch the latest base branch to avoid false positives from stale local state:

\`\`\`bash
git fetch origin <base> --quiet
\`\`\`

Run \`git diff origin/<base>\` to get the full diff. This includes both committed and uncommitted changes against the latest base branch.

---

## Step 4: Two-pass review

Apply the checklist against the diff in two passes:

1. **Pass 1 (CRITICAL):** SQL & Data Safety, Race Conditions & Concurrency, LLM Output Trust Boundary, Enum & Value Completeness
2. **Pass 2 (INFORMATIONAL):** Conditional Side Effects, Magic Numbers & String Coupling, Dead Code & Consistency, LLM Prompt Issues, Test Gaps, View/Frontend, Performance & Bundle Impact

**Enum & Value Completeness requires reading code OUTSIDE the diff.** When the diff introduces a new enum value, status, tier, or type constant, use Grep to find all files that reference sibling values, then Read those files to check if the new value is handled. This is the one category where within-diff review is insufficient.

**Search-before-recommending:** When recommending a fix pattern (especially for concurrency, caching, auth, or framework-specific behavior):
- Verify the pattern is current best practice for the framework version in use
- Check if a built-in solution exists in newer versions before recommending a workaround
- Verify API signatures against current docs (APIs change between versions)

Takes seconds, prevents recommending outdated patterns. If WebSearch is unavailable, note it and proceed with in-distribution knowledge.

Follow the output format specified in the checklist. Respect the suppressions — do NOT flag items listed in the "DO NOT flag" section.

---

## Step 4.5: Design Review (conditional)

Check if the diff touches frontend files by examining the \`git diff origin/<base> --stat\` output for files matching patterns like: \`.css\`, \`.scss\`, \`.tsx\`, \`.jsx\`, \`components/\`, \`views/\`, \`pages/\`, \`styles/\`.

**If no frontend files are touched:** Skip design review silently. No output.

**If frontend files are touched:**

1. **Check for DESIGN.md.** If \`DESIGN.md\` or \`design-system.md\` exists in the repo root, read it. All design findings are calibrated against it — patterns blessed in DESIGN.md are not flagged. If not found, use universal design principles.

2. **Read \`.gstack/review/design-checklist.md\`** if it exists. If not found, use these universal checks:
   - \`outline: none\` without visible focus indicator (a11y issue)
   - \`!important\` in CSS (specificity hack)
   - \`font-size\` below 16px for body text (a11y)
   - Hardcoded color values outside of design system tokens
   - Missing loading/empty/error states for data-driven components

3. **Read each changed frontend file** (full file, not just diff hunks).

4. **Apply the design checklist** against the changed files. For each item:
   - **[HIGH] mechanical CSS fix** (\`outline: none\`, \`!important\`, \`font-size < 16px\`): classify as AUTO-FIX
   - **[HIGH/MEDIUM] design judgment needed**: classify as ASK
   - **[LOW] intent-based detection**: present as "Possible — verify visually or run /design-review"

5. **Include findings** in the review output under a "Design Review" header. Design findings merge with code review findings into the same Fix-First flow.

6. **Log the result** for the Review Readiness Dashboard:

\`\`\`bash
gstack plugin internal: gstack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
\`\`\`

Substitute: TIMESTAMP = ISO 8601 datetime, STATUS = "clean" if 0 findings or "issues_found", N = total findings, M = auto-fixed count, COMMIT = output of \`git rev-parse --short HEAD\`.

---

## Step 5: Fix-First Review

**Every finding gets action — not just critical ones.**

Output a summary header: \`Pre-Landing Review: N issues (X critical, Y informational)\`

### Step 5a: Classify each finding

For each finding, classify as AUTO-FIX or ASK:
- AUTO-FIX: mechanical, unambiguous, low-risk corrections
- ASK: requires judgment, could change behavior, or has meaningful tradeoffs

### Step 5b: Auto-fix all AUTO-FIX items

Apply each fix directly. For each one, output a one-line summary:
\`[AUTO-FIXED] [file:line] Problem → what you did\`

### Step 5c: Batch-ask about ASK items

If there are ASK items remaining, present them in ONE AskUserQuestion:

- List each item with a number, the severity label, the problem, and a recommended fix
- For each item, provide options: A) Fix as recommended, B) Skip
- Include an overall RECOMMENDATION

Example format:
\`\`\`
I auto-fixed 5 issues. 2 need your input:

1. [CRITICAL] app/models/post.rb:42 — Race condition in status transition
   Fix: Add \`WHERE status = 'draft'\` to the UPDATE
   → A) Fix  B) Skip

2. [INFORMATIONAL] app/services/generator.rb:88 — LLM output not type-checked before DB write
   Fix: Add JSON schema validation
   → A) Fix  B) Skip

RECOMMENDATION: Fix both — #1 is a real race condition, #2 prevents silent data corruption.
\`\`\`

If 3 or fewer ASK items, you may use individual AskUserQuestion calls instead of batching.

### Step 5d: Apply user-approved fixes

Apply fixes for items where the user chose "Fix." Output what was fixed.

If no ASK items exist (everything was AUTO-FIX), skip the question entirely.

### Verification of claims

Before producing the final review output:
- If you claim "this pattern is safe" → cite the specific line proving safety
- If you claim "this is handled elsewhere" → read and cite the handling code
- If you claim "tests cover this" → name the test file and method
- Never say "likely handled" or "probably tested" — verify or flag as unknown

**Rationalization prevention:** "This looks fine" is not a finding. Either cite evidence it IS fine, or flag it as unverified.

### Greptile comment resolution

After outputting your own findings, if Greptile comments were classified in Step 2.5:

**Include a Greptile summary in your output header:** \`+ N Greptile comments (X valid, Y fixed, Z FP)\`

Process each classified comment:
1. **VALID & ACTIONABLE:** Include in findings — fix or ask per Fix-First flow.
2. **FALSE POSITIVE:** Present via AskUserQuestion with options: A) Reply explaining false positive, B) Fix anyway, C) Ignore.
3. **VALID BUT ALREADY FIXED:** Note what was done and the fixing commit SHA.
4. **SUPPRESSED:** Skip silently.

---

## Step 5.5: TODOS cross-reference

Read \`TODOS.md\` in the repository root (if it exists). Cross-reference the PR against open TODOs:

- **Does this PR close any open TODOs?** If yes, note which items in your output: "This PR addresses TODO: <title>"
- **Does this PR create work that should become a TODO?** If yes, flag it as an informational finding.
- **Are there related TODOs that provide context for this review?** If yes, reference them when discussing related findings.

If TODOS.md doesn't exist, skip this step silently.

---

## Step 5.6: Documentation staleness check

Cross-reference the diff against documentation files. For each \`.md\` file in the repo root (README.md, ARCHITECTURE.md, CONTRIBUTING.md, CLAUDE.md, etc.):

1. Check if code changes in the diff affect features, components, or workflows described in that doc file.
2. If the doc file was NOT updated in this branch but the code it describes WAS changed, flag it as an INFORMATIONAL finding:
   "Documentation may be stale: [file] describes [feature/component] but code changed in this branch. Consider running \`/document-release\`."

This is informational only — never critical. The fix action is \`/document-release\`.

If no documentation files exist, skip this step silently.

---

## Important Rules

- **Read the FULL diff before commenting.** Do not flag issues already addressed in the diff.
- **Fix-first, not read-only.** AUTO-FIX items are applied directly. ASK items are only applied after user approval. Never commit, push, or create PRs — that's /ship's job.
- **Be terse.** One line problem, one line fix. No preamble.
- **Only flag real problems.** Skip anything that's fine.
`;

export const reviewSkill: GstackSkill = {
  name: 'review',
  description:
    'Pre-landing PR review: find bugs that pass CI but blow up in production. Auto-fixes mechanical issues, asks about the rest.',
  template: transformSkillContent(rawTemplate),
  group: 'review',
  originalSkillName: 'gstack-review',
  browserRequired: false,
};
