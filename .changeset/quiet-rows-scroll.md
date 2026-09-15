---
'react-tablekit': patch
---

Fix: a virtualized table stopped rendering new rows when scrolled.

The body virtualizes inside the table's scroll container, but React attaches that container's ref
only after the body's layout effect has run. `useVirtualRows` looked for its scroll element in that
effect, found nothing, and never tried again — so no scroll listener was attached and the table
kept showing its first window of rows however far it was scrolled. Any table past the
virtualization threshold with a `maxHeight` was affected, as was any use of `useVirtualRows` from
inside its scroll container.

The hook now retries once every ref is attached. An end-to-end test scrolls a 217-row table to its
last row; it fails on the previous release and passes now.
