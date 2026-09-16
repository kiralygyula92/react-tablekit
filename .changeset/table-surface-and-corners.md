---
'react-tablekit': minor
---

Add `surface` and `rounded`: the panel the table sits on, and its corners.

By default the table and its pagination share one bordered, filled, rounded panel — the seam
between them is removed so they read as a single card. That is the right default on a bare page
and the wrong one inside a dialog, a dashboard tile or any section that already has a frame,
where it puts a second border around the first.

`surface="plain"` removes the panel. The table stands on whatever the page provides and the
pagination becomes a separate block beneath it rather than the bottom of a card.

```tsx
<DataTable surface="plain" data={rows} columns={columns} />
```

`rounded` switches the outer corners: `true` on a card, `false` on a plain surface, and either
can be set explicitly. The radius itself stays the `--tk-radius` token, so this is a switch
rather than a measurement — and it is applied as that token, because a resolved theme writes its
tokens as inline styles and no stylesheet rule can outrank those.

The scroll container is still there in plain mode: sticky headers and pinned columns are
positioned against it. Only its border, fill and shadow are removed.
