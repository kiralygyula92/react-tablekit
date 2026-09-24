import type { CSSProperties } from 'react';
import { mergeLocalization } from './localization';
import type { Handler } from './types';
import { cx, mergeProps } from './utils';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype;

/** Keys whose object values merge one level deep instead of being replaced. */
const SHALLOW_MERGE_KEYS = new Set([
  'pagination',
  'compactPagination',
  'icons',
  'slots',
  'formatters',
  'responsive',
  'displayColumnDefs',
  'detailPanelProps',
  'rowActionsColumn',
  'initialState',
  'columnDefaults',
]);

type SlotValue = unknown;
const resolve = (value: SlotValue, ctx: unknown): unknown =>
  typeof value === 'function' ? (value as (c: unknown) => unknown)(ctx) : value;

function combineSlotMaps(
  kind: 'classNames' | 'styles' | 'slotProps',
  base: Record<string, SlotValue>,
  override: Record<string, SlotValue>,
): Record<string, SlotValue> {
  const out: Record<string, SlotValue> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const prev = out[key];
    if (prev === undefined || value === undefined) {
      out[key] = value ?? prev;
      continue;
    }
    out[key] = (ctx: unknown) => {
      const a = resolve(prev, ctx);
      const b = resolve(value, ctx);
      if (kind === 'classNames') return cx(a as string | undefined, b as string | undefined);
      if (kind === 'styles')
        return { ...(a as CSSProperties | undefined), ...(b as CSSProperties | undefined) };
      return mergeProps(
        (a ?? {}) as Record<string, unknown>,
        b as Record<string, unknown> | undefined,
      );
    };
  }
  return out;
}

/** Composes handler maps: `override` handlers wrap `base` handlers (props wrap provider). */
function composeHandlers(
  base: Record<string, Handler<unknown> | undefined>,
  override: Record<string, Handler<unknown> | undefined>,
): Record<string, Handler<unknown> | undefined> {
  const out = { ...base };
  for (const [key, outer] of Object.entries(override)) {
    const inner = out[key];
    if (!outer || !inner) {
      out[key] = outer ?? inner;
      continue;
    }
    // Each layer passes on the context it received (including modifications from outer layers).
    out[key] = (ctx, next) =>
      outer(ctx, (o1) => {
        const c1 = o1 ? { ...(ctx as object), ...o1 } : ctx;
        return inner(c1, (o2) =>
          next({
            ...(c1 as Record<string, unknown>),
            ...(o2 as Record<string, unknown> | undefined),
          }),
        );
      });
  }
  return out;
}

/**
 * Merges option layers (theme defaults < provider < props): nested display objects merge,
 * handlers compose, classNames/styles/slotProps combine, everything else is replaced.
 */
export function mergeTableProps<T extends object>(
  ...layers: (Partial<T> | undefined)[]
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, value] of Object.entries(layer)) {
      // Props spread from parsed JSON can carry `__proto__`; writing it would swap `out`'s prototype.
      if (value === undefined || key === '__proto__') continue;
      const prev = out[key];
      if (prev === undefined) out[key] = value;
      else if (key === 'handlers' && isPlainObject(prev) && isPlainObject(value)) {
        out[key] = composeHandlers(prev as never, value as never);
      } else if (
        (key === 'classNames' || key === 'styles' || key === 'slotProps') &&
        isPlainObject(prev) &&
        isPlainObject(value)
      ) {
        out[key] = combineSlotMaps(key, prev, value);
      } else if (key === 'localization' && isPlainObject(prev) && isPlainObject(value)) {
        out[key] = mergeLocalization(prev, value);
      } else if (SHALLOW_MERGE_KEYS.has(key) && isPlainObject(prev) && isPlainObject(value)) {
        out[key] = { ...prev, ...value };
      } else out[key] = value;
    }
  }
  return out as Partial<T>;
}

/** Runs a handler middleware around the default implementation. */
export function runHandler<Ctx>(
  handler: Handler<Ctx> | undefined,
  ctx: Ctx,
  defaultImpl: (ctx: Ctx) => void | Promise<void>,
): void | Promise<void> {
  if (!handler) return defaultImpl(ctx);
  return handler(ctx, (override) => defaultImpl(override ? { ...ctx, ...override } : ctx));
}
