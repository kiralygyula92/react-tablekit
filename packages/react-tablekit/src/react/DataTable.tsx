import { forwardRef, useEffect, useImperativeHandle, type ReactElement, type Ref } from 'react';
import type { TableInstance } from '../core/types';
import { useTableContext, useView } from './context';
import { useDataTable } from './hooks/useDataTable';
import { ActiveFilterChips, FilterPanel, FiltersButton } from './parts/filters';
import { useLayout } from './parts/layout';
import { Pagination } from './parts/Pagination';
import { Root } from './parts/Root';
import { Search } from './parts/Search';
import { Container, ErrorBannerPart, LoadingOverlay, TableElement } from './parts/TableView';
import {
  ColumnsButton,
  DensityButton,
  ExportButton,
  hasToolbarFeatures,
  SelectionBar,
  Toolbar,
} from './parts/Toolbar';
import type { DataTableHandle, DataTableProps, DataTableViewProps } from './types';

/** `CSS.escape` with a fallback for environments without it (older jsdom). */
const cssEscape = (value: string) =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&');

/** The default arrangement of parts (02 §6). */
function DefaultLayout({ handleRef }: { handleRef: Ref<DataTableHandle<unknown>> | undefined }) {
  const table = useTableContext();
  const view = useView();
  const layout = useLayout();
  const props = view.props as DataTableProps<unknown>;

  useImperativeHandle(
    handleRef,
    () => ({
      table,
      focus: () => {
        const el = layout.tableRef.current?.querySelector<HTMLElement>(
          'tbody button, tbody input, tbody [tabindex], thead button, tbody a[href]',
        );
        (el ?? layout.containerRef.current)?.focus();
      },
      scrollToRow: (id, opts) => table.scrollToRow(id, opts),
      scrollToTop: () => {
        if (layout.containerRef.current) layout.containerRef.current.scrollTop = 0;
      },
    }),
    [table, layout],
  );

  // Scroll/focus hooks for the headless API (`table.scrollToRow`, `table.focusCell`).
  useEffect(() => {
    Object.assign(table._view, {
      scrollToRow: (rowId: string, opts?: { align?: 'start' | 'center' | 'end' }) => {
        const row = layout.tableRef.current?.querySelector<HTMLElement>(
          `tr[data-row-id="${cssEscape(rowId)}"]`,
        );
        row?.scrollIntoView({
          block: opts?.align === 'center' ? 'center' : opts?.align === 'end' ? 'end' : 'start',
        });
      },
      focusCell: (rowId: string, columnId: string) => {
        const cell = layout.tableRef.current?.querySelector<HTMLElement>(
          `tr[data-row-id="${cssEscape(rowId)}"] [data-column-id="${cssEscape(columnId)}"]`,
        );
        const target =
          cell?.querySelector<HTMLElement>('button, a[href], input, [tabindex]') ?? cell;
        if (target && target === cell && !target.hasAttribute('tabindex')) target.tabIndex = -1;
        target?.focus();
      },
    });
    return () => {
      Object.assign(table._view, { scrollToRow: undefined, focusCell: undefined });
    };
  }, [table, layout.tableRef]);

  const toolbar = props.toolbar ?? (hasToolbarFeatures(table, props) ? 'top' : false);
  const toolbarTop = toolbar === true || toolbar === 'top' || toolbar === 'both';
  const toolbarBottom = toolbar === 'bottom' || toolbar === 'both';
  const pagPos = view.pagination.position;

  return (
    <>
      {toolbarTop && <Toolbar />}
      {toolbarTop && <FilterPanel />}
      <SelectionBar />
      <ErrorBannerPart />
      {(pagPos === 'top' || pagPos === 'both') && <Pagination position="top" />}
      <Container />
      {(pagPos === 'bottom' || pagPos === 'both') && <Pagination position="bottom" />}
      {toolbarBottom && <Toolbar />}
    </>
  );
}

function OwnedDataTable<TData>({
  handleRef,
  ...props
}: DataTableProps<TData> & { handleRef?: Ref<DataTableHandle<TData>> | undefined }) {
  const table = useDataTable(props);
  return (
    <Root table={table}>
      <DefaultLayout handleRef={handleRef as Ref<DataTableHandle<unknown>>} />
    </Root>
  );
}

function ExternalDataTable<TData>({
  table,
  handleRef,
  ...viewProps
}: DataTableViewProps<TData> & {
  table: TableInstance<TData>;
  handleRef?: Ref<DataTableHandle<TData>> | undefined;
}) {
  // Engine options belong to the external instance; the remaining props style this view of it.
  return (
    <Root table={table} {...viewProps}>
      <DefaultLayout handleRef={handleRef as Ref<DataTableHandle<unknown>>} />
    </Root>
  );
}

const DataTableBase = forwardRef(function DataTable<TData>(
  props: DataTableProps<TData>,
  ref: Ref<DataTableHandle<TData>>,
) {
  if (props.table) {
    const { table, ...rest } = props;
    return (
      <ExternalDataTable table={table} handleRef={ref} {...(rest as DataTableViewProps<TData>)} />
    );
  }
  if (!props.columns)
    throw new Error(
      '[react-tablekit] <DataTable> needs `columns` (or a `table` from useDataTable).',
    );
  return <OwnedDataTable {...props} handleRef={ref} />;
});
DataTableBase.displayName = 'DataTable';

/** The table component type, generic over the row type. */
export type DataTableComponent = (<TData>(
  props: DataTableProps<TData> & { ref?: Ref<DataTableHandle<TData>> },
) => ReactElement | null) & {
  /** Provides context for composable parts (06 §9). */
  Root: typeof Root;
  Toolbar: typeof Toolbar;
  Search: typeof Search;
  FiltersButton: typeof FiltersButton;
  FilterPanel: typeof FilterPanel;
  ActiveFilterChips: typeof ActiveFilterChips;
  ColumnsButton: typeof ColumnsButton;
  DensityButton: typeof DensityButton;
  ExportButton: typeof ExportButton;
  SelectionBar: typeof SelectionBar;
  ErrorBanner: typeof ErrorBannerPart;
  Container: typeof Container;
  Table: typeof TableElement;
  LoadingOverlay: typeof LoadingOverlay;
  Pagination: typeof Pagination;
};

/**
 * The all-in-one data table (04 §2). Compose your own layout with the attached parts:
 * `DataTable.Root`, `.Toolbar`, `.Search`, `.FiltersButton`, `.FilterPanel`,
 * `.ActiveFilterChips`, `.ColumnsButton`, `.DensityButton`, `.ExportButton`, `.SelectionBar`,
 * `.ErrorBanner`, `.Container`, `.Table`, `.LoadingOverlay`, `.Pagination`.
 *
 * @example
 * ```tsx
 * <DataTable data={customers} columns={columns} getRowId={(c) => c.id} aria-label="Customers" />
 * ```
 */
export const DataTable = Object.assign(DataTableBase, {
  Root,
  Toolbar,
  Search,
  FiltersButton,
  FilterPanel,
  ActiveFilterChips,
  ColumnsButton,
  DensityButton,
  ExportButton,
  SelectionBar,
  ErrorBanner: ErrorBannerPart,
  Container,
  Table: TableElement,
  LoadingOverlay,
  Pagination,
}) as unknown as DataTableComponent;
