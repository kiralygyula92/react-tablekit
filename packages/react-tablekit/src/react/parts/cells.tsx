import type { ReactNode } from 'react';
import { resolveResponsive } from '../../core/responsive';
import type { Cell, CellContext, Column, Header, Row, TableInstance } from '../../core/types';
import { escapeRegExp, fold, humanize } from '../../core/utils';
import { useView } from '../context';
import { DISPLAY_COLUMN_IDS } from '../displayColumns';
import { flexRender } from '../flexRender';
import { renderIcon } from '../renderIcon';
import type { DataTableProps } from '../types';
import type { ResolvedView } from '../view';
import { selectRow } from './displayCells';

const DISPLAY_IDS = new Set<string>(Object.values(DISPLAY_COLUMN_IDS));
export const isDisplayColumn = (column: Column<unknown>) => DISPLAY_IDS.has(column.id);

const isEmpty = (v: unknown) => v === undefined || v === null || v === '';

/** Wraps case/diacritic-insensitive matches of the search words in `<mark>`. */
export function highlight(text: string, query: string): ReactNode {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length || !text) return text;
  // Map folded indices back to the original string (folding can shorten characters).
  const map: number[] = [];
  let folded = '';
  let index = 0;
  for (const ch of text) {
    const f = fold(ch);
    for (const _ of f) map.push(index);
    folded += f;
    index += ch.length;
  }
  map.push(text.length);
  const re = new RegExp(words.map(escapeRegExp).join('|'), 'g');
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of folded.matchAll(re)) {
    if (!m[0]) continue;
    const start = map[m.index] ?? 0;
    const end = map[m.index + m[0].length] ?? text.length;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <mark key={start} className="tk-highlight">
        {text.slice(start, end)}
      </mark>,
    );
    last = end;
  }
  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** The default `cell` renderer: formatted value, fallback for empty values, optional highlight. */
export function DefaultCell({ ctx }: { ctx: CellContext<unknown, unknown> }): ReactNode {
  const value = ctx.getValue();
  const opts = ctx.table.options as unknown as DataTableProps<unknown> & {
    highlightSearchMatches?: boolean;
  };
  if (isEmpty(value) || (Array.isArray(value) && value.length === 0)) {
    return (ctx.column.columnDef.renderFallbackValue ??
      ctx.table.options.renderFallbackValue ??
      '—') as ReactNode;
  }
  const text = ctx.formattedValue;
  if (opts.highlightSearchMatches) {
    const query = ctx.table.getQuery().globalFilter;
    if (query && ctx.column.getCanGlobalFilter()) return highlight(text, query);
  }
  return text;
}

/** Renders the content of a body cell (grouped / aggregated / placeholder / normal). */
export function renderCellContent(cell: Cell<unknown>, view: ResolvedView): ReactNode {
  const { column, row } = cell;
  const def = column.columnDef;
  const ctx = cell.getContext();
  if (cell.getIsGrouped()) return <GroupToggle row={row} column={column} ctx={ctx} />;
  if (cell.getIsPlaceholder()) return null;
  if (cell.getIsAggregated()) {
    if (def.aggregatedCell) return flexRender(def.aggregatedCell, ctx);
    const v = cell.getValue();
    return typeof v === 'number'
      ? view.formatters.number(v, view.locale)
      : (ctx.formattedValue as ReactNode);
  }
  if (row.getIsGrouped() && !isDisplayColumn(column)) return null;
  const content = def.cell ? flexRender(def.cell, ctx) : <DefaultCell ctx={ctx} />;
  const truncate = def.truncate;
  if (truncate) {
    const lines = typeof truncate === 'object' ? truncate.lines : undefined;
    const tooltip = typeof truncate === 'object' ? truncate.tooltip !== false : true;
    const inner = (
      <span
        className="tk-truncate"
        data-lines={lines}
        style={lines ? { WebkitLineClamp: lines } : undefined}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focusable so keyboard users can reveal the tooltip
        tabIndex={tooltip ? 0 : undefined}
      >
        {content}
      </span>
    );
    return tooltip ? (
      <view.slots.Tooltip content={ctx.formattedValue}>{inner}</view.slots.Tooltip>
    ) : (
      inner
    );
  }
  return content;
}

