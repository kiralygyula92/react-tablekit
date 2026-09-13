import type { ChangeEvent } from 'react';
import type { Row, TableInstance } from '../../core/types';
import { useView } from '../context';
import { renderIcon } from '../renderIcon';
import type { DataTableProps } from '../types';

type AnyTable = TableInstance<unknown>;

const viewOptions = (table: AnyTable) => table.options as unknown as DataTableProps<unknown>;

/** Header checkbox: all/some/none for the page or all rows (per `selectAllMode`). */
export function SelectAllHeader({ table }: { table: AnyTable }) {
  const { slots, t, handle } = useView();
  if (table.options.enableMultiRowSelection === false) return null;
  const scope = table.options.selectAllMode === 'all' ? 'all' : 'page';
  const all = scope === 'all' ? table.getIsAllRowsSelected() : table.getIsAllPageRowsSelected();
  const some = scope === 'all' ? table.getIsSomeRowsSelected() : table.getIsSomePageRowsSelected();
  return (
    <slots.SelectionCheckbox
      checked={all}
      indeterminate={!all && some}
      disabled={table.getRowModel().rows.length === 0}
      label={t(scope === 'all' ? 'selectAll' : 'selectAllOnPage')}
      onChange={(value) =>
        void handle('onSelectAll', { value, scope }, (ctx) =>
          ctx.scope === 'all'
            ? table.toggleAllRowsSelected(ctx.value)
            : table.toggleAllPageRowsSelected(ctx.value),
        )
      }
    />
  );
}

/** Runs the `onRowSelect` handler (with Shift-range support). */
export function selectRow(
  view: ReturnType<typeof useView>,
  table: AnyTable,
  row: Row<unknown>,
  value: boolean,
  shiftKey: boolean,
  event: unknown,
) {
  const range =
    shiftKey &&
    view.props.enableRangeSelection !== false &&
    row.getCanMultiSelect() &&
    table._selectionAnchor !== undefined &&
    table._selectionAnchor !== row.id;
  return view.handle('onRowSelect', { row, value, range, event }, (ctx) => {
    if (ctx.range && table._selectionAnchor)
      table.selectRange(table._selectionAnchor, ctx.row.id, ctx.value);
    else ctx.row.toggleSelected(ctx.value);
    const count = table.getSelectedCount();
    view.announce(view.t('announceSelection', { count }));
  });
}

/** Row checkbox, or a radio in single-selection mode (05 §5). */
export function SelectCell({ row, table }: { row: Row<unknown>; table: AnyTable }) {
  const view = useView();
  if (row.getIsGrouped() && !row.getCanSelect()) return null;
  const checked = row.getIsSelected() || (row.subRows.length > 0 && row.getIsAllSubRowsSelected());
  const single = table.options.enableMultiRowSelection === false;
  return (
    <view.slots.SelectionCheckbox
      row={row}
      type={single ? 'radio' : 'checkbox'}
      checked={checked}
      indeterminate={!single && !checked && row.getIsSomeSelected()}
      disabled={!row.getCanSelect()}
      label={view.t('selectRow')}
      onChange={(value, event: ChangeEvent<HTMLInputElement>) =>
        void selectRow(view, table, row, value, (event.nativeEvent as MouseEvent).shiftKey, event)
      }
    />
  );
}

/** Header "Expand all" toggle (05 §6.3). */
export function ExpandAllHeader({ table }: { table: AnyTable }) {
  const { slots, t, icons } = useView();
  const opts = viewOptions(table);
  const enabled = opts.enableExpandAll ?? table.options.expandMode !== 'single';
  if (!enabled || !table.getCanSomeRowsExpand()) return null;
  const all = table.getIsAllRowsExpanded();
  return (
    <slots.IconButton
      size="small"
      className="tk-expand-button"
      label={t(all ? 'collapseAll' : 'expandAll')}
      aria-expanded={all}
      onClick={() => table.toggleAllRowsExpanded(!all)}
    >
      {renderIcon(all ? icons.collapseAll : icons.expandAll)}
    </slots.IconButton>
  );
}

/** Row expand toggle: `aria-expanded`, `aria-controls` and a spinner while lazy children load. */
export function ExpandCell({ row, table }: { row: Row<unknown>; table: AnyTable }) {
  const view = useView();
  if (!row.getCanExpand() || row.getIsGrouped()) return null;
  const expanded = row.getIsExpanded();
  const { loading } = table.getRowChildrenStatus(row.id);
  const hasPanel = !!table.options._hasDetailPanel;
  return (
    <view.slots.ExpandButton
      row={row}
      expanded={expanded}
      canExpand
      loading={loading}
      onToggle={() => row.toggleExpanded()}
      className="tk-expand-button"
      aria-expanded={expanded}
      aria-controls={hasPanel && expanded ? `${view.id}-detail-${row.id}` : undefined}
      aria-label={view.t(expanded ? 'collapseRow' : 'expandRow')}
      aria-busy={loading || undefined}
      data-expanded={expanded || undefined}
      onClick={(e) => {
        e.stopPropagation();
        void view.handle('onRowExpand', { row, value: !expanded }, (ctx) =>
          ctx.row.toggleExpanded(ctx.value),
        );
      }}
    >
      {loading ? <view.slots.Spinner size={14} /> : renderIcon(view.icons.expand)}
    </view.slots.ExpandButton>
  );
}

export function RowNumberHeader() {
  const { t } = useView();
  return <>{t('rowNumber')}</>;
}

/** `#` column: absolute across pages or relative to the page (05 §23). */
export function RowNumberCell({ row, table }: { row: Row<unknown>; table: AnyTable }) {
  const view = useView();
  const index = table.getRowModel().rows.indexOf(row);
  const { pageIndex, pageSize } = table.getState().pagination;
  const offset = view.props.rowNumberMode === 'relative' ? 0 : pageIndex * pageSize;
  return <>{view.formatters.number(offset + index + 1, view.locale)}</>;
}

export function ActionsHeader() {
  const { t } = useView();
  return <>{t('rowActions')}</>;
}
