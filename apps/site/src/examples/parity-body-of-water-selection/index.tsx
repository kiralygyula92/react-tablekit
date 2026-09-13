import { useMemo, useState } from 'react';
import { ActionButton, createColumnHelper, DataTable, TruncatedText } from 'react-tablekit';
import { generateCustomers, getCustomerBodiesOfWater } from '../../mock/data/customers';
import type { BodyOfWater } from '../../mock/types';
import { PenIcon } from '../icons';
import { ParityPage, useParityTheme } from '../ParityFrame';

const col = createColumnHelper<BodyOfWater>();
const gallons = new Intl.NumberFormat('en-US');
const dateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});
const dash = (v: string | undefined) => v ?? '-';

/** The Body-of-Water selection columns of 01 §5.4: everything sortable except notes and actions. */
const columns = [
  col.accessor('type', { header: 'Type', width: '10%', minWidth: '80px' }),
  col.accessor('gallons', {
    header: 'Volume',
    type: 'number',
    width: '10%',
    minWidth: '96px',
    format: (v) => `${gallons.format(v)} gal`,
  }),
  col.accessor('surfaceType', {
    header: 'Surface type',
    width: '15%',
    minWidth: '128px',
    format: dash,
  }),
  col.accessor('sanitizer', { header: 'Sanitizer', width: '15%', minWidth: '128px', format: dash }),
  col.accessor('classification', {
    header: 'Classification',
    width: '15%',
    minWidth: '128px',
    format: dash,
  }),
  col.accessor('location', { header: 'Location', width: '10%', minWidth: '96px', format: dash }),
  col.accessor('groundLevel', {
    header: 'Ground level',
    width: '15%',
    minWidth: '128px',
    format: dash,
  }),
  col.accessor('filter', { header: 'Filter', width: '10%', minWidth: '96px', format: dash }),
  col.accessor('buildDateUTC', {
    header: 'Build date',
    type: 'date',
    width: '15%',
    minWidth: '128px',
    format: (v) => (v ? dateFormat.format(new Date(v)) : '-'),
  }),
  col.accessor('builder', { header: 'Builder', width: '15%', minWidth: '128px', format: dash }),
  col.accessor('notes', {
    header: 'Notes',
    width: '15%',
    minWidth: '160px',
    enableSorting: false,
    cell: ({ getValue }) => <TruncatedText text={getValue()} maxChars={30} />,
  }),
  col.display({
    id: 'actions',
    header: 'Actions',
    align: 'right',
    width: '5%',
    minWidth: '48px',
    pin: 'right',
    static: true,
    enableSorting: false,
    cell: () => <ActionButton icon={<PenIcon />} label="Edit" onClick={() => undefined} />,
  }),
];

/**
 * Skimmer's Body-of-Water selection modal, 1:1 (01 §5.4): the one client-mode table — client
 * sorting, client pagination of 10, single selection by row click or radio, a scrollable
 * container with a sticky header (fixes B14) and `stickyActions`.
 */
export default function ParityBodyOfWaterSelection() {
  const { theme, toggle } = useParityTheme();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const rows = useMemo(() => generateCustomers(40).flatMap((c) => getCustomerBodiesOfWater(c)), []);
  const selectedId = Object.keys(selected).find((id) => selected[id]);

  return (
    <ParityPage>
      {toggle}
      <h3 className="parity-title">Select a body of water</h3>
      <DataTable<BodyOfWater>
        aria-label="body of water selection table"
        data={rows}
        columns={columns}
        getRowId={(b) => b.id}
        theme={theme}
        toolbar={false}
        enableRowSelection
        enableMultiRowSelection={false}
        selectOnRowClick
        state={{ rowSelection: selected }}
        onRowSelectionChange={(updater) =>
          setSelected((prev) => (typeof updater === 'function' ? updater(prev) : updater))
        }
        enableStickyHeader
        maxHeight={400}
        initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
      />
      <p className="site-muted" role="status">
        {selectedId ? `Selected: ${selectedId}` : 'Nothing selected yet.'}
      </p>
    </ParityPage>
  );
}
