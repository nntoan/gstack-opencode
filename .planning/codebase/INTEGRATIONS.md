# Integrations

## OpenCode host integration

This project is primarily an OpenCode plugin and CLI. The plugin boundary is implemented in:

- `src/index.ts`
- `src/plugin-interface.ts`

The runtime exposes host-facing handlers for chat events, tool hooks, config mutation, and session cleanup. This is the most important external platform integration in the repo.

## MCP providers

The MCP adapter surface is assembled in `src/mcp/index.ts`. Current built-in providers are:

### Remote MCP services

- `websearch` via `src/mcp/websearch.ts`
  - Exa endpoint by default: `https://mcp.exa.ai/mcp?tools=web_search_exa`
  - Optional Tavily endpoint: `https://mcp.tavily.com/mcp/`
  - Auth via `EXA_API_KEY` or `TAVILY_API_KEY` / config override

- `context7` via `src/mcp/context7.ts`
  - Endpoint: `https://mcp.context7.com/mcp`
  - Optional auth via `CONTEXT7_API_KEY` or config override

- `grep_app` via `src/mcp/grep-app.ts`
  - Endpoint: `https://mcp.grep.app`

### Local MCP processes

- `contexthub` via `src/mcp/contexthub.ts`
  - Command: `npx -y @aisuite/chub`

- `backlog_md` via `src/mcp/backlog-md.ts`
  - Command: `npx -y backlog mcp start`

MCP clients are created and retried through `src/features/skill-mcp-manager/connection.ts`, which supports local, stdio, and remote transport types.

## Backlog and planning integration

`src/features/sprint-backlog/index.ts` turns the backlog MCP provider into higher-level capabilities:

- backlog client access
- think/plan task creation
- build status updates
- ship-readiness checks

This means backlog is not just a tool dependency; it is part of the plugin's workflow model.

## Browser automation integration

The Playwright-based browser daemon under `src/features/browser-daemon/` is an internal subsystem but integrates with:

- local Chromium-family browsers
- local filesystem state for daemon logs and auth state
- optional macOS-specific cookie import and browser-launch flows

Important files:

- `src/features/browser-daemon/server.ts`
- `src/features/browser-daemon/browser-manager.ts`
- `src/features/browser-daemon/cookie-import-browser.ts`

## GitHub and release infrastructure

GitHub Actions provide CI and release automation:

- `.github/workflows/ci.yml` — tests, typecheck, build, lint
- `.github/workflows/release-please.yml` — Release Please driven versioning and publish flow
- `.github/workflows/publish.yml` — manual publish fallback
- `.github/workflows/publish-platform.yml` — platform binary package build and publish matrix

Release automation integrates with:

- GitHub Releases
- npm publishing with provenance
- Release Please (`googleapis/release-please-action@v4`)

See `RELEASE.md` for the human-facing release process.

## Package registry integration

The repo publishes:

- main package: `@nntoan/gstack`
- platform packages under `packages/`, published through the platform workflow

`publish-platform.yml` checks npm registry state before republishing platform artifacts.

## Configuration and credential touchpoints

Environment variables and secrets referenced by integrations include:

- `EXA_API_KEY`
- `TAVILY_API_KEY`
- `CONTEXT7_API_KEY`
- GitHub Actions secrets such as `NPM_TOKEN`, `NODE_AUTH_TOKEN`, and `GITHUB_TOKEN`

## What is not present

From the repository sources inspected, there is no evidence of:

- a first-party application database
- a backend HTTP API owned by this repo
- OAuth login flows for end users
- external SaaS telemetry ingestion from runtime code

The external surface is mostly platform/tool integration rather than product-domain API integration.
