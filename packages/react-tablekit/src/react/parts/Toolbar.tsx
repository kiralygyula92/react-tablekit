import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { TableInstance } from '../../core/types';
import { useOptionalTable, useView } from '../context';
import type { DataTableProps } from '../types';
import { cx } from '../utils';
import { ActiveFilterChips, FiltersButton } from './filters';
import { useTableVersion } from './layout';
import { Search } from './Search';

type AnyTable = TableInstance<unknown>;

/** `DataTable.ColumnsButton`: visibility (and ordering) menu. */
export function ColumnsButton<TData>({ table: tableProp }: { table?: TableInstance<TData> }) {
  const table = useOptionalTable(tableProp) as AnyTable;
  useTableVersion(table);
  const view = useView();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const columns = table.getAllLeafColumns();
  if (table.options.enableHiding === false || !columns.some((c) => c.getCanHide())) return null;
  const base = {
    ref: anchorRef,
    columns,
    table,
    'aria-haspopup': 'dialog' as const,
    'aria-expanded': open,
    onClick: () => setOpen((o) => !o),
  };
  return (
    <>
      <view.slots.ColumnsButton
        // eslint-disable-next-line react-hooks/refs -- view.slot only merges props; it never reads refs or calls handlers during render
        {...(view.slot('ColumnsButton', { columns }, base) as typeof base)}
      />
      <view.slots.Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        label={view.t('columns')}
        placement="bottom-end"
      >
        <view.slots.ColumnsMenu columns={columns} table={table} onClose={() => setOpen(false)} />
      </view.slots.Popover>
    </>
  );
}

/** `DataTable.DensityButton`. */
export function DensityButton<TData>({ table: tableProp }: { table?: TableInstance<TData> }) {
  const table = useOptionalTable(tableProp) as AnyTable;
  useTableVersion(table);
  const view = useView();
  const density = table.getState().density;
  const base = { density, setDensity: table.setDensity };
  return <view.slots.DensityButton {...(view.slot('DensityButton', base, base) as typeof base)} />;
}

/** Saves a blob as a file via a temporary `<a download>`. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `DataTable.ExportButton`: CSV page / all matching / selected, and copy. */
export function ExportButton<TData>({ table: tableProp }: { table?: TableInstance<TData> }) {
  const table = useOptionalTable(tableProp) as AnyTable;
  useTableVersion(table);
  const view = useView();
  const { slots, t, props } = view;
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const opts = props as DataTableProps<unknown>;

  const run = (scope: 'page' | 'all' | 'selected' | 'clipboard') => {
    setOpen(false);
    void view.handle('onExport', { scope, format: 'csv' }, async (ctx) => {
      if (ctx.scope !== 'clipboard' && opts.onExport) {
        await opts.onExport(table.getQuery(), ctx.scope);
        return;
      }
      abort.current = new AbortController();
      setProgress(0);
      try {
        if (ctx.scope === 'clipboard') {
          await table.copyToClipboard();
        } else {
          const csv = await table.exportCsv({
            scope: ctx.scope,
            onProgress: setProgress,
            signal: abort.current.signal,
          });
          const name = `${opts.exportFileName ?? 'export'}.csv`;
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          (opts.onExportFile ?? downloadBlob)(blob, name);
        }
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError')
          table.options.onError?.(error, table.getQuery());
      } finally {
        setProgress(null);
        abort.current = null;
      }
    });
  };

  const exportAllAllowed =
    !table.options.manualPagination || !!table.options.dataSource || !!opts.onExport;
  const base = {
    ref: anchorRef,
    onExport: run,
    progress,
    'aria-expanded': open,
    onClick: () => (progress === null ? setOpen((o) => !o) : abort.current?.abort()),
    title: progress === null ? undefined : t('cancel'),
  };
  return (
    <>
      <slots.ExportButton
        // eslint-disable-next-line react-hooks/refs -- view.slot only merges props; it never reads refs or calls handlers during render
        {...(view.slot('ExportButton', { onExport: run, progress }, base) as typeof base)}
      />
      <slots.Menu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        label={t('export')}
        placement="bottom-end"
      >
        <slots.MenuItem onClick={() => run('page')}>{t('exportPage')}</slots.MenuItem>
        {exportAllAllowed && (
          <slots.MenuItem onClick={() => run('all')}>{t('exportAll')}</slots.MenuItem>
        )}
        {!!table.options.enableRowSelection && (
          <slots.MenuItem disabled={table.getSelectedCount() === 0} onClick={() => run('selected')}>
            {t('exportSelected')}
          </slots.MenuItem>
        )}
        <slots.MenuItem onClick={() => run('clipboard')}>{t('copyToClipboard')}</slots.MenuItem>
      </slots.Menu>
    </>
  );
}

