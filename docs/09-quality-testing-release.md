# 09: Quality, Testing, Packaging and Release

## 1. Test pyramid

| Layer | Tool | Location | Scope |
|---|---|---|---|
| Core unit | Vitest (node) | `packages/react-tablekit/test/core/**` | Row-model pipeline, every feature API, fns registries, `getPageItems`, updater semantics, memo invalidation, query building, data-source adapter (fake timers + fake fetch) |
| Property tests | Vitest + `fast-check` (devDependency) | `test/property/**` | Client vs simulated-server equivalence (03 §9.1); sorting stability; filter commutativity; pagination invariants (the union of all pages equals the filtered set, with no duplicates) |
| Type tests | Vitest `expectTypeOf` | `test/types/**` | `ColumnDef` value inference from `accessorKey`/`accessorFn`, `DeepKeys` paths, registry augmentation, slot prop types, handler ctx types, `Updater` |
| React component | Vitest (jsdom) + Testing Library + `user-event` | `test/react/**` | Rendering per slot, controlled/uncontrolled, handlers middleware, keyboard, focus management, live-region messages, SSR render (`renderToString` without errors or `window` access) |
| A11y unit | `vitest-axe` | alongside component tests | No violations for each feature configuration |
| E2E | Playwright (Chromium, Firefox, WebKit) | `apps/site/e2e/**` | Every example page smoke test; scripted journeys (search → filter → sort → paginate → select → bulk action; expand/collapse; resize; reorder; export) |
| Visual regression | Playwright `toHaveScreenshot` | `apps/site/e2e/visual/**` | Parity pages at 375/768/1280/1440 widths, light/dark/classic, key states (loading, overlay, empty, error, selected row under a pinned column, hover, focus ring) |
| A11y e2e | `@axe-core/playwright` | every page | Zero serious/critical violations |
| Performance | Vitest bench + Playwright traces | `test/bench/**` | Budgets in §4 (informational in PRs, gating on main with a 20% tolerance) |

Coverage gate: **≥ 90% lines / 85% branches for `core`**, and ≥ 80% for `react`.

## 2. Mandatory test cases (checklist)

- [ ] `getPageItems` table from 05 §4.4 (and regression tests for legacy bug B1).
- [ ] Every bug from 01 §10 has a named regression test (`B1`–`B19`).
- [ ] Controlled vs uncontrolled for each state slice; `on*Change` receives updater functions; `reset*` behaviour.
- [ ] Auto page reset rules (client) and data-source page reset rules (server).
- [ ] Debounce + min length + abort + race (server).
- [ ] Hybrid dev warnings.
- [ ] Selection: single/multi/range/cascade/disabled/exclusion model.
- [ ] Expansion: lazy mounting, lazy children, single mode.
- [ ] Pinning: offsets are computed correctly for mixed widths; the RTL flip.
- [ ] Handlers: next() / next(modified) / cancel / async / composition order (provider → props).
- [ ] Slots: a replacement receives the computed props; `useTableSlots().defaults` wrapping works; the ref is forwarded.
- [ ] `classNames`/`styles`/`slotProps` merging and event-handler chaining with `preventTablekitDefault`.
- [ ] Localization: no hard-coded English. A test renders with a pseudo-locale (every string wrapped `⟦…⟧`) and asserts that no visible text node lacks the markers (except data).
- [ ] Theme: every visual CSS declaration in `theme.css` uses a `var(--tk-*)` (lint script); tokens resolve in all presets.
- [ ] Keyboard grid navigation per the 05 §15 table.
- [ ] Virtualization: aria-rowcount/rowindex, scrollToRow, dynamic heights.
- [ ] CSV: quoting, BOM, excluded columns, server chunking cancel.
- [ ] SSR: rendering with `ssrBreakpoint`, no hydration mismatch in the site's SSR smoke test (a Vite SSR entry used only for tests).

## 3. Visual parity process (Skimmer 1:1)

