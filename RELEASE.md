# Release Process

This project uses [Release Please](https://github.com/googleapis/release-please) for automated versioning and changelogs, with npm token-based authentication for publishing.

## How It Works

1. Push commits to `main` using [Conventional Commits](#conventional-commits)
2. Release Please automatically opens a **Release PR** that:
   - Analyzes commits since the last release
   - Determines the version bump (patch/minor/major)
   - Updates `package.json` version
   - Generates/updates `CHANGELOG.md`
3. Review and merge the Release PR
4. On merge, the `release-please.yml` workflow automatically:
   - Creates a GitHub release with the computed tag
   - Builds and publishes the main `@nntoan/gstack` package to npm
   - Triggers platform binary builds and publishes `@nntoan/gstack-*` packages

## First Release

Before automated releases work, perform the initial publish manually:

1. Verify `package.json`:
   - Version is `0.0.1`
   - Package name is `@nntoan/gstack`
   - Repository, author, and keywords are correct

2. Authenticate with npm:

   ```bash
   npm login
   ```

3. Build and publish:

   ```bash
   bun run build:all
   npm publish --access public --provenance
   ```

4. Configure GitHub repository secrets:
   - `NPM_TOKEN` — npm access token with publish permissions (used by `publish.yml` and `release-please.yml`)
   - `NODE_AUTH_TOKEN` — npm access token for platform package publishing (used by `publish-platform.yml`)

   > These can be the same token. Two secret names exist for workflow isolation.

5. Push a commit to `main` — Release Please will begin tracking conventional commits.

## Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `fix:` — patch version bump
- `feat:` — minor version bump
- `feat!:` or `fix!:` — breaking change (major bump, or minor bump pre-1.0)
- `docs:`, `chore:`, `ci:`, `test:` — no version bump (still tracked in changelog)

### Pre-1.0 Versioning

While version is `0.x.x`, breaking changes bump the **minor** version (`bump-minor-pre-major: true`).

### Commit Examples

```
fix: resolve task tracking issue
feat: add global task support
feat!: change task management API
chore: update dependencies
```

## Manual Releases

For hotfixes or bypassing Release Please, use the **Publish (Manual)** workflow:

1. Go to **Actions** → **Publish (Manual)** → **Run workflow**
2. Choose dry run mode or dist tag as needed
3. The workflow reads the current `package.json` version, publishes to npm, creates a git tag and GitHub release

> **Important**: Do not use the manual workflow for regular releases. Let Release Please manage versioning to keep the changelog and tags consistent.

## Force a Specific Version

Use the `Release-As` footer in a commit message:

```bash
git commit --allow-empty -m "chore: release 2.0.0" -m "Release-As: 2.0.0"
```

Release Please will open a PR for version `2.0.0` regardless of commit types.

## Release Configuration

- `release-please-config.json` — Release Please settings (release type, versioning strategy, changelog sections)
- `.release-please-manifest.json` — Current version tracker

## Workflows

| Workflow               | Trigger                                  | Purpose                                                |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------ |
| `release-please.yml`   | Push to `main`                           | Opens Release PRs, publishes on merge                  |
| `publish.yml`          | Manual (`workflow_dispatch`)             | Fallback for hotfixes outside Release Please           |
| `publish-platform.yml` | Called by `release-please.yml` or manual | Builds and publishes platform-specific binary packages |

## Do Not

- Manually edit Release Please PRs
- Manually create GitHub releases (use workflows instead)
- Run `npm version` to bump versions (Release Please owns versioning)
- Mix manual and automated releases without checking version consistency
