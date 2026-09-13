import type { FilterFn, FilterFnContext, FilterOperator, Row } from '../types';
import { toText } from '../text';
import { fold, isEmptyValue, toTime } from '../utils';

type AnyRow = Row<unknown>;

/**
 * A built-in filter function. Generic so it can be used with any row type
 * (`filterFn: filterFns.fuzzy` on a `ColumnDef<Customer>`).
 */
export type BuiltInFilterFnType = (<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
  ctx: FilterFnContext,
) => boolean) &
  Pick<FilterFn<unknown>, 'autoRemove' | 'resolveFilterValue'>;

/** Reads the display/search string of a cell (honours `getSearchValue` → `format`). */
export function getFilterString<TData>(row: Row<TData>, columnId: string): string {
  const r = row as unknown as AnyRow & { _getSearchValue?: (id: string) => string };
  if (r._getSearchValue) return r._getSearchValue(columnId);
  const v = row.getValue(columnId);
  return toText(v);
}

/**
 * Declaring `fn` with the same generic call signature the result must have lets
 * `Object.assign` produce `BuiltInFilterFnType` exactly, so no cast is needed —
 * the bodies below still read `row` as a plain row.
 */
const define = (
  fn: <TData>(row: Row<TData>, id: string, value: unknown, ctx: FilterFnContext) => boolean,
  extra: Pick<FilterFn<unknown>, 'autoRemove' | 'resolveFilterValue'> = {},
): BuiltInFilterFnType => Object.assign(fn, extra);

const emptyString = (v: unknown) => toText(v).trim() === '';
const asNumber = (v: unknown): number | undefined => {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? undefined : n;
};

/** Start of the day (local time) for date comparisons. */
function dayStart(value: unknown): number {
  const t = toTime(value);
  if (Number.isNaN(t)) return Number.NaN;
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Parses `YYYY-MM-DD` as a *local* date (native date inputs yield these). */
function parseFilterDate(value: unknown): number {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number) as [number, number, number];
    return new Date(y, m - 1, d).getTime();
  }
  return dayStart(value);
}

const includesString = define(
  (row, id, value) => fold(getFilterString(row, id)).includes(fold(String(value))),
  { autoRemove: emptyString },
);

const equals = define((row, id, value) => row.getValue(id) === value, {
  autoRemove: (v) => v === undefined || v === null || v === '',
});

const arrIncludesSome = define(
  (row, id, value) => {
    const cell = row.getValue(id);
    const wanted = value as unknown[];
    return Array.isArray(cell)
      ? wanted.some((w) => (cell as unknown[]).includes(w))
      : wanted.includes(cell);
  },
  { autoRemove: (v) => !Array.isArray(v) || v.length === 0 },
);

const inNumberRange = define(
  (row, id, value) => {
    const [min, max] = (value ?? [null, null]) as [unknown, unknown];
    const n = asNumber(row.getValue(id));
    if (n === undefined) return false;
    const lo = asNumber(min);
    const hi = asNumber(max);
    return (lo === undefined || n >= lo) && (hi === undefined || n <= hi);
  },
  {
    autoRemove: (v) =>
      !Array.isArray(v) || (asNumber(v[0]) === undefined && asNumber(v[1]) === undefined),
  },
);

const inDateRange = define(
  (row, id, value) => {
    const [from, to] = (value ?? [null, null]) as [unknown, unknown];
    const t = dayStart(row.getValue(id));
    if (Number.isNaN(t)) return false;
    const lo = from ? parseFilterDate(from) : Number.NaN;
    const hi = to ? parseFilterDate(to) : Number.NaN;
    return (Number.isNaN(lo) || t >= lo) && (Number.isNaN(hi) || t <= hi);
  },
  { autoRemove: (v) => !Array.isArray(v) || (!v[0] && !v[1]) },
);

/**
 * Lightweight in-house fuzzy matcher: every query character must appear in order;
 * consecutive matches score higher. Rows with a score > 0 pass.
 */
export function fuzzyScore(text: string, query: string): number {
  const t = fold(text);
  const q = fold(query).replace(/\s+/g, '');
  if (!q) return 1;
  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    streak = found === ti ? streak + 1 : 1;
    score += streak;
    ti = found + 1;
  }
  return score;
}

/** Text variant: honours the text operators (03 §6.2). */
const textOperatorFn = define(
  (row, id, value, ctx) => {
    const cell = fold(getFilterString(row, id));
    const q = fold(toText(value));
    switch (ctx.operator ?? 'contains') {
      case 'equals':
        return cell === q;
      case 'startsWith':
        return cell.startsWith(q);
      case 'endsWith':
        return cell.endsWith(q);
      case 'notContains':
        return !cell.includes(q);
      case 'empty':
        return cell.trim() === '';
      case 'notEmpty':
        return cell.trim() !== '';
      default:
        return cell.includes(q);
    }
  },
  { autoRemove: emptyString },
);

