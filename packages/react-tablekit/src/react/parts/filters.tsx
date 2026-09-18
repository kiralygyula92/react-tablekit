import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Column, FilterOperator, FilterOption, TableInstance } from '../../core/types';
import { useOptionalTable, useView } from '../context';
import { toText } from '../../core/text';
import { optionKey } from '../slots/filters';
import { cx } from '../utils';
import type { ResolvedView } from '../view';
import { headerText } from './cells';
import { useLayout, useTableVersion } from './layout';

type AnyTable = TableInstance<unknown>;
type AnyColumn = Column<unknown>;

const OPTION_VARIANTS = new Set(['select', 'multiSelect']);

/**
 * Options for a select-like filter: static, a function, async (with a loading state),
 * server facets (`fetchFacets`, lazy, cached per query) or client facets with counts.
 */
function useFilterOptions(
  column: AnyColumn,
  table: AnyTable,
  active: boolean,
): { options: FilterOption[]; loading: boolean } {
  const def = column.columnDef;
  const variant = column.getFilterVariant();
  const needsOptions = active && OPTION_VARIANTS.has(variant);
  const [asyncState, setAsyncState] = useState<{
    options: FilterOption[];
    loading: boolean;
  } | null>(null);
  const query = table.getQuery();
  const queryKey = JSON.stringify([
    query.globalFilter,
    query.columnFilters.filter((f) => f.id !== column.id),
  ]);

  useEffect(() => {
    if (!needsOptions || typeof def.filterOptions !== 'function') return;
    const result = def.filterOptions({ column, table });
    if (Array.isArray(result)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizes with the options function result
      setAsyncState({ options: result, loading: false });
      return;
    }
    let cancelled = false;
    setAsyncState((s) => ({ options: s?.options ?? [], loading: true }));
    void result.then(
      (options) => !cancelled && setAsyncState({ options, loading: false }),
      () => !cancelled && setAsyncState({ options: [], loading: false }),
    );
    return () => {
      cancelled = true;
    };
  }, [needsOptions, def, column, table, queryKey]);

  const serverFaceting = table.options.manualFaceting;
  useEffect(() => {
    if (!needsOptions || def.filterOptions || !serverFaceting) return;
    void column.loadFacets();
  }, [needsOptions, def.filterOptions, serverFaceting, column, queryKey]);

  if (!needsOptions) return { options: [], loading: false };
  if (Array.isArray(def.filterOptions)) return { options: def.filterOptions, loading: false };
  if (typeof def.filterOptions === 'function') return asyncState ?? { options: [], loading: true };

  const facets = column.getServerFacets();
  if (facets?.type === 'values') {
    return {
      options: facets.values.map((v) => ({
        value: v.value,
        label: v.label ?? column.formatValue(v.value, undefined as never),
        ...(v.count !== undefined ? { count: v.count } : {}),
      })),
      loading: false,
    };
  }
  if (serverFaceting && table.options.dataSource?.fetchFacets)
    return { options: [], loading: true };
  const options: FilterOption[] = [];
  for (const [value, count] of column.getFacetedUniqueValues()) {
    if (value === undefined || value === null || value === '') continue;
    options.push({ value, label: column.formatValue(value, undefined), count });
  }
  options.sort((a, b) => a.label.localeCompare(b.label, table.options.locale, { numeric: true }));
  return { options, loading: false };
}

/** One filter control, wired to the column (or to a draft in manual-apply mode). */
export function FilterControlPart({
  column,
  table,
  draft,
  setDraft,
  compact,
}: {
  column: AnyColumn;
  table: AnyTable;
  draft?: Record<string, { value: unknown; operator?: FilterOperator | undefined }>;
  setDraft?: (id: string, value: unknown, operator?: FilterOperator) => void;
  compact?: boolean;
}) {
  const view = useView();
  const { options, loading } = useFilterOptions(column, table, true);
  const id = `${view.id}-filter-${column.id}`;
  const value = draft ? draft[column.id]?.value : column.getFilterValue();
  const operator = draft ? draft[column.id]?.operator : column.getFilterOperator();
  const setValue = (v: unknown, op?: FilterOperator) => {
    if (setDraft) setDraft(column.id, v, op ?? operator);
    else
      void view.handle(
        'onColumnFilterChange',
        { column, value: v, operator: op ?? operator },
        (ctx) => ctx.column.setFilterValue(ctx.value, ctx.operator),
      );
  };
  const base = {
    column,
    variant: column.getFilterVariant(),
    value,
    setValue: (v: unknown) => setValue(v),
    operator,
    setOperator: (op: FilterOperator) => setValue(value ?? '', op),
    options,
    loading,
    table,
    id,
    label: headerText(column),
    className: compact ? 'tk-filter--compact' : undefined,
  };
  return <view.slots.FilterControl {...(view.slot('FilterControl', base, base) as typeof base)} />;
}

