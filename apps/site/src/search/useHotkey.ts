import { useEffect } from 'react';

/**
 * Ctrl+K / Cmd+K opens the palette from anywhere. A table on the page registers the same
 * combination on `document`, which bubbles before `window`, so when a table has claimed the
 * event the palette stands down and the table's own search wins.
 */
export function useHotkey(open: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'k' || !(event.ctrlKey || event.metaKey)) return;
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      open();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);
}
