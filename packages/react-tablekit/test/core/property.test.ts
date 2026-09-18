import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createTable, type AnyColumnDef, type TableQuery } from '../../src/core';

/**
 * Property tests: the engine's client pipeline is compared against a naive reference
 * implementation of the same specification, and a simulated server driven by the emitted
 * `TableQuery` is compared against client mode (equivalence).
 */

interface Row {
  id: string;
  name: string;
  age: number | null;
  city: string;
  active: boolean;
}

const CITIES = ['Budapest', 'Austin', 'Miami', 'Zürich', 'Ávila'];
const NAMES = [
  'Zoë Adams',
  'bob brown',
  'Carl Clark',
  'Ann Álvarez',
  'item2',
  'item10',
  'Ödön',
  'ödön szabó',
];

const columns: AnyColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'age', header: 'Age', type: 'number' },
  { accessorKey: 'city', header: 'City', filterVariant: 'select' },
  { accessorKey: 'active', header: 'Active', type: 'boolean' },
];

const rowArb = fc.record({
  name: fc.constantFrom(...NAMES),
  age: fc.option(fc.integer({ min: 0, max: 99 }), { nil: null }),
  city: fc.constantFrom(...CITIES),
  active: fc.boolean(),
});

const dataArb = fc
  .array(rowArb, { maxLength: 24 })
  .map((rows) => rows.map((r, i) => ({ ...r, id: `r${i}` })));

const queryArb = fc.record({
  globalFilter: fc.constantFrom('', 'a', 'ödön', 'zu', 'item1', 'ann al', 'carl clark'),
  city: fc.option(fc.constantFrom(...CITIES), { nil: undefined }),
  ageRange: fc.option(
    fc
      .tuple(fc.integer({ min: 0, max: 99 }), fc.integer({ min: 0, max: 99 }))
      .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]),
    { nil: undefined },
  ),
  sort: fc.option(fc.record({ id: fc.constantFrom('name', 'age'), desc: fc.boolean() }), {
    nil: undefined,
  }),
  pageSize: fc.constantFrom(1, 3, 5, 10),
  pageIndex: fc.integer({ min: 0, max: 4 }),
});
/** Identity helper that names the generated query shape. */
const parse = (q: {
  globalFilter: string;
  city?: string | undefined;
  ageRange?: [number, number] | undefined;
  sort?: { id: string; desc: boolean } | undefined;
  pageSize: number;
  pageIndex: number;
}) => q;

/* ── reference implementation ──────────────────────────────────────────── */

/** Case- and diacritic-insensitive fold. */
const fold = (value: string | number | boolean | null | undefined) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

const collator = new Intl.Collator('en-US', { sensitivity: 'base', numeric: true });

function reference(data: Row[], q: ReturnType<typeof parse>): Row[] {
  let rows = data;

  // Global search: every word must match some column's display string.
  const words = fold(q.globalFilter).split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    rows = rows.filter((r) => {
      const texts = [fold(r.name), fold(r.age ?? ''), fold(r.city), fold(r.active)];
      return words.every((w) => texts.some((t) => t.includes(w)));
    });
  }
  if (q.city !== undefined) rows = rows.filter((r) => r.city === q.city);
  if (q.ageRange) {
    const [min, max] = q.ageRange;
    rows = rows.filter((r) => r.age !== null && r.age >= min && r.age <= max);
  }

  if (q.sort) {
    const { id, desc } = q.sort;
    // Stable sort; null/undefined always last, regardless of direction.
    rows = rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const av = a.row[id as 'name' | 'age'];
        const bv = b.row[id as 'name' | 'age'];
        const aNil = av === null;
        const bNil = bv === null;
        if (aNil || bNil) return aNil && bNil ? a.index - b.index : aNil ? 1 : -1;
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : collator.compare(String(av), String(bv));
        return cmp === 0 ? a.index - b.index : desc ? -cmp : cmp;
      })
      .map((e) => e.row);
  }
  return rows;
}

const pageOf = (rows: Row[], pageIndex: number, pageSize: number) =>
  rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

/** Where the server adapter lands after the out-of-range correction (last page). */
const correctedPage = (total: number, pageIndex: number, pageSize: number) => {
  const pageCount = Math.ceil(total / pageSize);
  return pageIndex >= pageCount ? Math.max(0, pageCount - 1) : pageIndex;
};

