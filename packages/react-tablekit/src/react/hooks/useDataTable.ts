import { useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createTable } from '../../core/createTable';
import type { TableInstance, TableOptions } from '../../core/types';
import type { TableTheme } from '../../themes/types';
import { DefaultsContext } from '../context';
import { useDisplayColumns } from '../displayColumns';
import { mergeTableProps } from '../options';
import { useSyncState } from '../syncState';
import type { DataTableProps } from '../types';
import { resolveTheme } from '../view';
import { useViewportBreakpoint, usePrefersDark } from './useBreakpoint';

/**
 * Creates a table instance and subscribes the component to it (02 §5). Accepts every
 * `<DataTable>` prop; view props are kept on `table.options` for `DataTable.Root`.
 *
 * @example
 * ```tsx
 * const table = useDataTable({ data, columns, getRowId: (r) => r.id });
 * return <DataTable.Root table={table}><DataTable.Container /><DataTable.Pagination /></DataTable.Root>;
 * ```
 */
export function useDataTable<TData>(props: DataTableProps<TData>): TableInstance<TData> {
  const provider = useContext(DefaultsContext) as Partial<DataTableProps<TData>>;
  const scheme = props.colorScheme ?? provider.colorScheme ?? 'light';
  const prefersDark = usePrefersDark(scheme === 'auto');
  const dark = scheme === 'dark' || (scheme === 'auto' && prefersDark);
  const darkThemeProp = props.darkTheme ?? provider.darkTheme;
  const theme = useMemo<TableTheme>(
    () => resolveTheme(props.theme, provider.theme, dark ? 'dark' : 'light', darkThemeProp),
    [props.theme, provider.theme, dark, darkThemeProp],
  );
  const breakpoint = useViewportBreakpoint(
    useMemo(
      () => ({ ...theme.breakpoints, ...props.responsive?.breakpoints }),
      [theme.breakpoints, props.responsive?.breakpoints],
    ),
    props.responsive?.ssrBreakpoint ?? provider.responsive?.ssrBreakpoint ?? 'lg',
  );

  const merged = mergeTableProps<DataTableProps<TData>>(
    theme.defaults,
    provider,
    props,
  ) as DataTableProps<TData>;
  const columns = useDisplayColumns(merged);

  const options = {
    ...merged,
    columns,
    _renderContext: { theme, breakpoint },
    _hasDetailPanel: !!(merged.renderDetailPanel ?? merged.renderSubComponent),
    _viewMerged: true,
  } as TableOptions<TData>;

  const [table] = useState(() => createTable<TData>(options));
  table.setOptions(options);
  useSyncExternalStore(table.subscribe, table._getVersion, table._getVersion);
  useEffect(() => table._mount(), [table]);
  // URL / storage persistence (03 §7); a no-op unless `syncState` is set.
  useSyncState(table, merged.syncState);
  const { tableRef } = props;
  useEffect(() => {
    tableRef?.(table);
  }, [table, tableRef]);
  return table;
}
