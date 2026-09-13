import type { Cell, Column, TableInstance } from '../../core/types';
import { useTableContext, useView } from '../context';
import type { DataTableProps } from '../types';
import { cx } from '../utils';
import { isDisplayColumn, renderCellContent } from './cells';
import { SelectCell } from './displayCells';
import { useTableVersion } from './layout';

type AnyTable = TableInstance<unknown>;
const opts = (table: AnyTable) => table.options as unknown as DataTableProps<unknown>;

/** The card's accessible name: its first field when that is text, otherwise the row id. */
const cardTitle = (value: unknown, rowId: string): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : rowId;

/**
 * The field label of a card. A card has no header row, so only a plain string header (or the
 * column id) can label the value.
 */
function cardLabel(column: Column<unknown>): string {
  const header = column.columnDef.header;
  return typeof header === 'string' ? header : column.id;
}

/** The columns shown on a card: `cardColumns` when given, otherwise every non-display column. */
function cardColumns(table: AnyTable): Column<unknown>[] {
  const ids = opts(table).responsive?.cardColumns;
  const visible = table.getVisibleLeafColumns();
  if (!ids) return visible.filter((c) => !isDisplayColumn(c));
  return ids.map((id) => visible.find((c) => c.id === id)).filter((c) => c !== undefined);
}

/**
 * The mobile cards layout (05 §13): each row becomes an article with label/value pairs, the
 * selection checkbox in its header and the row actions in its footer. Semantically a list of
 * articles, so screen readers announce "list, N items" instead of a table.
 */
export function CardsView() {
  const table = useTableContext();
  useTableVersion(table);
  const view = useView();
  const props = view.props;
  const rows = table.getRowModel().rows;
  const columns = cardColumns(table);
  const actionsCell = (cells: Cell<unknown>[]) => cells.find((c) => c.column.id === 'tk-actions');
  const selectable = !!table.options.enableRowSelection;

  if (rows.length === 0) return null;

  return (
    <ul className="tk-cards" data-density={table.getState().density}>
      {rows.map((row) => {
        const cells = row.getVisibleCells();
        const renderCard = props.responsive?.renderCard;
        if (renderCard) {
          return (
            <li key={row.id} className="tk-card-item">
              {renderCard({ row, table })}
            </li>
          );
        }
        const actions = actionsCell(cells);
        const titleColumn = columns[0];
        const title = titleColumn ? cells.find((c) => c.column.id === titleColumn.id) : undefined;
        return (
          <li key={row.id} className="tk-card-item">
            <article
              className={cx('tk-card', props.getRowClassName?.(row))}
              data-row-id={row.id}
              data-selected={row.getIsSelected() || undefined}
              aria-label={cardTitle(title?.getValue(), row.id)}
            >
              {(selectable || title) && (
                <header className="tk-card__header">
                  {selectable && <SelectCell row={row} table={table} />}
                  {title && (
                    <span className="tk-card__title">{renderCellContent(title, view)}</span>
                  )}
                </header>
              )}
              <dl className="tk-card__fields">
                {columns.slice(title ? 1 : 0).map((column) => {
                  const cell = cells.find((c) => c.column.id === column.id);
                  if (!cell) return null;
                  return (
                    <div key={column.id} className="tk-card__field">
                      <dt className="tk-card__label">{cardLabel(column)}</dt>
                      <dd className="tk-card__value">{renderCellContent(cell, view)}</dd>
                    </div>
                  );
                })}
              </dl>
              {actions && (
                <footer className="tk-card__actions">{renderCellContent(actions, view)}</footer>
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/** Whether the table should render as cards at the current breakpoint (05 §13). */
export function useCardsLayout(): boolean {
  const table = useTableContext();
  const view = useView();
  return view.isMobile && opts(table).responsive?.mobileLayout === 'cards';
}
