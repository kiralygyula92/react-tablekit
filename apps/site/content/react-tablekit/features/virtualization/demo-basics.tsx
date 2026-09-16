import { useMemo, useState } from 'react';
import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

/**
 * 100 000 rows in one scroll container (05 §14): only the rows near the viewport are in the DOM,
 * with spacer rows keeping the scrollbar honest. Sorting, searching and filtering still run over
 * the whole dataset, and the table exposes grid semantics so screen readers get the real totals.
 */
export default function Virtualization100kExample() {
  const [count, setCount] = useState(100_000);
  const data = useMemo(() => generatePeople(count), [count]);

  return (
    <div className="example-stack">
      <div className="example-controls">
        <label>
          <span>Rows</span>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[1_000, 10_000, 100_000].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString('en-US')}
              </option>
            ))}
          </select>
        </label>
        <p className="site-muted">
          Scroll the table: the DOM keeps only the visible window, however far you go.
        </p>
      </div>
      <DataTable<DemoPerson>
        aria-label="People"
        data={data}
        columns={peopleColumns}
        getRowId={(p) => p.id}
        enablePagination={false}
        enableRowVirtualization
        enableStickyHeader
        maxHeight={460}
        estimateRowHeight={44}
      />
    </div>
  );
}
