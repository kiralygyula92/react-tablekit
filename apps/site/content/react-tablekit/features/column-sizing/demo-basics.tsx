import { useState } from 'react';
import { createColumnHelper, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';

const data = generatePeople(40);
const col = createColumnHelper<DemoPerson>();

/**
 * Two ways to size a column, mixed deliberately:
 *
 * - `width` is CSS, so a percentage stays proportional as the table grows;
 * - `size` is a pixel number and is what dragging the resize handle changes,
 *   bounded by `minSize` / `maxSize`.
 */
const columns = [
  col.accessor((p) => `${p.firstName} ${p.lastName}`, {
    id: 'name',
    header: 'Name (30%)',
    width: '30%',
    minSize: 120,
  }),
  col.accessor('email', { header: 'Email (size 260)', size: 260, minSize: 140, maxSize: 420 }),
  col.accessor('department', { header: 'Department', size: 160 }),
  col.accessor('city', { header: 'City', size: 120 }),
  // A fixed, unresizable column: the handle is not rendered at all.
  col.accessor('age', { header: 'Age', type: 'number', size: 80, enableResizing: false }),
];

/**
 * Column sizing. Drag a header's trailing edge, or focus it and press ←/→ (Shift for
 * a 50px step). `'onChange'` resizes live while dragging; `'onEnd'` waits for the release,
 * which is the better choice for very wide tables. Double-click a handle (or use "Autosize"
 * in the ⋮ menu) to fit the column to its content.
 */
export default function ColumnSizingExample() {
  const [mode, setMode] = useState<'onChange' | 'onEnd'>('onChange');

  return (
    <div className="example-stack">
      <div className="example-controls">
        <label className="site-field">
          <span>Resize mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as 'onChange' | 'onEnd')}>
            <option value="onChange">onChange (live)</option>
            <option value="onEnd">onEnd (on release)</option>
          </select>
        </label>
      </div>

      <DataTable<DemoPerson>
        aria-label="People"
        data={data}
        columns={columns}
        getRowId={(p) => p.id}
        enableColumnResizing
        columnResizeMode={mode}
        enableColumnActions
        initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
      />
    </div>
  );
}
