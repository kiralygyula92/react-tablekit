import type {
  AccessorFnColumnDef,
  AccessorKeyColumnDef,
  AnyColumnDef,
  ColumnDefBase,
  DeepKeys,
  DeepValue,
  DisplayColumnDef,
  GroupColumnDef,
} from '../core/types';

/** Type-inferring column builders returned by {@link createColumnHelper}. */
export interface ColumnHelper<TData> {
  /**
   * An accessor column. With a key, `TValue` is inferred from the path; with a function, from
   * its return type (an `id` is then required).
   */
  accessor<TKey extends DeepKeys<TData>, TValue extends DeepValue<TData, TKey>>(
    key: TKey,
    def?: Omit<AccessorKeyColumnDef<TData, TValue>, 'accessorKey'>,
  ): AccessorKeyColumnDef<TData, TValue>;
  /** An accessor column computed by a function; `TValue` comes from its return type. */
  accessor<TValue>(
    fn: (row: TData, index: number) => TValue,
    def: Omit<AccessorFnColumnDef<TData, TValue>, 'accessorFn'>,
  ): AccessorFnColumnDef<TData, TValue>;
  /** A column without a value (actions, custom content). */
  display(def: DisplayColumnDef<TData>): DisplayColumnDef<TData>;
  /** A header group. */
  group(def: GroupColumnDef<TData>): GroupColumnDef<TData>;
}

/**
 * Typed column builders (04 §3).
 *
 * @example
 * ```tsx
 * const col = createColumnHelper<Customer>();
 * const columns = [
 *   col.accessor('displayName.companyName', { header: 'Company name' }),
 *   col.accessor((r) => r.serviceLocations?.length ?? 0, { id: 'bodiesOfWater', type: 'number' }),
 *   col.display({ id: 'actions', cell: ({ row }) => <Edit row={row} />, pin: 'right', static: true }),
 * ];
 * ```
 */
export function createColumnHelper<TData>(): ColumnHelper<TData> {
  return {
    accessor: ((accessor: unknown, def: ColumnDefBase<TData> & { id?: string } = {}) =>
      typeof accessor === 'function'
        ? { ...def, accessorFn: accessor }
        : { ...def, accessorKey: accessor }) as ColumnHelper<TData>['accessor'],
    display: (def) => def,
    group: (def) => def,
  };
}

/** Identity with inference, for column arrays defined outside components. */
export function defineColumns<TData>(columns: AnyColumnDef<TData>[]): AnyColumnDef<TData>[] {
  return columns;
}
