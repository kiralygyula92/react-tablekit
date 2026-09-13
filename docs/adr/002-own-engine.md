# ADR-002: Build our own table engine instead of wrapping TanStack Table

- **Status:** Accepted
- **Date:** 2026-09-11
- **Context documents:** `docs/02-architecture.md` §4, `docs/03-data-modes-client-server.md`, `docs/04-api-reference.md`

## Context

TanStack Table is the de-facto headless table engine, and much of our API vocabulary
(`manualX`, `getRowModel`, `Updater`, features) deliberately feels familiar to its users. We could
build the React layer on top of it. The alternative is an in-house engine with the same shape.

## Options

1. **Wrap `@tanstack/table-core`.** Mature, well tested, familiar.
2. **Own engine** modelled on the same concepts.

## Decision

Option 2: an in-house engine.

## Rationale

- **Zero runtime dependencies** is a hard requirement (README principle 5). Depending on
  `@tanstack/table-core` would break it.
- **The server-mode surface is first class here and absent there.** The normalized `TableQuery`,
  the consolidated `onQueryChange`, the `dataSource` adapter (debounce, min length, abort, race
  guard, dedupe, server echo, out-of-range correction), lazy children, server faceting and the
  "select all matching" exclusion model (03 §5–6) all have to integrate with state, auto-reset rules
  and the row-model pipeline. Bolting them onto an external engine means working around its
  internals (for example, its selection model is ids-only and has no exclusion mode).
- **The API in 04 is the source of truth**, and it diverges in places (`dataMode` / `xMode` aliases,
  `sortServerKey`, `sortValue`, responsive `pin`, `static` columns, `getPageItems`,
  `getSelectionQuery`, `refresh`/`invalidate`/optimistic row updates). Wrapping would leak TanStack
  types or require a full adapter layer, which costs about as much as owning the engine.
- **Bundle budgets** (core ≤ 16 kB, basic usage ≤ 24 kB min+gz) are easier to meet and to
  tree-shake when we control module boundaries.
- **Stability of the public API.** Our semver guarantees (09 §7) must not depend on another
  project's major-version cadence.

## Consequences

- We own correctness. Mitigations: ≥ 90% line / 85% branch coverage on `core`, property tests
  (client vs simulated-server equivalence, sort stability, pagination invariants) and a named
  regression test for every Skimmer bug B1–B19.
- The design borrows TanStack's proven concepts (feature objects, memoized row-model stages,
  `Updater`, controlled/uncontrolled slices), which keeps migration familiar for its users. No code
  is copied.
- Custom features remain possible through `options._features`.
