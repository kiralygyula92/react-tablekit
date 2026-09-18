import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';

/** Concatenates class names, skipping falsy values. */
export function cx(...parts: (string | false | null | undefined)[]): string | undefined {
  let out = '';
  for (const p of parts) if (p) out = out ? `${out} ${p}` : p;
  return out || undefined;
}

/** An event that the user can mark to skip the library's own handler. */
export interface TablekitEvent {
  preventTablekitDefault?: () => void;
}

type AnyFn = (...args: unknown[]) => unknown;

/**
 * Chains two event handlers: the user's runs first and may call
 * `event.preventTablekitDefault()` to skip the internal one.
 */
export function chainHandlers(user: AnyFn, internal: AnyFn): AnyFn {
  return (...args: unknown[]) => {
    const event = args[0] as TablekitEvent | undefined;
    let prevented = false;
    if (event && typeof event === 'object') {
      event.preventTablekitDefault = () => {
        prevented = true;
      };
    }
    user(...args);
    // prevented is flipped by the user handler through preventTablekitDefault().
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!prevented) internal(...args);
  };
}

/**
 * Merges prop objects: classNames concatenate, styles shallow-merge, event handlers chain
 * (later objects are "user" handlers that run first), everything else is overridden.
 */
export function mergeProps<T extends Record<string, unknown>>(
  base: T,
  ...overrides: (Record<string, unknown> | undefined)[]
): T {
  let out: Record<string, unknown> = base;
  for (const o of overrides) {
    if (!o) continue;
    out = { ...out };
    for (const [key, value] of Object.entries(o)) {
      if (value === undefined) continue;
      const prev = out[key];
      if (key === 'className') out[key] = cx(prev as string | undefined, value as string);
      else if (key === 'style')
        out[key] = { ...(prev as CSSProperties | undefined), ...(value as CSSProperties) };
      else if (/^on[A-Z]/.test(key) && typeof prev === 'function' && typeof value === 'function') {
        out[key] = chainHandlers(value as AnyFn, prev as AnyFn);
      } else out[key] = value;
    }
  }
  return out as T;
}

/** `useLayoutEffect` on the client, `useEffect` on the server (no SSR warning). */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** A stable callback that always calls the latest version of `fn`. */
export function useEvent<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useIsomorphicLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}

/** Converts a number to px; strings pass through. */
export function toCssSize(value: number | string | undefined): string | undefined {
  return typeof value === 'number' ? `${value}px` : value;
}

/** `true` when the event target is an interactive element inside `container`. */
export function isInteractiveTarget(target: EventTarget | null, container: Element): boolean {
  let el = target as Element | null;
  while (el && el !== container) {
    if (
      el.matches(
        'button, a[href], input, select, textarea, label, summary, [role="button"], [role="checkbox"], [role="menuitem"], [contenteditable="true"], [data-tk-stop]',
      )
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

/** The platform's modifier key label for hotkey hints. */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform;
  return /mac|iphone|ipad|ipod/i.test(platform);
}