function GroupToggle({
  row,
  column,
  ctx,
}: {
  row: Row<unknown>;
  column: Column<unknown>;
  ctx: CellContext<unknown, unknown>;
}) {
  const view = useView();
  const expanded = row.getIsExpanded();
  const def = column.columnDef;
  const fallback = (def.renderFallbackValue ??
    ctx.table.options.renderFallbackValue ??
    '—') as ReactNode;
  const label = def.groupedCell ? flexRender(def.groupedCell, ctx) : ctx.formattedValue || fallback;
  return (
    <button
      type="button"
      className="tk-group-toggle"
      aria-expanded={expanded}
      aria-label={`${view.t(expanded ? 'collapseRow' : 'expandRow')}: ${ctx.formattedValue}`}
      data-expanded={expanded || undefined}
      onClick={(e) => {
        e.stopPropagation();
        void view.handle('onRowExpand', { row, value: !expanded }, (c) =>
          c.row.toggleExpanded(c.value),
        );
      }}
    >
      <span className="tk-group-toggle__icon" aria-hidden="true">
        {renderIcon(view.icons.expand)}
      </span>
      <span className="tk-group-toggle__label">{label}</span>
      <span className="tk-group-toggle__count">
        (
        {view.formatters.number(
          row.getLeafRows().filter((r) => !r.getIsGrouped()).length,
          view.locale,
        )}
        )
      </span>
    </button>
  );
}

/** Header label: `headerShort` at small breakpoints, else `header`, else the humanized id. */
export function headerLabel(header: Header<unknown>, view: ResolvedView): ReactNode {
  const def = header.column.columnDef;
  if (def.headerShort !== undefined) {
    const short = resolveResponsive(def.headerShort, view.breakpoint);
    if (short !== undefined && short !== null) return short as ReactNode;
  }
  if (def.header === undefined) return humanize(header.column.id);
  return flexRender(def.header, header.getContext());
}

/** Plain-text header for announcements and labels. */
export function headerText(column: Column<unknown>): string {
  const h = column.columnDef.header;
  return typeof h === 'string' ? h : humanize(column.id);
}

/** Default sort toggle behaviour (routed through `handlers.onSortToggle`). */
export function toggleSort(
  view: ResolvedView,
  table: TableInstance<unknown>,
  column: Column<unknown>,
  event: React.MouseEvent | React.KeyboardEvent,
) {
  const isMulti =
    table.options.isMultiSortEvent ?? ((e: unknown) => !!(e as { shiftKey?: boolean }).shiftKey);
  return view.handle(
    'onSortToggle',
    { column, multi: isMulti(event), event, desc: undefined },
    (ctx) => {
      ctx.column.toggleSorting(ctx.desc, ctx.multi);
      const sorted = ctx.column.getIsSorted();
      view.announce(
        sorted
          ? view.t('announceSort', {
              column: headerText(ctx.column),
              direction: view.t(sorted === 'asc' ? 'sortedAscending' : 'sortedDescending'),
            })
          : view.t('announceSortCleared'),
      );
    },
  );
}

/** Default row click: selection / expansion per options, then the `onRowClick` prop. */
export function rowClick(
  view: ResolvedView,
  table: TableInstance<unknown>,
  row: Row<unknown>,
  event: React.MouseEvent,
) {
  const opts = view.props as DataTableProps<unknown>;
  return view.handle('onRowClick', { row, event }, (ctx) => {
    if (opts.selectOnRowClick && ctx.row.getCanSelect()) {
      void selectRow(view, table, ctx.row, !ctx.row.getIsSelected(), ctx.event.shiftKey, ctx.event);
    }
    if (opts.expandOnRowClick && ctx.row.getCanExpand()) {
      void view.handle('onRowExpand', { row: ctx.row, value: !ctx.row.getIsExpanded() }, (c) =>
        c.row.toggleExpanded(c.value),
      );
    }
    opts.onRowClick?.(ctx.row, ctx.event);
  });
}
