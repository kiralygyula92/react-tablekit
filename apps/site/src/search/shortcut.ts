import { useSyncExternalStore } from 'react';

const noop = () => () => undefined;

function isApplePlatform(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * The search shortcut as the reader's keyboard labels it: "⌘ K" on Apple platforms, "Ctrl K"
 * elsewhere. Both work everywhere (`useHotkey`), but showing Ctrl to a Mac user is wrong. The
 * server has no platform, so it renders "Ctrl K" and the browser corrects it after hydration.
 */
export function useSearchShortcut(): string {
  return useSyncExternalStore(
    noop,
    () => (isApplePlatform() ? '⌘ K' : 'Ctrl K'),
    () => 'Ctrl K',
  );
}

/** The header owns the search palette; anything else asks it to open with this event. */
export const OPEN_SEARCH_EVENT = 'tk-site:open-search';

export function requestSearch(): void {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}
