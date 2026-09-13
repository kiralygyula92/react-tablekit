# react-tablekit

A production-grade, headless-core React data table: client **and** server modes for every data
feature, replaceable slots, handler middleware and CSS-variable theming. Zero runtime dependencies.

> Status: **1.0.0 is prepared but not published.** Every milestone (M0–M7) is complete and
> `pnpm verify` is green; publishing to npm and deploying the docs site are the remaining steps.
> See `docs/10-roadmap-and-migration.md` for the plan and `docs/adr/` for the decisions taken
> along the way.

## Repository layout

| Path                      | What                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `packages/react-tablekit` | The published library                                                                             |
| `apps/site`               | Demo gallery, playground and API docs (Vite + React 19 + React Router 7), with an MSW mock server |
| `docs/`                   | The specification (00–10) and architecture decision records (`docs/adr`)                          |

## Development

```sh
pnpm install
pnpm dev          # site at http://localhost:5173 (runs against the library source)
pnpm test         # unit + component tests (Vitest)
pnpm e2e          # Playwright (needs `pnpm --filter site exec playwright install chromium` once)
pnpm verify          # every gate: lint, typecheck, test, build, size, package checks, e2e
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## License

MIT — see [LICENSE](LICENSE).
