# Changesets

Every PR that changes `packages/react-tablekit` must add a changeset:

```sh
pnpm changeset
```

Pick the bump per the semver policy in `docs/09-quality-testing-release.md` §7. Class names, CSS
variable names, data attributes, slot names, handler names and localization keys are public API.
