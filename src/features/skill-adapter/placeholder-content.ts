/**
 * OpenCode-adapted placeholder content for gstack skill templates.
 * These replace the 9 gstack template placeholders originally resolved by gen-skill-docs.ts.
 */

export const DEFAULT_PLACEHOLDERS: Record<string, string> = {
  PREAMBLE: `You are operating within OpenCode. The gstack plugin provides structured sprint roles.
Analytics are logged to \`.gstack/analytics/skill-usage.jsonl\` in the project directory.
Sessions are tracked in \`.gstack/sessions/\`.
Check \`.gstack/.completeness-intro-seen\` to track first-run intro state.
Check \`.gstack/.telemetry-prompted\` to track telemetry prompt state.`,

  COMMAND_REFERENCE: `Available gstack skills (invoke via slash commands):
/office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /review, /investigate, /design-review, /qa, /qa-only,
/ship, /land-and-deploy, /canary, /benchmark, /document-release, /retro,
/browse, /setup-browser-cookies, /careful, /freeze, /guard, /unfreeze,
/setup-deploy, /upgrade`,

  SNAPSHOT_FLAGS: `--format png --quality 90 --full-page false`,

  BROWSE_SETUP: `Use the gstack browser daemon for web browsing.
Browser state is stored in \`.gstack/browser/browse.json\`.
Console output goes to \`.gstack/browser/console.log\`.
Network requests go to \`.gstack/browser/network.log\`.
Dialog events go to \`.gstack/browser/dialog.log\`.
Use the \`browse\` MCP tool or the browser skill for all web interactions.`,

  BASE_BRANCH_DETECT: `Detect the base branch using git:
\`\`\`bash
git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}' || echo "main"
\`\`\`
Or use: \`git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"\``,

  QA_METHODOLOGY: `QA approach for OpenCode:
1. Open a real browser using the browse skill
2. Navigate to the URL under test
3. Take a screenshot to establish baseline
4. Interact with the UI following the test scenario
5. Assert expected state (elements, text, URL)
6. Take evidence screenshots and save to \`.gstack/evidence/\`
7. For each bug found: file it, fix it, write a regression test, re-verify`,

  DESIGN_METHODOLOGY: `Design review approach:
Rate each design dimension 0-10:
- Visual hierarchy and typography
- Color and contrast (WCAG AA minimum)
- Spacing and layout consistency
- Interactive states (hover, focus, active, disabled)
- Responsive behavior (mobile, tablet, desktop)
- AI slop detection (generic icons, lorem ipsum, placeholder colors)
For each dimension below 7: explain what a 10 looks like, then implement the fix.`,

  REVIEW_DASHBOARD: `Review readiness is tracked in \`.gstack/reviews/dashboard.json\`.
Update the dashboard after each review type completes.
Format:
\`\`\`json
{
  "branch": "<current-branch>",
  "reviews": {
    "code": "pass|fail|pending",
    "design": "pass|fail|pending|n/a",
    "qa": "pass|fail|pending"
  },
  "updated_at": "<ISO timestamp>"
}
\`\`\``,

  TEST_BOOTSTRAP: `Bootstrap tests using the project's existing test runner.
Detect test framework: check package.json for vitest, jest, bun:test.
If no framework exists: install vitest and create vitest.config.ts.
Run tests with: \`bun test\` or \`bun run test\`.
Generate regression tests for every bug fixed during QA.
Target: >90% coverage on changed files.`,
};
