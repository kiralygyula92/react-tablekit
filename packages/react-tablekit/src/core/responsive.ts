import type { Breakpoint, Breakpoints, ResponsiveValue } from '../themes/types';

/** Breakpoints in ascending order. */
export const BREAKPOINT_ORDER: readonly Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

/** Classic breakpoints: xs 0, sm 600, md 960, lg 1280, xl 1440. */
export const DEFAULT_BREAKPOINTS: Breakpoints = { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1440 };

const RESPONSIVE_KEYS = new Set(['base', ...BREAKPOINT_ORDER]);

/** True when the value is a `{ base, sm, md, … }` object (not a plain value). */
export function isResponsive<T>(
  value: ResponsiveValue<T>,
): value is Exclude<ResponsiveValue<T>, T> & object {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every((k) => RESPONSIVE_KEYS.has(k))
  );
}

/**
 * Resolves a mobile-first responsive value at a breakpoint. The nearest key at or below the
 * breakpoint wins; a key explicitly set to `undefined` means "no value from here up".
 */
export function resolveResponsive<T>(
  value: ResponsiveValue<T>,
  breakpoint: Breakpoint,
  _breakpoints?: Breakpoints,
): T | undefined {
  if (!isResponsive(value)) return value as T;
  const obj = value as Partial<Record<'base' | Breakpoint, T>>;
  const idx = BREAKPOINT_ORDER.indexOf(breakpoint);
  for (let i = idx; i >= 0; i--) {
    const key = BREAKPOINT_ORDER[i]!;
    if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  }
  return obj.base;
}

/** The breakpoint for a viewport width. */
export function breakpointForWidth(
  width: number,
  breakpoints: Breakpoints = DEFAULT_BREAKPOINTS,
): Breakpoint {
  let result: Breakpoint = 'xs';
  for (const bp of BREAKPOINT_ORDER) if (width >= breakpoints[bp]) result = bp;
  return result;
}

/** `true` when `current` is at or above `target`. */
export function isAtLeast(current: Breakpoint, target: Breakpoint): boolean {
  return BREAKPOINT_ORDER.indexOf(current) >= BREAKPOINT_ORDER.indexOf(target);
}
