import { useState } from 'react';
import { createColumnHelper, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '../../mock/data/people';

const data = generatePeople(60);
const col = createColumnHelper<DemoPerson>();
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/**
 * `pin` on a column is the declarative form; `lockPin` stops the user changing it from the
 * column menu. A pin may also be responsive — here the name stays pinned only from `md` up,
 * because on a phone a pinned column would eat most of the screen.
 */
const columns = [
  col.accessor((p) => `${p.firstName} ${p.lastName}`, {
    id: 'name',
    header: 'Name',
    pin: { base: false, md: 'left' },
    lockPin: true,
  }),
  col.accessor('email', { header: 'Email' }),
  col.accessor('department', { header: 'Department' }),
  col.accessor('city', { header: 'City' }),
  col.accessor('age', { header: 'Age', type: 'number' }),
  col.accessor('joined', { header: 'Joined', type: 'date' }),
  col.accessor('status', { header: 'Status' }),
  col.accessor('remote', { header: 'Remote', type: 'boolean' }),
  col.accessor('salary', {
    header: 'Salary',
    type: 'number',
    format: (v) => money.format(v),
    pin: 'right',
  }),
];

/**
 * Pinned columns (05 §12) stay put while the rest scrolls sideways, and the scroll shadows
 * show which side still has content. Flip the direction to see that pinning follows the
 * writing direction: in RTL the "left" side is rendered on the right.
 */
export default function ColumnPinningExample() {
  const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr');

  return (
    <div className="example-stack">
      <div className="example-controls">
        <button type="button" onClick={() => setDir((d) => (d === 'ltr' ? 'rtl' : 'ltr'))}>
          Direction: {dir.toUpperCase()}
        </button>
      </div>

      <DataTable<DemoPerson>
        aria-label="People"
        data={data}
        columns={columns}
        getRowId={(p) => p.id}
        dir={dir}
        enableColumnPinning
        enableColumnActions
        maxHeight={420}
        enableStickyHeader
        initialState={{ pagination: { pageIndex: 0, pageSize: 20 } }}
      />
    </div>
  );
}
