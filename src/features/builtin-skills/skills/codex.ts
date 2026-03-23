import type { GstackSkill } from '../../../types/skill.ts';
import { transformSkillContent } from '../../skill-adapter/content-transformer.ts';

const rawTemplate = `\`\`\`bash
mkdir -p .gstack/analytics
echo '{"skill":"codex","ts":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","repo":"'"$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")"'"}'  >> .gstack/analytics/skill-usage.jsonl 2>/dev/null || true
\`\`\`

# gstack browse: QA Testing & Dogfooding

Persistent headless Chromium. First call auto-starts (~3s), then ~100-200ms per command.
Auto-shuts down after 30 min idle. State persists between calls (cookies, tabs, sessions).

## SETUP (run this check BEFORE any browse command)

The browse binary requires the gstack plugin setup script to build.
Run the setup script to enable browse functionality: the plugin will detect
and build the browse binary automatically. If unavailable, browse commands
will not function.

Once built, use the compiled binary via Bash: \`gstack browse <command>\`

- NEVER use \`mcp__claude-in-chrome__*\` tools. They are slow and unreliable.
- Browser persists between calls — cookies, login sessions, and tabs carry over.
- Dialogs (alert/confirm/prompt) are auto-accepted by default — no browser lockup.
- **Show screenshots:** After \`gstack browse screenshot\`, \`gstack browse snapshot -a -o\`, or \`gstack browse responsive\`, always use the Read tool on the output PNG(s) so the user can see them. Without this, screenshots are invisible.

## QA Workflows

### Test a user flow (login, signup, checkout, etc.)

\`\`\`bash
# 1. Go to the page
gstack browse goto https://app.example.com/login

# 2. See what's interactive
gstack browse snapshot -i

# 3. Fill the form using refs
gstack browse fill @e3 "test@example.com"
gstack browse fill @e4 "password123"
gstack browse click @e5

# 4. Verify it worked
gstack browse snapshot -D              # diff shows what changed after clicking
gstack browse is visible ".dashboard"  # assert the dashboard appeared
gstack browse screenshot /tmp/after-login.png
\`\`\`

### Verify a deployment / check prod

\`\`\`bash
gstack browse goto https://yourapp.com
gstack browse text                          # read the page — does it load?
gstack browse console                       # any JS errors?
gstack browse network                       # any failed requests?
gstack browse js "document.title"           # correct title?
gstack browse is visible ".hero-section"    # key elements present?
gstack browse screenshot /tmp/prod-check.png
\`\`\`

### Dogfood a feature end-to-end

\`\`\`bash
# Navigate to the feature
gstack browse goto https://app.example.com/new-feature

# Take annotated screenshot — shows every interactive element with labels
gstack browse snapshot -i -a -o /tmp/feature-annotated.png

# Find ALL clickable things (including divs with cursor:pointer)
gstack browse snapshot -C

# Walk through the flow
gstack browse snapshot -i          # baseline
gstack browse click @e3            # interact
gstack browse snapshot -D          # what changed? (unified diff)

# Check element states
gstack browse is visible ".success-toast"
gstack browse is enabled "#next-step-btn"
gstack browse is checked "#agree-checkbox"

# Check console for errors after interactions
gstack browse console
\`\`\`

### Test responsive layouts

\`\`\`bash
# Quick: 3 screenshots at mobile/tablet/desktop
gstack browse goto https://yourapp.com
gstack browse responsive /tmp/layout

# Manual: specific viewport
gstack browse viewport 375x812     # iPhone
gstack browse screenshot /tmp/mobile.png
gstack browse viewport 1440x900    # Desktop
gstack browse screenshot /tmp/desktop.png

# Element screenshot (crop to specific element)
gstack browse screenshot "#hero-banner" /tmp/hero.png
gstack browse snapshot -i
gstack browse screenshot @e3 /tmp/button.png

# Region crop
gstack browse screenshot --clip 0,0,800,600 /tmp/above-fold.png

# Viewport only (no scroll)
gstack browse screenshot --viewport /tmp/viewport.png
\`\`\`

### Test file upload

\`\`\`bash
gstack browse goto https://app.example.com/upload
gstack browse snapshot -i
gstack browse upload @e3 /path/to/test-file.pdf
gstack browse is visible ".upload-success"
gstack browse screenshot /tmp/upload-result.png
\`\`\`

### Test forms with validation

\`\`\`bash
gstack browse goto https://app.example.com/form
gstack browse snapshot -i

# Submit empty — check validation errors appear
gstack browse click @e10                        # submit button
gstack browse snapshot -D                       # diff shows error messages appeared
gstack browse is visible ".error-message"

# Fill and resubmit
gstack browse fill @e3 "valid input"
gstack browse click @e10
gstack browse snapshot -D                       # diff shows errors gone, success state
\`\`\`

### Test dialogs (delete confirmations, prompts)

\`\`\`bash
# Set up dialog handling BEFORE triggering
gstack browse dialog-accept              # will auto-accept next alert/confirm
gstack browse click "#delete-button"     # triggers confirmation dialog
gstack browse dialog                     # see what dialog appeared
gstack browse snapshot -D                # verify the item was deleted

# For prompts that need input
gstack browse dialog-accept "my answer"  # accept with text
gstack browse click "#rename-button"     # triggers prompt
\`\`\`

### Test authenticated pages (import real browser cookies)

\`\`\`bash
# Import cookies from your real browser (opens interactive picker)
gstack browse cookie-import-browser

# Or import a specific domain directly
gstack browse cookie-import-browser comet --domain .github.com

# Now test authenticated pages
gstack browse goto https://github.com/settings/profile
gstack browse snapshot -i
gstack browse screenshot /tmp/github-profile.png
\`\`\`

### Compare two pages / environments

\`\`\`bash
gstack browse diff https://staging.app.com https://prod.app.com
\`\`\`

### Multi-step chain (efficient for long flows)

\`\`\`bash
echo '[
  ["goto","https://app.example.com"],
  ["snapshot","-i"],
  ["fill","@e3","test@test.com"],
  ["fill","@e4","password"],
  ["click","@e5"],
  ["snapshot","-D"],
  ["screenshot","/tmp/result.png"]
]' | gstack browse chain
\`\`\`

## Quick Assertion Patterns

\`\`\`bash
# Element exists and is visible
gstack browse is visible ".modal"

# Button is enabled/disabled
gstack browse is enabled "#submit-btn"
gstack browse is disabled "#submit-btn"

# Checkbox state
gstack browse is checked "#agree"

# Input is editable
gstack browse is editable "#name-field"

# Element has focus
gstack browse is focused "#search-input"

# Page contains text
gstack browse js "document.body.textContent.includes('Success')"

# Element count
gstack browse js "document.querySelectorAll('.list-item').length"

# Specific attribute value
gstack browse attrs "#logo"    # returns all attributes as JSON

# CSS property
gstack browse css ".button" "background-color"
\`\`\`

## Snapshot System

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

## Command Reference

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
| \`cookie-import-browser [browser] [--domain d]\` | Import cookies from Comet, Chrome, Arc, Brave, or Edge |
| \`dialog-accept [text]\` | Auto-accept next alert/confirm/prompt |
| \`dialog-dismiss\` | Auto-dismiss next dialog |
| \`fill <sel> <val>\` | Fill input |
| \`header <name>:<value>\` | Set custom request header |
| \`hover <sel>\` | Hover element |
| \`press <key>\` | Press key — Enter, Tab, Escape, ArrowUp/Down/Left/Right, Backspace, Delete, etc. |
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
| \`storage [set k v]\` | Read all localStorage + sessionStorage as JSON, or set a value |

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
| \`snapshot [flags]\` | Accessibility tree with @e refs for element selection |

### Meta
| Command | Description |
|---------|-------------|
| \`chain\` | Run commands from JSON stdin. Format: [["cmd","arg1",...],...]|

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
| \`stop\` | Shutdown server |

## Tips

1. **Navigate once, query many times.** \`goto\` loads the page; then \`text\`, \`js\`, \`screenshot\` all hit the loaded page instantly.
2. **Use \`snapshot -i\` first.** See all interactive elements, then click/fill by ref. No CSS selector guessing.
3. **Use \`snapshot -D\` to verify.** Baseline → action → diff. See exactly what changed.
4. **Use \`is\` for assertions.** \`is visible .modal\` is faster and more reliable than parsing page text.
5. **Use \`snapshot -a\` for evidence.** Annotated screenshots are great for bug reports.
6. **Use \`snapshot -C\` for tricky UIs.** Finds clickable divs that the accessibility tree misses.
7. **Check \`console\` after actions.** Catch JS errors that don't surface visually.
8. **Use \`chain\` for long flows.** Single command, no per-step CLI overhead.
`;

export const codexSkill: GstackSkill = {
  name: 'codex',
  description:
    'QA testing & dogfooding with persistent headless Chromium. Navigate, click, fill forms, take screenshots, assert element states, and verify deployments with real browser automation.',
  template: transformSkillContent(rawTemplate),
  group: 'review',
  originalSkillName: 'gstack',
  browserRequired: true,
};
