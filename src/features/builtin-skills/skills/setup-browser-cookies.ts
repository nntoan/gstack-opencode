import type { GstackSkill } from '../../../types/skill.ts';
import { transformSkillContent } from '../../skill-adapter/content-transformer.ts';

const rawTemplate = `\`\`\`bash
mkdir -p .gstack/analytics
echo '{"skill":"setup-browser-cookies","ts":"'\$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> .gstack/analytics/skill-usage.jsonl 2>/dev/null || true
\`\`\`

# Setup Browser Cookies

Import logged-in sessions from your real Chromium browser into the headless browse session.

## How it works

1. Ensure the gstack browser daemon is running
2. Run \`cookie-import-browser\` to detect installed browsers and open the picker UI
3. User selects which cookie domains to import in their browser
4. Cookies are decrypted and loaded into the Playwright session

## Steps

### 1. Find the browse binary

> Note: requires gstack browser plugin setup — ensure the browser daemon is running before using \`gstack browse\` commands.

### 2. Open the cookie picker

\`\`\`bash
gstack browse cookie-import-browser
\`\`\`

This auto-detects installed Chromium browsers (Chrome, Arc, Brave, Edge) and opens
an interactive picker UI in your default browser where you can:
- Switch between installed browsers
- Search domains
- Click "+" to import a domain's cookies
- Click trash to remove imported cookies

Tell the user: **"Cookie picker opened — select the domains you want to import in your browser, then tell me when you're done."**

### 3. Direct import (alternative)

If the user specifies a domain directly (e.g., \`/setup-browser-cookies github.com\`), skip the UI:

\`\`\`bash
gstack browse cookie-import-browser comet --domain github.com
\`\`\`

Replace \`comet\` with the appropriate browser if specified.

### 4. Verify

After the user confirms they're done:

\`\`\`bash
gstack browse cookies
\`\`\`

Show the user a summary of imported cookies (domain counts).

## Notes

- First import per browser may trigger a macOS Keychain dialog — click "Allow" / "Always Allow"
- Cookie picker is served on the same port as the browse server (no extra process)
- Only domain names and cookie counts are shown in the UI — no cookie values are exposed
- The browse session persists cookies between commands, so imported cookies work immediately`;

export const setupBrowserCookiesSkill: GstackSkill = {
  name: 'setup-browser-cookies',
  description:
    'Import logged-in sessions from your real Chromium browser (Chrome, Arc, Brave, Edge) into the headless browse session for authenticated testing.',
  template: transformSkillContent(rawTemplate),
  group: 'browser',
  originalSkillName: 'gstack-setup-browser-cookies',
  browserRequired: true,
};
