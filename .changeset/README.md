# Changesets

Every PR that changes `packages/react-tablekit` must add a changeset:

```sh
pnpm changeset
```

Pick the bump by what the change does to the public API: the exported names and types, plus the
`tk-*` class names, the `--tk-*` variables, the `data-*` attributes, and the slot, handler and
localization key names.

- **major** — changing or removing any of those.
- **minor** — something new: a prop, an export, a slot, a token. Token default *values* may also
  change in a minor, except in the `classic` preset, whose values are frozen.
- **patch** — a fix that changes none of the above.

A deprecation is marked `@deprecated` in TSDoc, warns once per session in development, and is
removed in the next major.
