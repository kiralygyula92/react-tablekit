# AGENTS.md

Instructions for AI coding agents working in this repository. Claude Code reads them through
`CLAUDE.md`. Humans: see [CONTRIBUTING.md](CONTRIBUTING.md).

## What this repo is

A pnpm monorepo:

- `packages/react-tablekit`: the published library `react-tablekit`, a headless-core React data
  table with client and server modes, slots, handler middleware and CSS-variable theming.
- `apps/site`: the documentation site (prerendered guides, live demos, playground, generated
  reference), which doubles as the Playwright test bed.
- `apps/site/api`: the one serverless function, for per-page social images.

## Rules

1. **Backwards-compatible defaults.** New behavior is opt-in behind a prop; changing a default is a
   breaking change.
2. **Generic and app-agnostic.** No app-specific coupling in the package: integration points are
   props, slots, handlers or CSS variables.
3. **Zero runtime dependencies.** Only the peer dependencies `react` and `react-dom`.
4. **Headless core.** The core never imports React.
5. **Tokens are the API.** Visual CSS in `theme.css` only reads `--tk-*` variables
   (`pnpm --filter react-tablekit lint:css-tokens`).
6. **Strict TypeScript:** no `any` in `src/**` without an `eslint-disable-next-line` and a reason;
   every public symbol has TSDoc (`pnpm docs:check`).
7. **Every behavior has an automated test:** Vitest (core ≥ 90% lines / 85% branches,
   React ≥ 80%) or Playwright against the site. Every fixed bug gets a regression test that names
   what it guards.
8. **Accessibility is required:** keyboard operable, labeled, visible focus; axe must pass.
9. **Only original or permissively licensed material.** Third-party code or assets need a
   compatible license and an entry in `packages/react-tablekit/NOTICE`.

## Workflow

- Run `pnpm verify` before committing.
- Conventional Commits (`feat(site): …`, `fix(build): …`), small and focused.
- Every pull request touching the library adds a changeset (`pnpm changeset`): `patch` for fixes,
  `minor` for features, `major` for breaking changes.
- Public API changes: TSDoc on the export, `pnpm docs:check`, and the matching page in
  `apps/site/content/react-tablekit`.
- A moved page needs a permanent redirect in
  `apps/site/content/react-tablekit/migration/url-map.csv`.
- Never publish to npm, push tags or bump versions yourself; releases go through the Release
  workflow (see [RELEASING.md](RELEASING.md)).
