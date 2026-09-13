import type { Row } from '../types';

/** A built-in aggregation function. Generic so it can be used with any row type. */
export type BuiltInAggregationFnType = <TData>(
  columnId: string,
  leafRows: Row<TData>[],
  childRows: Row<TData>[],
) => unknown;
type Fn = BuiltInAggregationFnType;

const numbers = <TData>(id: string, rows: Row<TData>[]): number[] =>
  rows
    .map((r) => r.getValue(id))
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));

/** Built-in aggregation functions (04 §3). All work on leaf rows. */
export const aggregationFns = {
  sum: ((id, leafRows) => numbers(id, leafRows).reduce((a, b) => a + b, 0)) as Fn,
  min: ((id, leafRows) => {
    const n = numbers(id, leafRows);
    return n.length ? Math.min(...n) : undefined;
  }) as Fn,
  max: ((id, leafRows) => {
    const n = numbers(id, leafRows);
    return n.length ? Math.max(...n) : undefined;
  }) as Fn,
  extent: ((id, leafRows) => {
    const n = numbers(id, leafRows);
    return n.length ? [Math.min(...n), Math.max(...n)] : undefined;
  }) as Fn,
  mean: ((id, leafRows) => {
    const n = numbers(id, leafRows);
    return n.length ? n.reduce((a, b) => a + b, 0) / n.length : undefined;
  }) as Fn,
  median: ((id, leafRows) => {
    const n = numbers(id, leafRows).sort((a, b) => a - b);
    if (!n.length) return undefined;
    const mid = Math.floor(n.length / 2);
    return n.length % 2 ? n[mid] : ((n[mid - 1] ?? 0) + (n[mid] ?? 0)) / 2;
  }) as Fn,
  unique: ((id, leafRows) => [...new Set(leafRows.map((r) => r.getValue(id)))]) as Fn,
  uniqueCount: ((id, leafRows) => new Set(leafRows.map((r) => r.getValue(id))).size) as Fn,
  count: ((_id, leafRows) => leafRows.length) as Fn,
} satisfies Record<string, Fn>;

export type BuiltInAggregationFn = keyof typeof aggregationFns;
