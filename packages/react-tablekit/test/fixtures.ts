import { createTable } from '../src/core';
import type { AnyColumnDef, TableOptions } from '../src/core';

export interface Person {
  id: string;
  name: string;
  age: number | null;
  city?: string;
  joined: string;
  active: boolean;
  address?: { city?: string; zip?: string };
  tags?: string[];
  children?: Person[];
}

export const people: Person[] = [
  {
    id: 'p1',
    name: 'Zoë Adams',
    age: 31,
    city: 'Budapest',
    joined: '2021-03-01',
    active: true,
    address: { city: 'Budapest', zip: '1011' },
    tags: ['a'],
  },
  {
    id: 'p2',
    name: 'bob brown',
    age: 25,
    city: 'Austin',
    joined: '2020-01-15',
    active: false,
    address: { city: 'Austin' },
    tags: ['b'],
  },
  {
    id: 'p3',
    name: 'Carl Clark',
    age: null,
    city: 'Austin',
    joined: '2022-07-30',
    active: true,
    tags: ['a', 'b'],
  },
  {
    id: 'p4',
    name: 'Ann Álvarez',
    age: 42,
    city: 'Miami',
    joined: '2019-11-05',
    active: true,
    address: { city: 'Miami' },
  },
  { id: 'p5', name: 'item10', age: 25, joined: '2023-02-02', active: false },
  { id: 'p6', name: 'item2', age: 57, city: 'Budapest', joined: '2018-06-20', active: true },
];

export const personColumns: AnyColumnDef<Person>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'age', header: 'Age', type: 'number' },
  { accessorKey: 'city', header: 'City' },
  { accessorKey: 'joined', header: 'Joined', type: 'date' },
  { accessorKey: 'active', header: 'Active', type: 'boolean' },
];

/** A client-mode table with synchronous queries (no debounce) for deterministic tests. */
export function makeTable(overrides: Partial<TableOptions<Person>> = {}) {
  return createTable<Person>({
    data: people,
    columns: personColumns,
    getRowId: (r) => r.id,
    searchDebounceMs: 0,
    filterDebounceMs: 0,
    ...overrides,
  });
}

export const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

/** Generates n numbered rows. */
export function numbered(n: number): Person[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    name: `Row ${i}`,
    age: i,
    joined: '2020-01-01',
    active: i % 2 === 0,
  }));
}
