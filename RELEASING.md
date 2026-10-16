# Releasing

A release is a version bump merged to `main` plus a `v*` tag on that commit. Pushing the tag runs
the `Release` workflow (`.github/workflows/release.yml`), which tests and builds the library and
stages it on npm through [trusted publishing](https://docs.npmjs.com/trusted-publishers). No npm
token exists anywhere, and every version carries
[provenance](https://docs.npmjs.com/generating-provenance-statements). A staged version goes live
only after a maintainer approves it on npmjs.com with a passkey.

## How it is wired

- **npm:** `@kingtech/react-tablekit` trusts this repository's `release.yml`, run in the `npm`
  environment, for staged publishing only, and its publishing access requires two-factor
  authentication and disallows tokens. Check with `npm trust list @kingtech/react-tablekit`.
- **GitHub:** the `npm` environment accepts deployments from `v*` tags only, and a ruleset stops
  anyone but an admin from creating, moving or deleting those tags. The workflow also refuses a
  tag that isn't on `main` or doesn't match the version in `packages/react-tablekit/package.json`.
- **Private vulnerability reporting** is on; [SECURITY.md](SECURITY.md) sends reporters there.
- **Documentation site:** Vercel deploys it on every push to `main`; see
  [Deploying the site](README.md#deploying-the-site).

## Every release

1. Check that CI is green on `main`, then pick the bump from the commits since the last tag:
   `patch` for fixes, `minor` for features, `major` when a commit is marked breaking (`feat!:`).
2. Bump the version on a release branch:

   ```sh
   cd packages/react-tablekit
   npm version patch --no-git-tag-version   # or minor, major
   git switch -c release/vX.Y.Z
   ```

   The package's `version` script copies the new version into `src/version.ts`; a unit test fails
   if the two drift apart.

3. Add a `## X.Y.Z` section at the top of `packages/react-tablekit/CHANGELOG.md`, written from
   `git log vPREVIOUS..HEAD --oneline`. Keep the heading to the bare version, because the site's
   release feed only reads headings of that form.
4. Commit as `release: vX.Y.Z`, open a pull request and merge it once CI passes.
5. Tag the merged commit on `main` and push the tag:

   ```sh
   git switch main && git pull --ff-only
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

6. When **Actions → Release** finishes, approve the staged version on npmjs.com (_Staged
   Packages_), then create the GitHub release from the changelog section:
   `gh release create vX.Y.Z --title vX.Y.Z --notes-file <section.md>`.

Tags can't be moved and npm never accepts a version number twice, so if a release run fails, fix
the cause and release the next patch version.

## Before a release, check

- `pnpm size && pnpm check:package` passes.
- `pnpm --filter react-tablekit pack --dry-run` lists only `dist/`, `README.md`, `CHANGELOG.md`,
  `LICENSE` and `package.json`.