/** `DataTable.SelectionBar`. */
export function SelectionBar<TData>({ table: tableProp }: { table?: TableInstance<TData> }) {
  const table = useOptionalTable(tableProp) as AnyTable;
  useTableVersion(table);
  const view = useView();
  const props = view.props as DataTableProps<unknown>;
  const multi = table.options.enableRowSelection && table.options.enableMultiRowSelection !== false;
  if (!multi || props.showSelectionBar === false) return null;
  const selectedCount = table.getSelectedCount();
  const totalCount = table.getRowCount();
  const allMatchingSelected = table.getIsAllMatchingSelected();
  const canSelectAll = table.options.selectAllMode === 'all' || !table.options.manualPagination;
  const onSelectAllMatching = canSelectAll ? () => table.selectAllMatching() : undefined;
  const onClear = () => table.resetRowSelection(true);
  const bulkActions = props.renderBulkActions?.({
    table,
    selectedRows: table.getSelectedRowModel().rows,
    selectionQuery: table.getSelectionQuery(),
  });
  const base = {
    selectedCount,
    totalCount,
    allMatchingSelected,
    onSelectAllMatching,
    onClear,
    bulkActions,
    table,
    className: 'tk-selection-bar',
  };
  const { className: _c, ...ctx } = base;
  return <view.slots.SelectionBar {...(view.slot('SelectionBar', ctx, base) as typeof base)} />;
}

/** Whether any built-in toolbar control is enabled (drives the default `toolbar` value). */
export function hasToolbarFeatures(table: AnyTable, props: DataTableProps<unknown>): boolean {
  return (
    (table.options.enableGlobalFilter ?? true) ||
    props.filterDisplayMode === 'panel' ||
    props.filterDisplayMode === 'popover' ||
    !!props.enableDensityToggle ||
    !!props.enableExport ||
    props.toolbarActions !== undefined ||
    !!props.renderToolbarStart ||
    !!props.renderToolbarEnd
  );
}

/** `DataTable.Toolbar`: `[search, filters, chips] … [actions, density, columns, export]`. */
export function Toolbar<TData>({
  table: tableProp,
  className,
  style,
  children,
}: {
  table?: TableInstance<TData>;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const table = useOptionalTable(tableProp) as AnyTable;
  useTableVersion(table);
  const view = useView();
  const props = view.props as DataTableProps<unknown>;
  const actions =
    typeof props.toolbarActions === 'function' ? props.toolbarActions(table) : props.toolbarActions;
  const showColumns = table.options.enableHiding ?? true;
  const base = {
    className: cx('tk-toolbar', className),
    style,
    table,
    'aria-label': view.t('toolbar'),
  };
  return (
    <view.slots.Toolbar {...(view.slot('Toolbar', {}, base) as typeof base)}>
      {children ?? (
        <>
          <div className="tk-toolbar__start">
            {props.renderToolbarStart ? (
              props.renderToolbarStart(table)
            ) : (
              <>
                <Search />
                <FiltersButton />
              </>
            )}
          </div>
          <div className="tk-toolbar__end">
            {props.renderToolbarEnd ? (
              props.renderToolbarEnd(table)
            ) : (
              <>
                {actions}
                {props.enableDensityToggle && <DensityButton />}
                {showColumns && <ColumnsButton />}
                {props.enableExport && <ExportButton />}
              </>
            )}
          </div>
          {props.filterDisplayMode !== 'none' && (
            <div className="tk-toolbar__chips">
              <ActiveFilterChips />
            </div>
          )}
        </>
      )}
    </view.slots.Toolbar>
  );
}
