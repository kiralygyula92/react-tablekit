# Contributing

Thanks for helping improve `react-tablekit`! Bug reports, docs fixes and pull requests are all
welcome.

## Getting started

Requirements: Node 20+ (CI uses 22) and pnpm (run `corepack enable` to use the pinned version).

```sh
git clone https://github.com/kiralygyula92/react-tablekit.git
cd react-tablekit
pnpm install
pnpm dev
```

`pnpm dev` generates what it needs first and starts the site at http://localhost:5173, against the
library source. Playwright needs its browser once:
`pnpm --filter site exec playwright install chromium`.

| Command                     | What it does                                                                    |
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

## Making a change

1. Open an issue first for larger changes, so we can agree on the API before you build it.
2. Create a branch from `main`.
3. Add or update tests: unit and component tests in `packages/react-tablekit/test` (Vitest),
   end-to-end tests in `apps/site/e2e` (Playwright). Coverage stays at core ≥ 90% lines / 85%
   branches and React ≥ 80%, and every fixed bug gets a regression test that names what it guards.
4. Run the checks:

   ```sh
   pnpm verify
   ```

   If you changed the layout, check the locked visual baselines with
   `pnpm --filter site e2e:visual`.

5. Add a changeset for anything users will notice: `pnpm changeset`. Pick `patch` for fixes,
   `minor` for new features and `major` for breaking changes. Every pull request touching the
   library adds one.
6. For public API changes, update the documentation (see below).
7. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, e.g.
   `feat(site): a menu button and a sidebar drawer on narrow screens` or
   `fix(build): keep the TypeDoc dump out of the published dist`.

## Documentation

The site's content lives in [`apps/site/content/react-tablekit`](apps/site/content/react-tablekit):

- **The API reference is generated** from the library's TSDoc. `pnpm docs:check` fails when a
  public symbol has no description.
- **Pages hot-reload** in `pnpm dev`; adding, renaming or deleting one changes the route table, so
  restart the server.
- **URLs never break.** A moved page gets a permanent redirect from
  `migration/url-map.csv`.

After a docs change, `pnpm verify` must pass; it includes the site's conformance checks.

## Design principles

- **Opt-in by default:** new behavior goes behind a prop, so upgrades never change existing
  tables.
- **Zero runtime dependencies** besides the peer dependencies `react` and `react-dom`.
- **Headless core:** the core never imports React.
- **Tokens are the API:** visual CSS in `theme.css` only reads `--tk-*` variables
  (`pnpm --filter react-tablekit lint:css-tokens`).
- **Typed:** no `any` in `src/**` without an `eslint-disable-next-line` and a reason.
- **Accessible:** keyboard operable and labeled; axe checks run in the end-to-end suite.

## Licensing of contributions

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
Only submit code and assets you wrote yourself or that are available under a compatible
permissive license. Note any third-party material in the pull request so it can be added to
`packages/react-tablekit/NOTICE`.

## Code of conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
