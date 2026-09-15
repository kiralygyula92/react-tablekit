# ADR-001: Headless core, thin React layer, CSS-variable theming

- **Status:** Accepted
- **Date:** 2026-09-11
- **Context documents:** `docs/02-architecture.md`, `docs/06-customization-overrides.md`, `docs/07-theming-styling.md`

## Context

Application code tends to re-implement the same few hundred lines of table rendering, loading,
pagination and sticky-column logic per screen, usually on top of a component framework. A
standalone library must:

- cover that dense, compact look as one of its presets (`classic`) and go well beyond it;
- run every data feature in client **and** server mode;
- let consumers override anything visible or interactive without forking;
- ship with zero runtime dependencies, be SSR-safe and tree-shakeable.

## Decision

1. **Layering.** A framework-agnostic `core` (`src/core`, never imports React; enforced by an ESLint
   rule and a unit test) owns state, the column model, feature modules and the memoized row-model
   pipeline. The React layer (`src/react`) is a thin binding: `useSyncExternalStore` subscriptions,
   context, slot resolution, handler middleware, and default slot components.
2. **Entry levels.** Consumers can enter at four levels: `<DataTable>` with defaults; `<DataTable>`
   with `slots`/`slotProps`/`classNames`/`styles`/`handlers`/`theme`; `useDataTable` + composable
   parts; or `useDataTable` + fully custom markup.
3. **Overrides.** Every sub-component is a slot that receives fully computed props (a replacement
   that spreads props keeps all behaviour), and `useTableSlots().defaults` exposes the defaults for
   wrapping. Every interaction dispatches through a named handler `(ctx, next) => …`, so overrides
   can augment, modify, cancel or defer the default.
4. **Styling.** Plain CSS inside `@layer tablekit.base, tablekit.theme`. Base holds structure only;
   theme reads only `--tk-*` tokens (enforced by `scripts/check-css-tokens.mjs`). State is exposed via
   data attributes. Unlayered consumer CSS always wins without `!important`. Presets are both CSS
   files (zero JS) and JS theme objects (tokens become inline CSS variables).
5. **Packaging.** tsup builds ESM + CJS + `.d.ts` per subpath (`.`, `./core`, `./meta`,
   `./locales/*`); the React entry carries a `"use client"` banner, `core` does not. CSS is built by
   Lightning CSS into `styles.css`, `base.css` and `presets/*.css`.
6. **Monorepo.** pnpm workspaces: `packages/react-tablekit` (published) and `apps/site` (private
   demo + docs), which consumes the library from source through Vite aliases.

## Consequences

- Logic is testable in Node without a DOM; the React layer stays small.
- The public surface is large (class names, CSS variables, data attributes, slot/handler names and
  localization keys are all semver-covered), so naming discipline matters from day one.
- Tree-shaking of feature modules with the all-in-one component still has to be measured
  (09 §4); the outcome will be recorded in a follow-up ADR.

## Tooling versions chosen at scaffold time

- **TypeScript 6.0** rather than 7.x: TS 7 is the native port without the JS compiler API that
  typescript-eslint and TypeDoc rely on (their peer ranges stop at `<6.1` / `6.0.x`).
- **ESLint 9**: `eslint-plugin-jsx-a11y` does not yet declare ESLint 10 support.
- **React Router 7** for the site, as specified in 02 §2, although v8 is available.
- **pnpm 11**, as installed; build scripts are allow-listed via `allowBuilds` in `pnpm-workspace.yaml`.
