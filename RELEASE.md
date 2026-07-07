# Release process

This package is published to npm as [`@thijsbroersen/vite-plugin-scalajs`](https://www.npmjs.com/package/@thijsbroersen/vite-plugin-scalajs).

## Versioning and tags

Releases use [semantic versioning](https://semver.org/) aligned with git tags:

| Git tag | npm dist-tag | Example |
|---------|--------------|---------|
| `vX.Y.Z` | `latest` | `v2.0.6` |
| `vX.Y.Z-beta.N` | `beta` | `v2.1.0-beta.1` |
| `vX.Y.Z-rc.N` | `beta` | `v2.1.0-rc.1` |

There are no automatic publishes from `main`. Only pushing a `v*` tag triggers [`.github/workflows/release.yml`](.github/workflows/release.yml).

## Publishing a stable release

1. Bump `version` in [`package.json`](package.json) on `main`.
2. Commit and push to `main`.
3. Create and push a matching tag:

   ```bash
   git tag v2.0.6
   git push origin v2.0.6
   ```

4. The release workflow will:
   - Verify the tag matches `package.json` (e.g. tag `v2.0.6` → version `2.0.6`)
   - Run tests (including sbt 1.x and 2.x fixtures)
   - Build TypeScript output
   - Publish to npm with the `latest` dist-tag

## Publishing a pre-release

1. Set a pre-release version in `package.json`, e.g. `2.1.0-beta.1`.
2. Commit, push, and tag:

   ```bash
   git tag v2.1.0-beta.1
   git push origin v2.1.0-beta.1
   ```

3. The workflow publishes with `--tag beta` so `latest` is unchanged.

Install pre-releases with:

```bash
pnpm add -D @thijsbroersen/vite-plugin-scalajs@beta
```

## First-time npm setup

### 1. Confirm the package name

Scoped packages under your npm username are available without creating an organization:

- Package: `@thijsbroersen/vite-plugin-scalajs`
- Registry: https://registry.npmjs.org/

### 2. First publish (one time)

Trusted Publishing requires the package to exist on npm. Publish once locally:

```bash
pnpm install
pnpm build
pnpm publish --access public --no-git-checks
```

You must be logged in as `thijsbroersen` (`npm login`).

### 3. Configure Trusted Publishing (recommended)

After the first publish, set up OIDC so GitHub Actions can publish without a long-lived `NPM_TOKEN`:

1. Open the package on [npmjs.com](https://www.npmjs.com/package/@thijsbroersen/vite-plugin-scalajs) → **Settings** → **Trusted Publisher**
2. Choose **GitHub Actions**
3. Set:
   - **Organization or user:** `thijsbroersen`
   - **Repository:** `vite-plugin-scalajs`
   - **Workflow filename:** `release.yml` (must match exactly, including `.yml`)
   - **Environment:** leave empty unless you use a GitHub Environment

Requirements for CI publishes:

- GitHub-hosted runner (`ubuntu-latest`)
- Workflow permission `id-token: write`
- Publish step uses **`npm publish`** — npm Trusted Publishing only supports the npm CLI, not `pnpm publish`
- pnpm is still used for install, build, and test; only the final upload uses npm
- npm ≥ 11.5.1 (upgraded in `release.yml`)

Verify your Trusted Publisher settings on npm match exactly:

| Field | Value |
|-------|--------|
| User/org | `thijsbroersen` |
| Repository | `vite-plugin-scalajs` |
| Workflow filename | `release.yml` |
| Environment | empty (unless you use a GitHub Environment) |

### 4. Fallback: NPM_TOKEN

If Trusted Publishing fails, add an npm automation token as repository secret `NPM_TOKEN` and set it before publish:

```bash
pnpm config set "//registry.npmjs.org/:_authToken" "${NPM_TOKEN}"
pnpm publish --access public --no-git-checks --provenance
```

## Local dry-run

Inspect what would be published without uploading:

```bash
pnpm pack
tar -tzf thijsbroersen-vite-plugin-scalajs-*.tgz
```

The tarball should contain `dist/`, `package.json`, `README.md`, and `LICENSE` only (no `src/` or `test/`).

## Troubleshooting

| Problem | Likely cause |
|---------|----------------|
| `Tag vX.Y.Z does not match package.json` | Forgot to bump `version` before tagging |
| `grep: invalid option` in release workflow | Pattern `-(beta|…)` passed to grep — fixed with bash `[[ =~ ]]` |
| `ERR_PNPM_AUTH_TOKEN_EXCHANGE` / `Skipped OIDC` | Use `npm publish` for CI — pnpm OIDC exchange is not supported by npm Trusted Publishing |
| `E404` / `ENEEDAUTH` on CI publish | Trusted Publisher workflow/repo mismatch — see table in section 3 |
| `E422` provenance / `repository.url` mismatch | `package.json` `repository.url` must match GitHub owner casing exactly (e.g. `ThijsBroersen`, not `thijsbroersen`) |
