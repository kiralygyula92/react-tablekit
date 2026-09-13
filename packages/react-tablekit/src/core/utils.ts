import type { Updater } from './types';

/** Resolves an `Updater`: calls it with the old value when it is a function. */
export function functionalUpdate<T>(updater: Updater<T>, old: T): T {
  return typeof updater === 'function' ? (updater as (old: T) => T)(old) : updater;
}

/**
 * Blocks inference: `TDeps` must come from `getDeps`, not from `compute`'s (possibly shorter)
 * parameter list. TypeScript does not infer through a deferred conditional type.
 */
type Defer<T> = T extends unknown ? T : never;

/** Options for {@link memo}. */
export interface MemoOptions {
  /** Label used by debug logging. */
  key?: string;
  /** Logs recomputation time when it returns true. */
  debug?: () => boolean;
  /** Called after a recomputation (not on the first run). */
  onChange?: () => void;
}

/**
 * Memoizes `compute` on the shallow-equal array returned by `getDeps` (02 §4.3).
 * Powers every row-model stage and derived value.
 */
export function memo<TDeps extends readonly unknown[], TResult>(
  getDeps: () => [...TDeps],
  compute: (...deps: Defer<TDeps>) => TResult,
  opts: MemoOptions = {},
): () => TResult {
  let deps: TDeps | undefined;
  let result: TResult;
  return () => {
    const next = getDeps() as unknown as TDeps;
    if (deps && shallowEqualArrays(deps, next)) return result;
    const first = deps === undefined;
    deps = next;
    const debug = opts.debug?.() ?? false;
    const start = debug ? performance.now() : 0;
    result = compute(...next);
    if (debug) {
      console.warn(`[tablekit] ${opts.key ?? 'memo'}: ${(performance.now() - start).toFixed(2)}ms`);
    }
    if (!first) opts.onChange?.();
    return result;
  };
}

export function shallowEqualArrays(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}

/** Structural equality for JSON-like values (plus Dates). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

/** Reads a dot path (`'billingAddress.city'`). Missing links yield `undefined`. */
export function getDeepValue(obj: unknown, path: string): unknown {
  if (!path.includes('.')) {
    return obj == null ? undefined : (obj as Record<string, unknown>)[path];
  }
  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** `'billingAddress.city'` → `'Billing address city'`, `'firstName'` → `'First name'`. */
export function humanize(id: string): string {
  const words = id
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Case- and diacritic-insensitive folding (NFD, combining marks stripped). */
export function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** `null`, `undefined`, `''` and empty arrays count as empty. */
export function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Interpolates `{name}` placeholders. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * Development check. Call sites that guard dev-only code write the expression literally
 * (`process.env.NODE_ENV !== 'production'`) so bundlers replace it and drop the code from
 * production builds, like React does.
 */
export function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

const warned = new Set<string>();
/** Warns once per message per session, and only in development. */
export function warnOnce(message: string): void {
  if (process.env.NODE_ENV === 'production' || warned.has(message)) return;
  warned.add(message);
  console.warn(`[react-tablekit] ${message}`);
}

/** Default locale: `navigator.language` in browsers, `'en-US'` on the server. */
export function getDefaultLocale(): string {
  const nav = (globalThis as { navigator?: { language?: string } }).navigator;
  return nav?.language ?? 'en-US';
}

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** True for Date objects and ISO-8601 date strings. */
export function isDateLike(value: unknown): value is Date | string {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

/** Date, ISO string or timestamp → epoch ms (`NaN` when invalid). */
export function toTime(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value);
  return Number.NaN;
}

/** Escapes a string for use inside a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