/** Number variant: honours the number operators. */
const numberOperatorFn = define(
  (row, id, value, ctx) => {
    const n = asNumber(row.getValue(id));
    const v = asNumber(value);
    if (v === undefined) return true;
    if (n === undefined) return false;
    switch (ctx.operator ?? 'equals') {
      case 'gt':
        return n > v;
      case 'gte':
        return n >= v;
      case 'lt':
        return n < v;
      case 'lte':
        return n <= v;
      case 'neq':
        return n !== v;
      default:
        return n === v;
    }
  },
  { autoRemove: (v) => asNumber(v) === undefined },
);

/** Date variant: `on` / `before` / `after` (day precision, local time). */
const dateOperatorFn = define(
  (row, id, value, ctx) => {
    const t = dayStart(row.getValue(id));
    const v = parseFilterDate(value);
    if (Number.isNaN(v)) return true;
    if (Number.isNaN(t)) return false;
    const op: FilterOperator = ctx.operator ?? 'on';
    return op === 'before' ? t < v : op === 'after' ? t > v : t === v;
  },
  { autoRemove: (v) => !v },
);

/** Built-in filter functions (05 §3.3). */
export const filterFns = {
  includesString,
  includesStringSensitive: define(
    (row, id, value) => getFilterString(row, id).includes(String(value)),
    { autoRemove: emptyString },
  ),
  equalsString: define((row, id, value) => fold(getFilterString(row, id)) === fold(String(value)), {
    autoRemove: emptyString,
  }),
  startsWith: define(
    (row, id, value) => fold(getFilterString(row, id)).startsWith(fold(String(value))),
    { autoRemove: emptyString },
  ),
  endsWith: define(
    (row, id, value) => fold(getFilterString(row, id)).endsWith(fold(String(value))),
    { autoRemove: emptyString },
  ),
  equals,
  weakEquals: define((row, id, value) => row.getValue(id) == value, {
    autoRemove: (v) => v === undefined || v === null || v === '',
  }),
  arrIncludes: define(
    (row, id, value) => {
      const cell = row.getValue(id);
      return Array.isArray(cell) && cell.includes(value);
    },
    { autoRemove: (v) => v === undefined || v === null || v === '' },
  ),
  arrIncludesAll: define(
    (row, id, value) => {
      const cell = row.getValue(id);
      return Array.isArray(cell) && (value as unknown[]).every((w) => cell.includes(w));
    },
    { autoRemove: (v) => !Array.isArray(v) || v.length === 0 },
  ),
  arrIncludesSome,
  inNumberRange,
  inDateRange,
  dateEquals: define((row, id, value) => dayStart(row.getValue(id)) === parseFilterDate(value), {
    autoRemove: (v) => !v,
  }),
  before: define((row, id, value) => dayStart(row.getValue(id)) < parseFilterDate(value), {
    autoRemove: (v) => !v,
  }),
  after: define((row, id, value) => dayStart(row.getValue(id)) > parseFilterDate(value), {
    autoRemove: (v) => !v,
  }),
  empty: define((row, id) => isEmptyValue(row.getValue(id))),
  notEmpty: define((row, id) => !isEmptyValue(row.getValue(id))),
  fuzzy: define((row, id, value) => fuzzyScore(getFilterString(row, id), String(value)) > 0, {
    autoRemove: emptyString,
  }),
  /** Operator-aware text filter (variant `text`). */
  text: textOperatorFn,
  /** Operator-aware number filter (variant `number`). */
  number: numberOperatorFn,
  /** Operator-aware date filter (variant `date`). */
  date: dateOperatorFn,
  /** `notIn` / `in` for multi-select. */
  multiSelect: define(
    (row, id, value, ctx) => {
      const pass = arrIncludesSome(row, id, value, ctx);
      return ctx.operator === 'notIn' ? !pass : pass;
    },
    { autoRemove: (v) => !Array.isArray(v) || v.length === 0 },
  ),
  /** Tri-state boolean (`null` = any). */
  boolean: define(
    (row, id, value) => {
      const cell: unknown = row.getValue(id);
      return Boolean(cell) === value;
    },
    {
      autoRemove: (v) => v === null || v === undefined || v === '',
    },
  ),
} satisfies Record<string, BuiltInFilterFnType>;

export type BuiltInFilterFn = keyof typeof filterFns;
