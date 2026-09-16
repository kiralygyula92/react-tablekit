# react-tablekit

A production-grade, headless-core React data table: client **and** server modes for every data
feature, replaceable slots, handler middleware and CSS-variable theming. Zero runtime dependencies.

> Status: **1.0.0 is prepared but not published.** Every milestone (M0–M7) is complete, the
> documentation site is built and deploy-ready, and `pnpm verify` is green; publishing to npm and
> pointing Vercel at this repository are the remaining steps.
> See `docs/10-roadmap-and-migration.md` for the plan and `docs/adr/` for the decisions taken
> along the way.

## Repository layout

| Path                      | What                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `packages/react-tablekit` | The published library                                                                              |
| `apps/site`               | The documentation site: 84 prerendered pages, 53 live demos, playground and generated reference    |
| `docs/`                   | The specification (00–10), architecture decisions (`docs/adr`) and the docs standard (`docs/ppds`) |
| `api/`                    | The one serverless function: per-page social images                                                |

## Development

```sh
pnpm install
pnpm dev          # site at http://localhost:5173 (runs against the library source)
pnpm test         # unit + component tests (Vitest)
pnpm e2e          # Playwright (needs `pnpm --filter site exec playwright install chromium` once)
pnpm verify          # every gate: lint, typecheck, test, build, size, package checks, e2e
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## Deploying the site

The site is a static build plus one edge function, configured entirely by `vercel.json` — build
command, output directory, trailing-slash canonicalisation, cache headers and 132 permanent
redirects generated from `apps/site/content/react-tablekit/migration/url-map.csv`.

```sh
pnpm --filter react-tablekit build && pnpm docs:json && pnpm --filter site build
```

That is the command Vercel runs. It produces `apps/site/dist`: an HTML document per route with
its metadata in `<head>`, the Markdown twin of every page, `llms.txt`, `sitemap.xml`,
`robots.txt` and `changelog.xml`.

**One setting.** `VITE_SITE_ORIGIN` is the origin canonical URLs, social images and the machine
surface are built from. On Vercel it defaults to the project's own production domain, so a first
deployment is correct without configuring anything; set it explicitly once a custom domain is in
place.

```sh
pnpm --filter site conformance   # the 26 conformance checks, against the built site
pnpm --filter site exec node scripts/check-redirects.mjs   # every redirect, against a running server
```

## License

MIT — see [LICENSE](LICENSE).