export function filterableColumns(table: AnyTable): AnyColumn[] {
  return table.getVisibleLeafColumns().filter((c) => c.getCanFilter());
}

/** The panel grid (used inline and inside the popover). */
function FilterGrid({ table, view }: { table: AnyTable; view: ResolvedView }) {
  const manual = view.props.filterApplyMode === 'manual';
  const columns = filterableColumns(table);
  const [draft, setDraftState] = useState<
    Record<string, { value: unknown; operator?: FilterOperator | undefined }>
  >(() =>
    Object.fromEntries(
      table.getState().columnFilters.map((f) => [f.id, { value: f.value, operator: f.operator }]),
    ),
  );
  const apply = () => {
    table.setColumnFilters(
      Object.entries(draft)
        .filter(([id, d]) => {
          const fn = table.getColumn(id)?.getFilterFn();
          const valueless = d.operator === 'empty' || d.operator === 'notEmpty';
          return valueless || (d.value !== undefined && !(fn?.autoRemove?.(d.value) ?? false));
        })
        .map(([id, d]) => ({
          id,
          value: d.value,
          ...(d.operator ? { operator: d.operator } : {}),
        })),
    );
    table.flushQuery();
  };
  const clearAll = () =>
    void view.handle('onClearFilters', {}, () => {
      setDraftState({});
      table.clearAllFilters();
    });
  const base = {
    columns,
    table,
    open: true,
    onApply: apply,
    onClearAll: clearAll,
    className: 'tk-filter-panel',
    id: `${view.id}-filters`,
  };
  return (
    <view.slots.FilterPanel
      {...(view.slot(
        'FilterPanel',
        { columns, open: true, onApply: apply, onClearAll: clearAll },
        base,
      ) as typeof base)}
    >
      {columns.map((c) => (
        <FilterControlPart
          key={c.id}
          column={c}
          table={table}
          {...(manual
            ? {
                draft,
                setDraft: (id: string, value: unknown, operator?: FilterOperator) =>
                  setDraftState((d) => ({ ...d, [id]: { value, operator } })),
              }
            : {})}
        />
      ))}
    </view.slots.FilterPanel>
  );
}

/** `DataTable.FilterPanel`: the collapsible filter section (`filterDisplayMode: 'panel'`). */
export function FilterPanel<TData>({ table: tableProp }: { table?: TableInstance<TData> }) {
  const table = useOptionalTable(tableProp) as AnyTable;
  useTableVersion(table);
  const view = useView();
  const layout = useLayout();
  if (view.props.filterDisplayMode !== 'panel' || !layout.filtersOpen) return null;
  if (!filterableColumns(table).length) return null;
  return <FilterGrid table={table} view={view} />;
}

/** `DataTable.FiltersButton`: toggles the panel, or opens the popover in `'popover'` mode. */
export function FiltersButton<TData>({
  table: tableProp,
  className,
  style,
}: {
  table?: TableInstance<TData>;
  className?: string;
  style?: CSSProperties;
}) {
  const table = useOptionalTable(tableProp) as AnyTable;
  useTableVersion(table);
  const view = useView();
  const layout = useLayout();
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const mode = view.props.filterDisplayMode;
  if (
    mode === 'none' ||
    mode === 'row' ||
    table.options.enableColumnFilters === false ||
    !filterableColumns(table).length
  )
    return null;
  const activeCount = table.getState().columnFilters.length;
  const open = layout.filtersOpen;
  const onToggle = () => layout.setFiltersOpen((o) => !o);
  const base = {
    ref: anchorRef,
    activeCount,
    open,
    onToggle,
    className,
    style,
    'aria-controls': mode === 'panel' ? `${view.id}-filters` : undefined,
  };
  return (
    <>
      <view.slots.FiltersButton
        // eslint-disable-next-line react-hooks/refs -- view.slot only merges props; it never reads refs or calls handlers during render
        {...(view.slot('FiltersButton', { activeCount, open, onToggle }, base) as typeof base)}
      />
      {mode === 'popover' && (
        <view.slots.Popover
          open={open}
          onClose={() => layout.setFiltersOpen(false)}
          anchorRef={anchorRef}
          label={view.t('filters')}
          placement="bottom-start"
        >
          <FilterGrid table={table} view={view} />
        </view.slots.Popover>
      )}
    </>
  );
}

