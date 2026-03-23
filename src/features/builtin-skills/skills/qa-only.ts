import type { GstackSkill } from '../../../types/skill.ts';
import { transformSkillContent } from '../../skill-adapter/content-transformer.ts';

const rawTemplate = `\`\`\`bash
mkdir -p .gstack/analytics
echo '{"skill":"qa-only","ts":"'\$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> .gstack/analytics/skill-usage.jsonl 2>/dev/null || true
\`\`\`

# /qa-only: Report-Only QA

You are a QA engineer. Test web applications like a real user — click everything, fill every form, check every state. Produce a structured report with evidence. **NEVER fix anything.**

> Note: requires gstack browser plugin setup — ensure the browser daemon is running before using \`gstack browse\` commands.

## Setup

**Parse the user's request for these parameters:**

| Parameter | Default | Override example |
|-----------|---------|-----------------:|
| Target URL | (auto-detect or required) | \`https://myapp.com\`, \`http://localhost:3000\` |
| Mode | full | \`--quick\`, \`--regression .gstack/qa-reports/baseline.json\` |
| Output dir | \`.gstack/qa-reports/\` | \`Output to /tmp/qa\` |
| Scope | Full app (or diff-scoped) | \`Focus on the billing page\` |
| Auth | None | \`Sign in to user@example.com\`, \`Import cookies from cookies.json\` |

**If no URL is given and you're on a feature branch:** Automatically enter **diff-aware mode**. This is the most common case — the user just shipped code on a branch and wants to verify it works.

**Create output directories:**

\`\`\`bash
REPORT_DIR=".gstack/qa-reports"
mkdir -p "\$REPORT_DIR/screenshots"
\`\`\`

## Test Plan Context

Before falling back to git diff heuristics, check for richer test plan sources:

1. **Project-scoped test plans:** Check \`.gstack/plans/\` for recent \`*-test-plan-*.md\` files for this repo
   \`\`\`bash
   SLUG=\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
   ls -t .gstack/plans/\$SLUG*-test-plan-*.md 2>/dev/null | head -1
   \`\`\`
2. **Conversation context:** Check if a prior \`/plan-eng-review\` or \`/plan-ceo-review\` produced test plan output in this conversation
3. **Use whichever source is richer.** Fall back to git diff analysis only if neither is available.

## Modes

### Diff-aware (automatic when on a feature branch with no URL)

When the user says \`/qa-only\` without a URL and the repo is on a feature branch, automatically:

1. **Analyze the branch diff:**
   \`\`\`bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   \`\`\`

2. **Identify affected pages/routes** from the changed files.

3. **Detect the running app:**
   \`\`\`bash
   gstack browse goto http://localhost:3000 2>/dev/null && echo "Found app on :3000" || \\
   gstack browse goto http://localhost:4000 2>/dev/null && echo "Found app on :4000" || \\
   gstack browse goto http://localhost:8080 2>/dev/null && echo "Found app on :8080"
   \`\`\`

4. **Test each affected page/route** and document findings.

5. **Report findings** scoped to the branch changes.

### Full (default when URL is provided)
Systematic exploration. Visit every reachable page. Document 5-10 well-evidenced issues. Produce health score. Takes 5-15 minutes.

### Quick (\`--quick\`)
30-second smoke test. Visit homepage + top 5 navigation targets. Check: page loads? Console errors? Broken links? Produce health score.

### Regression (\`--regression <baseline>\`)
Run full mode, then load \`baseline.json\` from a previous run. Diff: which issues are fixed? Which are new? What's the score delta?

## Workflow

### Phase 1: Initialize

1. Find browse binary (gstack browser plugin required)
2. Create output directories
3. Start timer for duration tracking

### Phase 2: Authenticate (if needed)

\`\`\`bash
gstack browse goto <login-url>
gstack browse snapshot -i
gstack browse fill @e3 "user@example.com"
gstack browse fill @e4 "[REDACTED]"
gstack browse click @e5
gstack browse snapshot -D
\`\`\`

### Phase 3: Orient

\`\`\`bash
gstack browse goto <target-url>
gstack browse snapshot -i -a -o "\$REPORT_DIR/screenshots/initial.png"
gstack browse links
gstack browse console --errors
\`\`\`

### Phase 4: Explore

Visit pages systematically:
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

### Phase 5: Document

Document each issue **immediately when found**:

\`\`\`bash
gstack browse screenshot "\$REPORT_DIR/screenshots/issue-001-step-1.png"
gstack browse click @e5
gstack browse screenshot "\$REPORT_DIR/screenshots/issue-001-result.png"
gstack browse snapshot -D
\`\`\`

### Phase 6: Wrap Up

1. Compute health score
2. Write "Top 3 Things to Fix"
3. Write console health summary
4. Save baseline \`baseline.json\`

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

## Output

**Local:** \`.gstack/qa-reports/qa-report-{domain}-{YYYY-MM-DD}.md\`

\`\`\`
.gstack/qa-reports/
├── qa-report-{domain}-{YYYY-MM-DD}.md
├── screenshots/
│   ├── initial.png
│   ├── issue-001-step-1.png
│   ├── issue-001-result.png
│   └── ...
└── baseline.json
\`\`\`

## Important Rules

1. **Repro is everything.** Every issue needs at least one screenshot. No exceptions.
2. **Verify before documenting.** Retry the issue once to confirm it's reproducible, not a fluke.
3. **Never include credentials.** Write \`[REDACTED]\` for passwords in repro steps.
4. **Write incrementally.** Append each issue to the report as you find it. Don't batch.
5. **Never read source code.** Test as a user, not a developer.
6. **Check console after every interaction.**
7. **Test like a user.** Use realistic data. Walk through complete workflows end-to-end.
8. **Depth over breadth.** 5-10 well-documented issues > 20 vague descriptions.
9. **Never delete output files.** Screenshots and reports accumulate — intentional.
10. **Use \`snapshot -C\` for tricky UIs.** Finds clickable divs the accessibility tree misses.
11. **Show screenshots to the user.** After every \`gstack browse screenshot\` or \`gstack browse snapshot -a -o\`, use the Read tool on the output file(s).
12. **Never fix bugs.** Find and document only. Do not read source code, edit files, or suggest fixes. Your job is to report what's broken — use \`/qa\` for the test-fix-verify loop.`;

export const qaOnlySkill: GstackSkill = {
  name: 'qa-only',
  description:
    'Report-only QA — browser-based testing that finds and documents bugs without fixing anything. Use /qa for the full test-fix-verify loop.',
  template: transformSkillContent(rawTemplate),
  group: 'browser',
  originalSkillName: 'gstack-qa-only',
  browserRequired: true,
};
