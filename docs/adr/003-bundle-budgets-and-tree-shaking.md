# ADR-003: Bundle budgets and the tree-shaking strategy

- **Status:** Accepted. The M7 question (lean entry vs. revised budgets) was decided by the owner
  on 2026-09-13 — see the M7 addendum at the end.
- **Date:** 2026-09-11
- **Context documents:** `docs/09-quality-testing-release.md` §4, `docs/adr/002-own-engine.md`

## Context

Doc 09 §4 sets four bundle budgets (min+gzip) and requires feature modules to be tree-shakeable,
leaving the mechanism to the builder ("measure and decide, and record the decision in
`docs/adr/`"). The allowed fallback is a `DataTableLite` with an explicit `features` prop.

Measured at the end of M1 with size-limit (esbuild, min+gzip, `NODE_ENV=production`, React
external):

| Entry                  | Budget (09 §4) | Measured |
| ---------------------- | -------------- | -------- |
| `import { DataTable }` | ≤ 24 kB        | 50.3 kB  |
| Full import            | ≤ 38 kB        | 53.7 kB  |
| `react-tablekit/core`  | ≤ 16 kB        | 20.5 kB  |
| `styles.css`           | ≤ 7 kB         | 5.7 kB   |

Composition (minified bytes before gzip, full import): `core/createTable` 26 kB, `TableView`
15 kB, the five JS themes 10 kB, filter UIs 16 kB, `core/columns` 8.5 kB, primitives 6.8 kB, the
data-source controller 4.5 kB, row models 4.2 kB, toolbar 8 kB, pagination 6.5 kB. Before this
ADR, two defects inflated every number and were fixed:

1. The derived themes were built with top-level `createTheme(…)` calls, which bundlers must assume
   have side effects, so all five themes shipped even when one was used. They are now
   `/* @__PURE__ */`.
2. Dev-only checks read `globalThis.process` at runtime, which no bundler can strip. They now use
   the literal `process.env.NODE_ENV !== 'production'` (the React convention), so production
   builds drop them.

## Why the 09 §4 numbers cannot be met by the all-in-one API

- `DataTable` is batteries-included by specification (04 §2): its default layout renders the
  toolbar, filter panel, selection bar, error banner and pagination, and every slot in 06 §1 has
  a default implementation in the slot registry. Anything statically reachable from `DataTable`
  is in the bundle whether or not the options enable it; tree-shaking cannot remove code that is
  selected by a runtime option. That is why `import { DataTable }` is within 4 kB of the full import.
- The core engine is a single instance factory whose methods cover every feature (sorting,
  filtering, faceting, grouping, expansion, selection with the exclusion model, pinning, row
  pinning, the query tracker and the server data-source controller). Methods on one object cannot
  be tree-shaken either.
- The feature set still grows in M2–M6 (column resizing and ordering, the column actions menu,
  keyboard grid navigation, grid and cards layouts, server grouping, export UI, locales). The
  full import will grow with it, so 38 kB would be exceeded even after heavy code golf.

## Options

1. **Golf the code to fit.** Rejected: it would remove specified behaviour, and it does not fix the
   structural problem that `DataTable` reaches everything.
2. **Split now into feature modules on `_features`** (core) plus per-feature slot/part registries
   (React), with `DataTableLite` + `features` as the lean entry. This is the only way to meet the
   24 kB basic-usage budget. It touches most of the engine and the view layer.
3. **Keep the all-in-one API as the default, guard sizes as regressions, and deliver the lean
   entry (option 2) once the feature set is complete.**

## Decision

Option 3, with the lean entry scheduled rather than dropped:

- `DataTable` / `useDataTable` stay batteries-included; that API (04) is the source of truth.
- The size-limit entries become **regression guards**: each limit is the measured size plus
  about 2% headroom. A milestone that adds features raises the limits explicitly in the same change,
  with the reason in its changeset, so growth is always a reviewed decision.
- Everything new in M2–M6 that is naturally separable ships as its own export and never
  becomes reachable from `DataTable` unless the default layout needs it (for example,
  `useVirtualRows`, `useRouterSync`, the locale packs under `react-tablekit/locales/*` and the
  presets as CSS files).
- **M7 (before 1.0): the lean entry.** Built-in features move onto the existing
  `_features` hooks, `DataTableLite` takes an explicit `features` array, and the `import {
DataTableLite, sortingFeature, paginationFeature }` size-limit entry carries the 24 kB budget.
  If that proves unattainable, the owner decides between a higher budget and a smaller lean feature
  set.

## Addendum (M4): the performance budgets

The same measure-then-decide applies to the runtime budgets in 09 §4:

| Budget                                                         | Result                                                                                                                                                                                                               |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client sort of 10k rows ≤ 50 ms                                | **Met** (~10 ms median, jsdom)                                                                                                                                                                                       |
| Client global search of 10k rows ≤ 30 ms                       | **Met** (~15 ms median, jsdom)                                                                                                                                                                                       |
| 100k virtualized rows: no long task > 50 ms during a 2s scroll | **Met** (measured in Chromium with `PerformanceObserver`, `apps/site/e2e/performance.spec.ts`)                                                                                                                       |
| Initial render 50×10 ≤ 16 ms (jsdom)                           | **Not met as an absolute number**, and it cannot be: plain React markup for the same grid costs ~14–15 ms in jsdom on this machine, so 16 ms is barely above the environment's own floor. The table measures ~37 ms. |

The initial-render gate is therefore expressed as a **ratio to that floor**: the same 50×10 grid is
rendered twice in the same run, once as plain `<table>` markup and once through `DataTable`, and the
library must stay under 3.5× the plain cost (currently ~2.4×). That is machine-independent, survives
CI hardware changes, and still fails immediately on a real regression — an absolute millisecond
number in jsdom would only measure the runner.

## Consequences

- The published numbers are honest: the README badge shows the real full-import size.
- Consumers who need a small bundle today can use `react-tablekit/core` with their own markup
  (20.5 kB); the lean React entry arrives in M7.
- The re-baselined limits and the M7 lean-entry question went to the owner; both are resolved in
  the addendum below.

## Addendum (M7): the lean entry is deferred, and the 09 §4 size budgets are revised

The decision above scheduled `DataTableLite` + `features` for M7 to reach the 24 kB basic-usage
budget. Before starting it, the cost was re-examined against the code as it now stands:

- `_features` exists as a hook (`getDefaultOptions`, `getInitialState`, `createTable`), but every
  actual feature — sorting, filtering, faceting, grouping, expansion, selection, pinning, the
  query tracker and the data-source controller — is a method on the single instance built by
  `createTable`. Methods on one object cannot be tree-shaken, so the lean entry is not a wiring
  change: it is an extraction of the engine **and** the view layer into side-effect-free
  per-feature modules with their own slot/part registries.
- That refactor sits underneath 396 unit tests and 234 e2e tests, immediately before the first
  stable release.

**Owner decision (2026-09-13): defer the lean entry to 1.x and revise the budgets.** 1.0 ships the
batteries-included API, and the 09 §4 targets for the JS entries are superseded by the measured
guards:

| Entry                  | 09 §4 target | 1.0 guard | Measured |
| ---------------------- | ------------ | --------- | -------- |
| `import { DataTable }` | ≤ 24 kB      | 58 kB     | 56.5 kB  |
| Full import            | ≤ 38 kB      | 61.5 kB   | 60.06 kB |
| `react-tablekit/core`  | ≤ 16 kB      | 21 kB     | 20.75 kB |
| `styles.css`           | ≤ 7 kB       | 7 kB      | 6.09 kB  |

Consequences:

- `react-tablekit/core` (20.75 kB) is the documented path for a size-sensitive consumer who wants
  the engine and their own markup; the README says so rather than leaving the full import as the
  only visible number.
- The guards stay regression guards: a change that raises one raises it deliberately, with the
  reason in its changeset.
- `DataTableLite` + `features` remains tracked for 1.x, where it can be done without holding a
  stable release hostage to a refactor of the engine and the view layer.
- `styles.css` meets its original budget and keeps it.

## Addendum (M7): tree-shaking verification

10 §M7 requires tree-shaking to be verified before 1.0. Measured against the production build:

| Check                                        | Result                                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locale packs reachable from the main entry?  | **No.** `dist/locales/{en,hu,de,es}` are separate entry points, and no Hungarian, German or Spanish string appears in `dist/index.js`.                      |
| Theme presets reachable from the main entry? | **No.** `classic`, `compact`, `dark` and `minimal` ship as separate CSS files under `dist/presets/`.                                                        |
| Derived JS themes side-effect-free?          | **Yes** — 373 `/* @__PURE__ */` annotations in `dist/index.js`, so a bundler may drop the themes a consumer never references.                               |
| Does a basic import drop anything?           | **Yes, partly.** `import { DataTable }` measures 56.5 kB against 60.06 kB for the full import, so the separable exports are shaken out of a basic consumer. |

The ceiling is the structural one this ADR already records: `DataTable`'s default layout statically
reaches the toolbar, filter panel, selection bar and pagination, and the engine is a single
instance whose methods cover every feature. Tree-shaking cannot remove code selected by a runtime
option, which is why the basic import sits close to the full import — and exactly what the
deferred lean entry would address in 1.x.