/** Human summary of a filter value for the chips. */
function summarize(
  column: AnyColumn,
  value: unknown,
  operator: FilterOperator | undefined,
  view: ResolvedView,
  options: FilterOption[],
): { text: string; color?: string; textColor?: string } {
  const labelOf = (v: unknown) =>
    options.find((o) => optionKey(o.value) === optionKey(v))?.label ??
    column.formatValue(v, undefined);
  if (operator === 'empty' || operator === 'notEmpty')
    return { text: view.localization.operators[operator] };
  if (typeof value === 'boolean') return { text: view.t(value ? 'yes' : 'no') };
  if (Array.isArray(value)) {
    const variant = column.getFilterVariant();
    if (variant === 'range' || variant === 'rangeSlider' || variant === 'dateRange') {
      const [a, b] = value as [unknown, unknown];
      return {
        text: `${a === null || a === undefined ? '…' : toText(a)} – ${b === null || b === undefined ? '…' : toText(b)}`,
      };
    }
    const first = options.find(
      (o) => value.length === 1 && optionKey(o.value) === optionKey(value[0]),
    );
    return {
      text: value.map(labelOf).join(', '),
      ...(first?.color ? { color: first.color } : {}),
      ...(first?.textColor ? { textColor: first.textColor } : {}),
    };
  }
  const opt = options.find((o) => optionKey(o.value) === optionKey(value));
  const prefix =
    operator && operator !== 'contains' && operator !== 'equals'
      ? `${view.localization.operators[operator]} `
      : '';
  return {
    text: `${prefix}${opt?.label ?? labelOf(value)}`,
    ...(opt?.color ? { color: opt.color } : {}),
    ...(opt?.textColor ? { textColor: opt.textColor } : {}),
  };
}

function ChipsInner({ table, view }: { table: AnyTable; view: ResolvedView }) {
  const state = table.getState();
  const filters: { id: string; label: string; color?: string; textColor?: string }[] = [];
  for (const f of state.columnFilters) {
    const column = table.getColumn(f.id);
    if (!column) continue;
    const opts = Array.isArray(column.columnDef.filterOptions)
      ? column.columnDef.filterOptions
      : [];
    const s = summarize(column, f.value, f.operator, view, opts);
    filters.push({
      id: f.id,
      label: `${headerText(column)}: ${s.text}`,
      ...(s.color ? { color: s.color } : {}),
      ...(s.textColor ? { textColor: s.textColor } : {}),
    });
  }
  if (state.globalFilter.trim())
    filters.push({ id: '__search', label: `${view.t('search')}: ${state.globalFilter}` });
  const onRemove = (id: string) => {
    if (id === '__search') table.setGlobalFilter('');
    else table.getColumn(id)?.setFilterValue(undefined);
    table.flushQuery();
  };
  const onClearAll = () => void view.handle('onClearFilters', {}, () => table.clearAllFilters());
  const base = { filters, onRemove, onClearAll, className: 'tk-filter-chips' };
  return (
    <view.slots.ActiveFilterChips
      {...(view.slot('ActiveFilterChips', { filters, onRemove, onClearAll }, base) as typeof base)}
    />
  );
}

/** `DataTable.ActiveFilterChips`. */
export function ActiveFilterChips<TData>({ table: tableProp }: { table?: TableInstance<TData> }) {
  const table = useOptionalTable(tableProp) as AnyTable;
  useTableVersion(table);
  const view = useView();
  if (view.props.showActiveFilterChips === false) return null;
  return <ChipsInner table={table} view={view} />;
}

/** The inline filter row under the header (`filterDisplayMode: 'row'`). */
export function FilterRowView({ table, children }: { table: AnyTable; children?: ReactNode }) {
  const view = useView();
  const columns = table.getVisibleLeafColumns();
  return (
    <view.slots.FilterRow className="tk-filter-row">
      {columns.map((column) => (
        <view.slots.FilterRowCell
          key={column.id}
          column={column}
          className={cx('tk-filter-row-cell')}
          data-column-id={column.id}
          scope="col"
        >
          {column.getCanFilter() ? (
            <FilterControlPart column={column} table={table} compact />
          ) : null}
        </view.slots.FilterRowCell>
      ))}
      {children}
    </view.slots.FilterRow>
  );
}
