# Releasing

Releases use [Changesets](https://github.com/changesets/changesets) and the `Release` workflow
(`.github/workflows/release.yml`), which runs only by hand.

## One-time setup

1. **npm account:** the unscoped `react-tablekit` name must be free or already owned by the
   publishing npm account. Check with `npm login`, `npm whoami` and `npm view react-tablekit`.
2. **Token:** create an npm _granular access token_ with read and write access to the
   `react-tablekit` package, and add it as the `NPM_TOKEN` repository secret
   (_Settings → Secrets and variables → Actions_). The workflow requests `id-token: write`, so
   the package is published with
   [provenance](https://docs.npmjs.com/generating-provenance-statements).
3. **GitHub:** in _Settings → Actions → General → Workflow permissions_, tick **Allow GitHub
   Actions to create and approve pull requests**. Without it the workflow cannot open the
   "Version Packages" pull request.
4. **Private vulnerability reporting:** turn it on (_Settings → Advanced Security_);
   [SECURITY.md](SECURITY.md) sends reporters there.
5. **Documentation site:** Vercel deploys it on every push to `main`; see
   [Deploying the site](README.md#deploying-the-site).

## Every release

1. Pull requests that touch the library add changesets (`pnpm changeset`).
2. Run **Actions → Release → Run workflow** on `main`. With changesets pending, it opens the
   **Version Packages** pull request; its `pnpm version-packages` step bumps the version, writes
   `CHANGELOG.md` and copies the version into the library's `src/version.ts`.
3. Review and merge that pull request, then run the workflow again. With no changesets pending, it
   publishes straight away, with npm provenance and a GitHub release.

## Before a release, check

- CI is green on `main`.
- `pnpm size && pnpm check:package` passes.
- `pnpm --filter react-tablekit pack --dry-run` lists only `dist/`, `README.md`, `CHANGELOG.md`,
  `LICENSE` and `package.json`.