1. **Reference screenshots.** Capture the four Skimmer screens (Customer List, Pool List, Pool History, the Body-of-Water modal) at 1440×900 and 390×844 in the real app, with deterministic data: the same seeded customers as the demo mock (export the generator output to JSON and load it into a local Skimmer build via its mock/emulator), or at least use them as side-by-side references. Store them in `apps/site/e2e/visual/reference/skimmer/` (they're reference images, not test baselines).
2. **Build the parity pages** until they match the references on a side-by-side review page (`/examples/parity-*?compare=1` overlays the reference with an opacity slider). This is a dev-only feature of the site.
3. **Lock the baselines.** Once they're approved, Playwright baselines for the parity pages become the regression gate (`maxDiffPixelRatio: 0.001`).
4. Allowed deviations (documented on the pages): the fixed bugs from 01 §10 (e.g. pagination ellipses, the focus ring), the font rendering differences between MUI's Typography and plain CSS (≤1px), and the icons (in-house SVGs vs FontAwesome/MUI icons with the same size and colour).

## 4. Budgets

| Metric | Budget |
|---|---|
| `react-tablekit` full import, min+gz (JS) | ≤ 38 kB |
| `react-tablekit/core`, min+gz | ≤ 16 kB |
| Basic usage (`DataTable` + sorting + pagination only, tree-shaken, measured via size-limit `import { DataTable }`) | ≤ 24 kB |
| `styles.css`, min+gz | ≤ 7 kB |
| Initial render 50×10 (jsdom bench) | ≤ 16 ms |
| Client sort of 10k rows | ≤ 50 ms |
| Client filter of 10k rows (global search) | ≤ 30 ms |
| 100k virtualized rows scroll | No long tasks > 50ms in a Playwright trace during a 2s scroll |

Feature modules must be tree-shakeable. For example, the `Grouping` code is not included when it's never referenced. The mechanism: `DataTable` lazily requires features based on the options via static imports in a `features/index.ts` with side-effect-free modules. If that isn't achievable with the all-in-one component, provide `DataTableLite` + explicit `features` prop and document it. The builder should measure and decide, and record the decision in `docs/adr/`.

## 5. Code quality gates (CI on every PR)

1. `pnpm lint` (ESLint strict-type-checked, jsx-a11y, no `any` in `src/**` except in an explicit `// eslint-disable-next-line` with a reason).
2. `pnpm typecheck` (library + site + type tests).
3. `pnpm test` (unit + component + property, with coverage gates).
4. `pnpm build` (library + site).
5. `pnpm size` (size-limit).
6. `pnpm e2e` (Playwright on Chromium in PRs, all 3 browsers on main).
7. `pnpm docs:check` (TypeDoc validation: every export documented).
8. `publint` + `@arethetypeswrong/cli` on the packed tarball (verifies the exports map, ESM/CJS types).
9. The Changeset presence check for library changes.

## 6. Packaging

- tsup config: `entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts', meta: 'src/meta.ts', 'locales/*': ... }`, `format: ['esm','cjs']`, `dts: true`, `sourcemap: true`, `treeshake: true`, `splitting: true` (ESM), `target: 'es2020'`, `external: ['react','react-dom']`. JSX is `react-jsx`.
- CSS: concatenate `base.css` + `theme.css` + the light tokens into `dist/styles.css`, copy the presets, minify with Lightning CSS, and keep the layer declarations.
- `"use client"` banner on the React entry (for Next.js App Router). `core` has no banner.
- `package.json` fields: `exports` (02 §8), `types`, `sideEffects: ["**/*.css"]`, `engines: { node: ">=18" }`, `keywords` (react, table, datagrid, data-table, headless, typescript, pagination, sorting, filtering, virtualization), `repository`, `homepage` (the docs site), `license: MIT`, `funding` (optional).
- The README in the package covers install, the 20-line quick start (client + server), links to the docs, the browser support list, and bundle size badges.
- Browser support: the last 2 versions of evergreen browsers, Safari ≥ 15.4 (the `:has` fallback isn't required; `@layer` and `inset` support are the baseline). Documented.

## 7. Versioning and release

- **Changesets.** Every PR touching the library adds a changeset. The `release.yml` workflow on main opens a "Version Packages" PR; merging it publishes to npm with provenance (`npm publish --provenance --access public`) and creates a GitHub release.
- **Semver policy (documented):** public API = everything in 04, class names, CSS variable names, data attributes, slot names, handler names and localization keys. Changing or removing any of these is a major change. Token default *values* may change in minors except in the `classic` preset, whose values are frozen (parity guarantee).
- Pre-releases: `next` dist-tag via `changeset pre enter next`.
- Deprecations: `@deprecated` TSDoc and a dev-only console warning once per session, removed in the next major.
- The docs site is versioned per major (a `/v1/` path when v2 ships).

## 8. Repository hygiene

- `CONTRIBUTING.md` (setup, scripts, test policy, commit convention: Conventional Commits).
- `docs/adr/` for Architecture Decision Records. The first ADRs: headless-core + CSS variables; own engine vs TanStack; tree-shaking strategy; the handler middleware design.
- Issue templates (bug with a reproduction link to the playground URL, feature request).
- `LICENSE` (MIT unless the owner decides otherwise; confirm with the owner before the first publish).
- Renovate/Dependabot for devDependencies.
