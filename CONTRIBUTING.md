# Contributing

## Setup

- Node ≥ 20 (CI uses 22) and pnpm 11 (`corepack enable` picks up the `packageManager` field).
- `pnpm install`
- `pnpm --filter site exec playwright install chromium` (once, for e2e)

## Scripts (repo root)

| Script                      | What it does                                                                    |
| --------------------------- | ------------------------------------------------------------------------------- |
| `pnpm dev`                  | Starts the site against the library source                                      |
| `pnpm lint` / `pnpm format` | ESLint (strict, type-checked, react-hooks, jsx-a11y) / Prettier                 |
| `pnpm typecheck`            | `tsc` for the library (including tests) and the site                            |
| `pnpm test`                 | Vitest: library (jsdom, with coverage gates and type tests) and site unit tests |
| `pnpm build`                | Library (tsup + CSS) and site (Vite)                                            |
| `pnpm size`                 | size-limit budgets for every entry point                                        |
| `pnpm check:package`        | `publint` + `@arethetypeswrong/cli` on the packed tarball                       |
| `pnpm e2e`                  | Playwright smoke, journeys, axe and visual tests                                |
| `pnpm verify`               | All of the above, in CI order                                                   |

`verify` runs `pnpm --filter site build:data` first: the generated reference and content data
under `apps/site/src/generated/` is not committed, so lint and typecheck would otherwise run
against files a clean checkout does not have.

## Policies

- **Tests alongside code.** Core ≥ 90% lines / 85% branches, React ≥ 80%. Every fixed bug gets
  a regression test that names what it guards.
- **Tokens are the API.** Visual CSS in `theme.css` must only read `--tk-*` variables
  (`pnpm --filter react-tablekit lint:css-tokens`).
- **Core never imports React.**
- **No `any` in `src/**`** without an `eslint-disable-next-line` and a reason.
- **Changesets.** Every PR touching the library adds one (`pnpm changeset`).
- **Commits** follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).

## Releasing

Publishing to npm is manual. When a version is ready, run **Actions → Release → Run workflow** on
`main`. With changesets pending it opens the "Version Packages" pull request; merge that, then run
the workflow again to publish. With none pending, it publishes straight away, with npm provenance
and a GitHub release. It needs the `NPM_TOKEN` repository secret.

The documentation site is separate: Vercel deploys it on every push to `main`.
