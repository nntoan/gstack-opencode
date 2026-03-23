import type { GstackSkill } from '../../../types/skill.ts';
import { transformSkillContent } from '../../skill-adapter/content-transformer.ts';

const rawTemplate = `\`\`\`bash
mkdir -p .gstack/analytics
echo '{"skill":"upgrade","ts":"'\$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> .gstack/analytics/skill-usage.jsonl 2>/dev/null || true
\`\`\`

# /upgrade — Upgrade @nntoan/gstack Plugin

Upgrade the \`@nntoan/gstack\` OpenCode plugin to the latest version and show what's new.

## Step 1: Check current version

\`\`\`bash
bun pm ls @nntoan/gstack 2>/dev/null || npm list @nntoan/gstack 2>/dev/null || echo "NOT_INSTALLED"
\`\`\`

If \`NOT_INSTALLED\`, tell the user: "The @nntoan/gstack plugin is not installed in this project. To install: \`bun add @nntoan/gstack\`"

## Step 2: Check latest version on npm

\`\`\`bash
npm view @nntoan/gstack version 2>/dev/null || echo "FETCH_FAILED"
\`\`\`

If \`FETCH_FAILED\`, tell the user: "Could not fetch latest version from npm. Check your network connection."

Compare the current version with the latest. If already up to date: "You're already on the latest version of @nntoan/gstack (v{version}). No upgrade needed."

## Step 3: Ask the user (or auto-upgrade)

If a newer version is available, use AskUserQuestion:

- **Context:** A newer version of @nntoan/gstack is available.
- **Question:** "@nntoan/gstack **v{new}** is available (you're on v{old}). Upgrade now?"
- **RECOMMENDATION:** Choose A to get the latest skills and features.
- A) Yes, upgrade now
- B) Not now

If "Not now": Tell the user "You can upgrade later by running: \`bun update @nntoan/gstack\`"

## Step 4: Upgrade

\`\`\`bash
bun update @nntoan/gstack
\`\`\`

Verify the upgrade succeeded:
\`\`\`bash
bun pm ls @nntoan/gstack 2>/dev/null || npm list @nntoan/gstack 2>/dev/null
\`\`\`

## Step 5: Show changelog

Check if a \`CHANGELOG.md\` exists in the node_modules package directory:

\`\`\`bash
cat node_modules/@nntoan/gstack/CHANGELOG.md 2>/dev/null | head -100 || echo "NO_CHANGELOG"
\`\`\`

If changelog is available, summarize the changes between old and new versions as 3-5 bullets focused on new skills, bug fixes, and breaking changes.

Format:
\`\`\`
@nntoan/gstack v{new} — upgraded from v{old}!

What's new:
- [bullet 1]
- [bullet 2]
- ...

Reload OpenCode to activate the new skills.
\`\`\`

## Important Rules

- Never force-upgrade without user confirmation.
- Always show a version comparison before upgrading.
- If upgrade fails, show the error and suggest manual fix.
- After upgrade, remind the user to reload OpenCode to activate new skills.`;

export const upgradeSkill: GstackSkill = {
  name: 'upgrade',
  description:
    'Upgrade @nntoan/gstack OpenCode plugin to the latest version, check npm for updates, and show what changed.',
  template: transformSkillContent(rawTemplate),
  group: 'browser',
  originalSkillName: 'gstack-upgrade',
  browserRequired: false,
};
