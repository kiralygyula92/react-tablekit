import type { Row } from '../types';
import { toText } from '../text';
import { toTime } from '../utils';

/**
 * A built-in sorting function. Generic so it can be used with any row type
 * (`sortingFn: sortingFns.text` on a `ColumnDef<Customer>`).
 */
export type BuiltInSortingFnType = <TData>(
  rowA: Row<TData>,
  rowB: Row<TData>,
  columnId: string,
) => number;

type SortableRow = Row<unknown> & {
  _getSortValue?: (columnId: string) => unknown;
  _locale?: string;
};

/**
 * Reads the (cached) sort value of a row for a column. Honours `columnDef.sortValue`
 * (Skimmer `getSortValue`).
 */
export function getSortValue<TData>(row: Row<TData>, columnId: string): unknown {
  const r = row as unknown as SortableRow;
  return r._getSortValue ? r._getSortValue(columnId) : row.getValue(columnId);
}

const localeOf = <TData>(row: Row<TData>) => (row as unknown as SortableRow)._locale;

const collators = new Map<string, Intl.Collator>();
function collator(sensitivity: 'base' | 'variant', locale = 'en'): Intl.Collator {
  const key = `${locale}|${sensitivity}`;
  let c = collators.get(key);
  if (!c) {
    c = new Intl.Collator(locale, { sensitivity, numeric: true });
    collators.set(key, c);
  }
  return c;
}

const reSplitAlphaNumeric = /([0-9]+)/;

/** Natural comparison: "a2" < "a10"; digit runs sort before letters. */
function compareAlphanumeric(aStr: string, bStr: string): number {
  const a = aStr.split(reSplitAlphaNumeric).filter(Boolean);
  const b = bStr.split(reSplitAlphaNumeric).filter(Boolean);
  while (a.length && b.length) {
    const aa = a.shift()!;
    const bb = b.shift()!;
    const an = Number.parseInt(aa, 10);
    const bn = Number.parseInt(bb, 10);
    const aNum = !Number.isNaN(an);
    const bNum = !Number.isNaN(bn);
    if (aNum && bNum) {
      if (an !== bn) return an > bn ? 1 : -1;
      continue;
    }
    if (aNum !== bNum) return aNum ? -1 : 1;
    if (aa > bb) return 1;
    if (bb > aa) return -1;
  }
  return a.length - b.length;
}

const toStr = (v: unknown): string => {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'string') return v;
  return toText(v);
};

const basicCompare = (a: unknown, b: unknown): number =>
  (a as number) === (b as number) ? 0 : (a as number) > (b as number) ? 1 : -1;

const alphanumeric: BuiltInSortingFnType = (rowA, rowB, id) =>
  compareAlphanumeric(
    toStr(getSortValue(rowA, id)).toLowerCase(),
    toStr(getSortValue(rowB, id)).toLowerCase(),
  );
const alphanumericCaseSensitive: BuiltInSortingFnType = (rowA, rowB, id) =>
  compareAlphanumeric(toStr(getSortValue(rowA, id)), toStr(getSortValue(rowB, id)));
const text: BuiltInSortingFnType = (rowA, rowB, id) =>
  collator('base', localeOf(rowA)).compare(
    toStr(getSortValue(rowA, id)),
    toStr(getSortValue(rowB, id)),
  );
const textCaseSensitive: BuiltInSortingFnType = (rowA, rowB, id) =>
  collator('variant', localeOf(rowA)).compare(
    toStr(getSortValue(rowA, id)),
    toStr(getSortValue(rowB, id)),
  );
const datetime: BuiltInSortingFnType = (rowA, rowB, id) => {
  const a = toTime(getSortValue(rowA, id));
  const b = toTime(getSortValue(rowB, id));
  return basicCompare(Number.isNaN(a) ? -Infinity : a, Number.isNaN(b) ? -Infinity : b);
};
const basic: BuiltInSortingFnType = (rowA, rowB, id) =>
  basicCompare(getSortValue(rowA, id), getSortValue(rowB, id));
const boolean: BuiltInSortingFnType = (rowA, rowB, id) =>
  basicCompare(getSortValue(rowA, id) ? 1 : 0, getSortValue(rowB, id) ? 1 : 0);

/** Built-in sorting functions (05 §1). */
export const sortingFns = {
  /** Natural, case-insensitive ("a2" < "a10"). */
  alphanumeric,
  /** Natural, case-sensitive. */
  alphanumericCaseSensitive,
  /** Locale-aware (`Intl.Collator`, base sensitivity, numeric). */
  text,
  /** Locale-aware, case- and accent-sensitive. */
  textCaseSensitive,
  /** Date objects, ISO strings or timestamps. Invalid dates sort first. */
  datetime,
  /** `<` / `>` on primitives. */
  basic,
  /** `false` < `true`. */
  boolean,
} satisfies Record<string, BuiltInSortingFnType>;

export type BuiltInSortingFn = keyof typeof sortingFns;
