# Roadmap — `@thijsbroersen/vite-plugin-scalajs`

Last updated: 2026-10-17 (maintenance review)

This fork extends the official [scala-js/vite-plugin-scalajs](https://github.com/scala-js/vite-plugin-scalajs) plugin (upstream last release **v1.1.0**, Aug 2025). Published npm package: [`@thijsbroersen/vite-plugin-scalajs`](https://www.npmjs.com/package/@thijsbroersen/vite-plugin-scalajs) at **2.0.x**.

## Positioning

| | Upstream (`scala-js/vite-plugin-scalajs`) | This fork |
|---|-------------------------------------------|-----------|
| npm | Not published under `@scala-js/*` | `@thijsbroersen/vite-plugin-scalajs` |
| Build tools | SBT only | SBT 1.x + **SBT 2.x** + **Mill** |
| Vite | 4–7 (per upstream 1.1.0) | **5–8** (CI matrix 6/7/8) |
| Runtime | Effect-free JS | TypeScript + **Effect** for build-tool dispatch |
| CI | Basic | SBT 1 + SBT 2 fixtures, npm Trusted Publishing |

**Strategic choice:** Keep the fork as the actively maintained line for Mill/SBT 2/multi-project workflows until upstream merges equivalent features or adopts this codebase. Track upstream PRs and cherry-pick resolver/skip-link options where they fit the fork’s architecture.

## GitHub issues (this repository)

**Open issues: none** (as of 2026-10-17).

Use this repo for fork-specific bugs, Mill/SBT 2 regressions, and release requests. Upstream feature parity gaps can be tracked here as labeled issues when work starts.

## Upstream issues — status vs this fork

Open issues on [scala-js/vite-plugin-scalajs](https://github.com/scala-js/vite-plugin-scalajs/issues) and how they map to the fork:

| # | Title | Upstream | Fork status | Notes |
|---|--------|----------|-------------|-------|
| [39](https://github.com/scala-js/vite-plugin-scalajs/issues/39) | SBT 2.0.7 build fails (`/main.js`) | Open; [PR #40](https://github.com/scala-js/vite-plugin-scalajs/pull/40) | **Addressed** | SBT 2 fixture + improved `print` output parsing in `src/sbt.ts`. Users on upstream still blocked; verify edge cases from #39 comments. |
| [24](https://github.com/scala-js/vite-plugin-scalajs/issues/24) | Mill / scala-cli / other build tools | Open | **Partial** | Mill supported; **scala-cli not yet**. |
| [35](https://github.com/scala-js/vite-plugin-scalajs/issues/35) | Skip `fullOptJS` when SBT already linked | Open; [PR #34](https://github.com/scala-js/vite-plugin-scalajs/pull/34) (`scalaJsResolverPlugin`) | **Not yet** | High value for monorepos; port resolver-only mode from upstream PR #34. |
| [21](https://github.com/scala-js/vite-plugin-scalajs/issues/21) / [22](https://github.com/scala-js/vite-plugin-scalajs/pull/22) | Aggregating projects break resolution | Open PR | **Unknown / test gap** | Document workaround (`aggregate := false` on link outputs); add fixture + fix. |
| [19](https://github.com/scala-js/vite-plugin-scalajs/issues/19) / [20](https://github.com/scala-js/vite-plugin-scalajs/pull/20) | `.sbtopts` / colored sbt output breaks parsing | Open | **Partial** | ANSI strip + `-no-colors`; native client / custom `.sbtopts` may still fail. |
| [23](https://github.com/scala-js/vite-plugin-scalajs/issues/23) | TS: cannot find module `scalajs:main.js` | Open | **Not yet** | Ship optional `vite-plugin-scalajs.d.ts` or docs for `uriPrefix` imports. |
| [13](https://github.com/scala-js/vite-plugin-scalajs/issues/13) | Web resources directory layout | Open | **Not yet** | May need Vite `publicDir` / asset hooks. |
| [11](https://github.com/scala-js/vite-plugin-scalajs/issues/11) | `@crxjs/vite-plugin` build order | Open | **Not yet** | `buildStart` `order: 'pre'` / `sequential` (see issue comment). |
| [10](https://github.com/scala-js/vite-plugin-scalajs/issues/10) | Docker | Open | **Not investigated** | Likely PATH/JVM/sbt-in-container docs. |
| [5](https://github.com/scala-js/vite-plugin-scalajs/issues/5) | Stale sbt on PATH | Open | **Partial** | Better errors for old launcher; optional `sbt --version` probe. |
| [4](https://github.com/scala-js/vite-plugin-scalajs/issues/4) | Source maps point to missing files | Open | **Mitigated by Vite ≥ 8.3.1** | Dev dependency bumped to Vite 8.3.x; document peer recommendation. |
| [14](https://github.com/scala-js/vite-plugin-scalajs/issues/14) | Reduce JS bundle size (Closure vs Vite) | Open | **Out of scope (toolchain)** | Track [scala-js/scala-js](https://github.com/scala-js/scala-js) linker work; document Terser/Closure patterns in examples. |

## Recommended phases

### Phase 1 — Stabilize & document (now → next release)

- [x] Dependency maintenance (Vite 8.3.x, Vitest security patch, pnpm 12).
- [x] Release **2.0.9** (maintenance PR #3).
- [x] Snapshot npm publishes on each `main` commit (`release.yml` snapshot mode, dist-tag `snapshot`).
- [ ] Stable release **2.1.0** when validated (tag `v2.1.0`; test via `@snapshot` until then).
- [ ] Add GitHub issue templates + labels (`upstream-parity`, `mill`, `sbt2`, `docs`).
- [x] README: link to roadmap; resolver-only mode documented.

### Phase 2 — High-impact parity with upstream PRs

1. **`scalaJsResolverPlugin` / skip link on build** — [x] `scalajsResolverPlugin`, `outputDir` on projects, `SCALAJS_OUTPUT_DIR` (issue #35 / PR #34).
2. **Aggregation** — [x] `aggregate := false` when reading linker output; fixture `aggregatedProject` in `test/sbt-project` (issue #21 / PR #22).
3. **SBT output robustness** — [x] temp-file capture instead of stdout parsing (PR #38). [ ] `--server` mode (PR #37) — deferred.

### Phase 3 — Developer experience

- TypeScript typings for `projectID:…` / custom `uriPrefix` imports (#23).
- `@crxjs/vite-plugin` compatibility (#11).
- Optional `sbt --version` / launcher path validation (#5, #8).
- Docker getting-started snippet (#10).

### Phase 4 — Build tools & ecosystem

- **scala-cli** support (#24): custom command to resolve link output paths (see [bishabosha comment on #24](https://github.com/scala-js/vite-plugin-scalajs/issues/24#issuecomment-2703105954)).
- Mill 2.x validation when Mill releases breaking changes.
- Consider contributing resolver-only plugin back upstream as a small, reviewable PR.

### Phase 5 — Toolchain upgrades (scheduled)

| Area | Current | Target | Risk |
|------|---------|--------|------|
| Vitest | 4.1.x | 5.x | Medium — run full integration tests |
| Effect | 3.x | 4.x | Medium — API changes in `Match` usage |
| TypeScript | 5.9 | 6.x/7.x | Low–medium |
| Node types | `@types/node` 20 | Align with `engines.node` | Low |
| Dependabot / Renovate | — | Enable weekly devDependency PRs | Low |

## Upstream open PRs to watch

| PR | Author | Relevance |
|----|--------|-----------|
| [#40](https://github.com/scala-js/vite-plugin-scalajs/pull/40) | kaesler | SBT 2.x — compare with fork `sbt.ts` |
| [#38](https://github.com/scala-js/vite-plugin-scalajs/pull/38) | s5bug | Safer sbt output capture |
| [#37](https://github.com/scala-js/vite-plugin-scalajs/pull/37) | cheleb | SBT server mode |
| [#34](https://github.com/scala-js/vite-plugin-scalajs/pull/34) | raquo | Resolver-only / skip link |
| [#22](https://github.com/scala-js/vite-plugin-scalajs/pull/22) | jmcclell | Aggregation |
| [#16](https://github.com/scala-js/vite-plugin-scalajs/pull/16) | v6ak | Multiple subprojects (fork already supports multiple `projects[]`) |

## Success metrics

- CI green on Vite 6, 7, and 8 with SBT 1 + SBT 2 fixtures.
- Zero known regressions vs upstream issue reproducers for #39 and #24 (Mill).
- Documented path for “SBT already ran fullLinkJS” workflows (issue #35).
- Clear issue triage: fork bugs here; upstream notified when fixes should be shared.
