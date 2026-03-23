import type { GstackSkill } from '../../../types/skill.ts';
import { transformSkillContent } from '../../skill-adapter/content-transformer.ts';

const rawTemplate = `\`\`\`bash
mkdir -p .gstack/analytics
echo '{"skill":"browse","ts":"'\$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'\$(basename "\$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> .gstack/analytics/skill-usage.jsonl 2>/dev/null || true
\`\`\`

# browse: QA Testing & Dogfooding

Persistent headless Chromium. First call auto-starts (~3s), then ~100ms per command.
State persists between calls (cookies, tabs, login sessions).

> Note: requires gstack browser plugin setup — ensure the browser daemon is running before using \`gstack browse\` commands.

## Core QA Patterns

### 1. Verify a page loads correctly
\`\`\`bash
gstack browse goto https://yourapp.com
gstack browse text                          # content loads?
gstack browse console                       # JS errors?
gstack browse network                       # failed requests?
gstack browse is visible ".main-content"    # key elements present?
\`\`\`

### 2. Test a user flow
\`\`\`bash
gstack browse goto https://app.com/login
gstack browse snapshot -i                   # see all interactive elements
gstack browse fill @e3 "user@test.com"
gstack browse fill @e4 "password"
gstack browse click @e5                     # submit
gstack browse snapshot -D                   # diff: what changed after submit?
gstack browse is visible ".dashboard"       # success state present?
\`\`\`

### 3. Verify an action worked
\`\`\`bash
gstack browse snapshot                      # baseline
gstack browse click @e3                     # do something
gstack browse snapshot -D                   # unified diff shows exactly what changed
\`\`\`

### 4. Visual evidence for bug reports
\`\`\`bash
gstack browse snapshot -i -a -o /tmp/annotated.png   # labeled screenshot
gstack browse screenshot /tmp/bug.png                # plain screenshot
gstack browse console                                # error log
\`\`\`

### 5. Find all clickable elements (including non-ARIA)
\`\`\`bash
gstack browse snapshot -C                   # finds divs with cursor:pointer, onclick, tabindex
gstack browse click @c1                     # interact with them
\`\`\`

### 6. Assert element states
\`\`\`bash
gstack browse is visible ".modal"
gstack browse is enabled "#submit-btn"
gstack browse is disabled "#submit-btn"
gstack browse is checked "#agree-checkbox"
gstack browse is editable "#name-field"
gstack browse is focused "#search-input"
gstack browse js "document.body.textContent.includes('Success')"
\`\`\`

### 7. Test responsive layouts
\`\`\`bash
gstack browse responsive /tmp/layout        # mobile + tablet + desktop screenshots
gstack browse viewport 375x812              # or set specific viewport
gstack browse screenshot /tmp/mobile.png
\`\`\`

### 8. Test file uploads
\`\`\`bash
gstack browse upload "#file-input" /path/to/file.pdf
gstack browse is visible ".upload-success"
\`\`\`

### 9. Test dialogs
\`\`\`bash
gstack browse dialog-accept "yes"           # set up handler
gstack browse click "#delete-button"        # trigger dialog
gstack browse dialog                        # see what appeared
gstack browse snapshot -D                   # verify deletion happened
\`\`\`

### 10. Compare environments
\`\`\`bash
gstack browse diff https://staging.app.com https://prod.app.com
\`\`\`

### 11. Show screenshots to the user
After \`gstack browse screenshot\`, \`gstack browse snapshot -a -o\`, or \`gstack browse responsive\`, always use the Read tool on the output PNG(s) so the user can see them. Without this, screenshots are invisible.

## User Handoff

When you hit something you can't handle in headless mode (CAPTCHA, complex auth, multi-factor
login), hand off to the user:

\`\`\`bash
# 1. Open a visible Chrome at the current page
gstack browse handoff "Stuck on CAPTCHA at login page"

# 2. Tell the user what happened (via AskUserQuestion)
#    "I've opened Chrome at the login page. Please solve the CAPTCHA
#     and let me know when you're done."

# 3. When user says "done", re-snapshot and continue
gstack browse resume
\`\`\`

**When to use handoff:**
- CAPTCHAs or bot detection
- Multi-factor authentication (SMS, authenticator app)
- OAuth flows that require user interaction
- Complex interactions the AI can't handle after 3 attempts

The browser preserves all state (cookies, localStorage, tabs) across the handoff.
After \`resume\`, you get a fresh snapshot of wherever the user left off.

## Snapshot Flags

The snapshot is your primary tool for understanding and interacting with pages.

\`\`\`
-i        --interactive           Interactive elements only (buttons, links, inputs) with @e refs
-c        --compact               Compact (no empty structural nodes)
-d <N>    --depth                 Limit tree depth (0 = root only, default: unlimited)
-s <sel>  --selector              Scope to CSS selector
-D        --diff                  Unified diff against previous snapshot (first call stores baseline)
-a        --annotate              Annotated screenshot with red overlay boxes and ref labels
-o <path> --output                Output path for annotated screenshot (default: <temp>/browse-annotated.png)
-C        --cursor-interactive    Cursor-interactive elements (@c refs — divs with pointer, onclick)
\`\`\`

All flags can be combined freely. \`-o\` only applies when \`-a\` is also used.
Example: \`gstack browse snapshot -i -a -C -o /tmp/annotated.png\`

**Ref numbering:** @e refs are assigned sequentially (@e1, @e2, ...) in tree order.
@c refs from \`-C\` are numbered separately (@c1, @c2, ...).

After snapshot, use @refs as selectors in any command:
\`\`\`bash
gstack browse click @e3       gstack browse fill @e4 "value"     gstack browse hover @e1
gstack browse html @e2        gstack browse css @e5 "color"      gstack browse attrs @e6
gstack browse click @c1       # cursor-interactive ref (from -C)
\`\`\`

**Output format:** indented accessibility tree with @ref IDs, one element per line.
\`\`\`
  @e1 [heading] "Welcome" [level=1]
  @e2 [textbox] "Email"
  @e3 [button] "Submit"
\`\`\`

Refs are invalidated on navigation — run \`snapshot\` again after \`goto\`.

## Full Command List

### Navigation
| Command | Description |
|---------|-------------|
| \`back\` | History back |
| \`forward\` | History forward |
| \`goto <url>\` | Navigate to URL |
| \`reload\` | Reload page |
| \`url\` | Print current URL |

### Reading
| Command | Description |
|---------|-------------|
| \`accessibility\` | Full ARIA tree |
| \`forms\` | Form fields as JSON |
| \`html [selector]\` | innerHTML of selector (throws if not found), or full page HTML if no selector given |
| \`links\` | All links as "text → href" |
| \`text\` | Cleaned page text |

### Interaction
| Command | Description |
|---------|-------------|
| \`click <sel>\` | Click element |
| \`cookie <name>=<value>\` | Set cookie on current page domain |
| \`cookie-import <json>\` | Import cookies from JSON file |
| \`cookie-import-browser [browser] [--domain d]\` | Import cookies from Chrome, Arc, Brave, or Edge |
| \`dialog-accept [text]\` | Auto-accept next alert/confirm/prompt |
| \`dialog-dismiss\` | Auto-dismiss next dialog |
| \`fill <sel> <val>\` | Fill input |
| \`header <name>:<value>\` | Set custom request header |
| \`hover <sel>\` | Hover element |
| \`press <key>\` | Press key — Enter, Tab, Escape, ArrowUp/Down/Left/Right, Backspace, etc. |
| \`scroll [sel]\` | Scroll element into view, or scroll to page bottom if no selector |
| \`select <sel> <val>\` | Select dropdown option by value, label, or visible text |
| \`type <text>\` | Type into focused element |
| \`upload <sel> <file> [file2...]\` | Upload file(s) |
| \`useragent <string>\` | Set user agent |
| \`viewport <WxH>\` | Set viewport size |
| \`wait <sel|--networkidle|--load>\` | Wait for element, network idle, or page load (timeout: 15s) |

### Inspection
| Command | Description |
|---------|-------------|
| \`attrs <sel|@ref>\` | Element attributes as JSON |
| \`console [--clear|--errors]\` | Console messages (--errors filters to error/warning) |
| \`cookies\` | All cookies as JSON |
| \`css <sel> <prop>\` | Computed CSS value |
| \`dialog [--clear]\` | Dialog messages |
| \`eval <file>\` | Run JavaScript from file and return result as string |
| \`is <prop> <sel>\` | State check (visible/hidden/enabled/disabled/checked/editable/focused) |
| \`js <expr>\` | Run JavaScript expression and return result as string |
| \`network [--clear]\` | Network requests |
| \`perf\` | Page load timings |
| \`storage [set k v]\` | Read all localStorage + sessionStorage as JSON, or set key value |

### Visual
| Command | Description |
|---------|-------------|
| \`diff <url1> <url2>\` | Text diff between pages |
| \`pdf [path]\` | Save as PDF |
| \`responsive [prefix]\` | Screenshots at mobile (375x812), tablet (768x1024), desktop (1280x720) |
| \`screenshot [--viewport] [--clip x,y,w,h] [selector|@ref] [path]\` | Save screenshot |

### Snapshot
| Command | Description |
|---------|-------------|
| \`snapshot [flags]\` | Accessibility tree with @e refs. Flags: -i -c -d N -s sel -D -a -o path -C |

### Meta
| Command | Description |
|---------|-------------|
| \`chain\` | Run commands from JSON stdin |

### Tabs
| Command | Description |
|---------|-------------|
| \`closetab [id]\` | Close tab |
| \`newtab [url]\` | Open new tab |
| \`tab <id>\` | Switch to tab |
| \`tabs\` | List open tabs |

### Server
| Command | Description |
|---------|-------------|
| \`handoff [message]\` | Open visible Chrome at current page for user takeover |
| \`restart\` | Restart server |
| \`resume\` | Re-snapshot after user takeover, return control to AI |
| \`status\` | Health check |
| \`stop\` | Shutdown server |`;

export const browseSkill: GstackSkill = {
  name: 'browse',
  description:
    'Persistent headless Chromium browser — real clicks, real screenshots, ~100ms per command. Core QA patterns, snapshot flags, and full command reference.',
  template: transformSkillContent(rawTemplate),
  group: 'browser',
  originalSkillName: 'gstack-browse',
  browserRequired: true,
};