function clientTable(data: Row[], q: ReturnType<typeof parse>) {
  const table = createTable<Row>({
    data,
    columns,
    getRowId: (r) => r.id,
    locale: 'en-US',
    searchDebounceMs: 0,
    filterDebounceMs: 0,
    state: {
      globalFilter: q.globalFilter,
      columnFilters: [
        ...(q.city !== undefined ? [{ id: 'city', value: q.city }] : []),
        ...(q.ageRange ? [{ id: 'age', value: q.ageRange }] : []),
      ],
      sorting: q.sort ? [q.sort] : [],
      pagination: { pageIndex: q.pageIndex, pageSize: q.pageSize },
    },
  });
  return table;
}

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('client pipeline equals the reference implementation', () => {
  it('search + filters + sort + pagination produce the same rows', () => {
    fc.assert(
      fc.property(dataArb, queryArb, (data, raw) => {
        const q = parse(raw);
        const table = clientTable(data, q);
        const expectedAll = reference(data, q);

        expect(table.getRowCount()).toBe(expectedAll.length);
        // Fully controlled state: the engine renders exactly the requested slice, out of range
        // included (it must not silently move a page index the caller owns).
        expect(ids(table.getRowModel().rows)).toEqual(
          ids(pageOf(expectedAll, q.pageIndex, q.pageSize)),
        );
      }),
      { numRuns: 300 },
    );
  });

  it('pagination invariants: pages partition the filtered rows and never exceed pageSize', () => {
    fc.assert(
      fc.property(dataArb, queryArb, (data, raw) => {
        const q = { ...parse(raw), pageIndex: 0 };
        const table = createTable<Row>({
          data,
          columns,
          getRowId: (r) => r.id,
          locale: 'en-US',
          searchDebounceMs: 0,
          filterDebounceMs: 0,
          // Uncontrolled, so the test can page through with `setPageIndex`.
          initialState: {
            globalFilter: q.globalFilter,
            columnFilters: [
              ...(q.city !== undefined ? [{ id: 'city', value: q.city }] : []),
              ...(q.ageRange ? [{ id: 'age', value: q.ageRange }] : []),
            ],
            sorting: q.sort ? [q.sort] : [],
            pagination: { pageIndex: 0, pageSize: q.pageSize },
          },
        });
        const total = table.getRowCount();
        expect(table.getPageCount()).toBe(Math.ceil(total / q.pageSize));

        const seen: string[] = [];
        for (let p = 0; p < table.getPageCount(); p++) {
          table.setPageIndex(p);
          const rows = table.getRowModel().rows;
          expect(rows.length).toBeLessThanOrEqual(q.pageSize);
          if (total > 0 && p < table.getPageCount() - 1) expect(rows).toHaveLength(q.pageSize);
          seen.push(...ids(rows));
        }
        expect(seen).toEqual(ids(reference(data, q)));
        expect(new Set(seen).size).toBe(seen.length);
      }),
      { numRuns: 200 },
    );
  });

  it('sorting is stable: equal keys keep their original relative order', () => {
    fc.assert(
      fc.property(dataArb, fc.boolean(), (data, desc) => {
        const table = createTable<Row>({
          data,
          columns,
          getRowId: (r) => r.id,
          locale: 'en-US',
          state: { sorting: [{ id: 'city', desc }], pagination: { pageIndex: 0, pageSize: 100 } },
        });
        const rows = table.getRowModel().rows;
        const order = new Map(data.map((r, i) => [r.id, i]));
        for (let i = 1; i < rows.length; i++) {
          const prev = rows[i - 1]!.original;
          const cur = rows[i]!.original;
          if (prev.city === cur.city) {
            expect(order.get(prev.id)!).toBeLessThan(order.get(cur.id)!);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('server mode equals client mode', () => {
  it('the emitted TableQuery reproduces the client result', async () => {
    await fc.assert(
      fc.asyncProperty(dataArb, queryArb, async (data, raw) => {
        const q = parse(raw);
        const seen: TableQuery[] = [];
        const table = createTable<Row>({
          columns,
          getRowId: (r) => r.id,
          locale: 'en-US',
          searchDebounceMs: 0,
          filterDebounceMs: 0,
          dataMode: 'server',
          acknowledgePageLocalSorting: true,
          acknowledgePageLocalFiltering: true,
          initialState: {
            globalFilter: q.globalFilter,
            columnFilters: [
              ...(q.city !== undefined ? [{ id: 'city', value: q.city }] : []),
              ...(q.ageRange ? [{ id: 'age', value: q.ageRange }] : []),
            ],
            sorting: q.sort ? [q.sort] : [],
            pagination: { pageIndex: q.pageIndex, pageSize: q.pageSize },
          },
          // The "server": applies the reference implementation to the query it receives.
          dataSource: {
            fetch: (query) => {
              seen.push(query);
              const all = reference(data, {
                globalFilter: query.globalFilter,
                city: query.columnFilters.find((f) => f.id === 'city')?.value as string | undefined,
                ageRange: query.columnFilters.find((f) => f.id === 'age')?.value as
                  [number, number] | undefined,
                sort: query.sorting[0],
                pageSize: query.pagination.pageSize,
                pageIndex: query.pagination.pageIndex,
              });
              return Promise.resolve({
                rows: pageOf(all, query.pagination.pageIndex, query.pagination.pageSize),
                rowCount: all.length,
              });
            },
          },
        });
        const unmount = table._mount();
        for (let i = 0; i < 10; i++) await Promise.resolve();

        const expectedAll = reference(data, q);
        const page = correctedPage(expectedAll.length, q.pageIndex, q.pageSize);
        // One fetch, plus at most one more for the out-of-range correction.
        expect(seen.length, 'fetches').toBeLessThanOrEqual(page === q.pageIndex ? 1 : 2);
        expect(seen[0]!.globalFilter).toBe(q.globalFilter);
        expect(seen[0]!.pagination).toMatchObject({
          pageIndex: q.pageIndex,
          pageSize: q.pageSize,
        });
        expect(seen[0]!.sorting).toEqual(q.sort ? [q.sort] : []);
        expect(table.getRowCount()).toBe(expectedAll.length);
        expect(ids(table.getRowModel().rows)).toEqual(ids(pageOf(expectedAll, page, q.pageSize)));
        unmount();
      }),
      { numRuns: 120 },
    );
  });
});
