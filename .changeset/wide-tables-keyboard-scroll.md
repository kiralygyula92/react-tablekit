---
'react-tablekit': patch
---

Make an overflowing table container reachable by keyboard.

A table wider than its container scrolls horizontally, but the scroll container itself was not
focusable — so a keyboard user with no focusable cell content had no way to reach the columns off
screen. WCAG 2.1.1 requires a scrollable region to be operable by keyboard, and axe reports it as
`scrollable-region-focusable`.

The container already measures its own overflow for the pinned-column shadows, so it now carries
`tabindex="0"` exactly while there is something to scroll, in either axis. A table that fits does
not become an extra tab stop.

It surfaced when the documentation site started rendering the showcase tables inside a narrower
column: the same table that passed full-width failed beside a sidebar.
