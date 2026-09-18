import { useDataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(90);

/**
 * No table markup at all. `useDataTable` is the whole engine — searching, sorting,
 * selection and pagination — and it renders nothing, so the rows can become anything. Here they
 * are a grid of cards.
 *
 * Note what this example does *not* do: it does not reuse the library's cell components. Those
 * are part of the table's own rendering and need its context. Headless means reading values off
 * the instance and deciding the presentation yourself — here, the column's `format` is applied
 * so money and dates still read the way they do in a table.
 */
export default function HeadlessExample() {
  const table = useDataTable<DemoPerson>({
    'aria-label': 'People',
    data,
    columns: peopleColumns,
    getRowId: (p) => p.id,
    enableRowSelection: true,
    initialState: { pagination: { pageIndex: 0, pageSize: 9 } },
  });

  const { globalFilter, pagination } = table.getState();
  const rows = table.getRowModel().rows;
  const pageCount = table.getPageCount();

  // A card has no header row, so each field carries its own label.
  const labels = new Map(
    table.getLeafHeaders().map((header) => {
      const heading = header.column.columnDef.header;
      return [header.column.id, typeof heading === 'string' ? heading : header.column.id];
    }),
  );

  return (
    <div className="example-stack">
      <label className="site-field">
        <span>Search</span>
        <input
          type="search"
          value={globalFilter}
          placeholder="Name, email, city…"
          onChange={(e) => table.setGlobalFilter(e.target.value)}
        />
      </label>

      <p className="site-muted" aria-live="polite">
        {table.getRowCount()} people
      </p>

      <ul className="headless-cards">
        {rows.map((row) => (
          <li key={row.id}>
            <article className="headless-card" data-selected={row.getIsSelected() || undefined}>
              <label className="headless-card__select">
                <input
                  type="checkbox"
                  checked={row.getIsSelected()}
                  onChange={() => {
                    row.toggleSelected();
                  }}
                />
                <span className="site-visually-hidden">Select this person</span>
              </label>
              <dl>
                {row.getVisibleCells().map((cell) => {
                  const value: unknown = cell.getValue();
                  const format = cell.column.columnDef.format as
                    ((v: never, row: DemoPerson) => string) | undefined;
                  // Without a formatter only a primitive is safe to print: anything else would
                  // stringify as "[object Object]", so it reads as missing instead.
                  const printable =
                    (typeof value === 'string' && value !== '') ||
                    typeof value === 'number' ||
                    typeof value === 'boolean';
                  const text = format
                    ? format(value as never, row.original)
                    : printable
                      ? String(value)
                      : '—';
                  return (
                    <div key={cell.id}>
                      <dt>{labels.get(cell.column.id)}</dt>
                      <dd>{text}</dd>
                    </div>
                  );
                })}
              </dl>
            </article>
          </li>
        ))}
        {rows.length === 0 && <li className="site-muted">Nobody matches that search.</li>}
      </ul>

      <nav className="example-controls" aria-label="Pagination">
        <button
          type="button"
          onClick={() => {
            table.setPageIndex((i) => i - 1);
          }}
          disabled={pagination.pageIndex === 0}
        >
          ← Previous
        </button>
        <span>
          Page {pagination.pageIndex + 1} of {Math.max(1, pageCount)}
        </span>
        <button
          type="button"
          onClick={() => {
            table.setPageIndex((i) => i + 1);
          }}
          disabled={pagination.pageIndex >= pageCount - 1}
        >
          Next →
        </button>
      </nav>
    </div>
  );
}
