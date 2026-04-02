# browser-daemon/

Browser automation server — Playwright-based daemon for screenshots, DOM reads/writes, cookie management, and page navigation. Platform-specific, security-sensitive.

## Structure

```
browser-daemon/
├── index.ts              # Feature barrel
├── server.ts             # HTTP server (startServer, port selection with retry)
├── browser-manager.ts    # BrowserManager class — Playwright context lifecycle
├── cli.ts                # CLI entrypoint for standalone daemon (start/restart/crash recovery)
├── commands.ts           # Command dispatcher (route → handler)
├── read-commands.ts      # Screenshot, DOM read, evaluate
├── write-commands.ts     # Navigate, click, type, select, evaluate-write
├── meta-commands.ts      # Session management commands
├── config.ts             # BrowseConfig from env/defaults
├── platform.ts           # IS_WINDOWS detection, platform branching
├── types.ts              # CommandRequest, CommandResponse, ServerState, etc.
├── buffers.ts            # CircularBuffer<T> for log/output ring buffers
├── snapshot.ts           # Page snapshot serialization
├── find-browse.ts        # Locate browse skill output
├── url-validation.ts     # URL sanitization and validation
├── cookie-import-browser.ts  # macOS Keychain cookie import (security CLI)
├── cookie-picker-routes.ts   # HTTP routes for cookie picker UI
└── cookie-picker-ui.ts       # HTML/JS UI for cookie selection
```

## Where to Look

| Task                  | File                                                               | Notes                                   |
| --------------------- | ------------------------------------------------------------------ | --------------------------------------- |
| Add command           | `commands.ts` dispatch + `read-commands.ts` or `write-commands.ts` | Follow existing switch pattern          |
| Change server startup | `server.ts`                                                        | Port retry loop, request routing        |
| Browser lifecycle     | `browser-manager.ts`                                               | Launch, context create/get, close       |
| Platform workarounds  | `platform.ts`, `cli.ts`                                            | IS_WINDOWS guard, Bun.sleep retries     |
| Cookie import         | `cookie-import-browser.ts`                                         | macOS `security` CLI, CookieImportError |

## Conventions

- Commands are split read vs write — read commands don't mutate page state
- Server binds to localhost only; port selected via retry loop (no hardcoded port)
- `BrowserManager` is injected into server — tests provide fake managers
- Cookie import uses `CookieImportError` with `.action` field (`'retry'` | `'abort'`) for UI-driven error handling

## Anti-Patterns

- **NEVER interpolate user input into shell commands** — all spawn args are hardcoded (see `cookie-import-browser.ts`)
- **Known tech debt**: `.catch(() => {})` on browser close/cleanup calls — errors silently swallowed
- **Known tech debt**: `Bun.sleep(100)` for process timing — fragile on slow CI
- Retry logic is ad-hoc (manual loops) — not using a shared retry helper
- Platform-specific code (`security`, `open` commands) assumes macOS without graceful fallback
