---
'react-tablekit': patch
---

Cancel the live-region announcer's pending timer and animation frame when the table unmounts. A
table taken off screen inside the 150ms debounce window — a filter that closes the drawer holding
it, a route change on the next keystroke — left both handles running and woke up against a
component that was gone.
