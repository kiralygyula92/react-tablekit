import { useMemo, useState } from 'react';
import { ActionButton, createColumnHelper, DataTable, TruncatedText } from 'react-tablekit';
import { generateAccounts, getAccountAssets } from '@/mock/data/accounts';
import type { Asset } from '@/mock/types';
import { PenIcon } from '@/demo-support/icons';
import { ShowcasePage, useShowcaseTheme } from '@/demo-support/ShowcaseFrame';

const col = createColumnHelper<Asset>();
const units = new Intl.NumberFormat('en-US');
const dateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});
const dash = (v: string | undefined) => v ?? '-';

/** Everything is sortable except the notes and the actions. */
const columns = [
  col.accessor('kind', { header: 'Kind', width: '10%', minWidth: '80px' }),
  col.accessor('capacity', {
    header: 'Capacity',
    type: 'number',
    width: '10%',
    minWidth: '96px',
    format: (v) => `${units.format(v)} u/h`,
  }),
  col.accessor('enclosure', {
    header: 'Enclosure',
    width: '15%',
    minWidth: '128px',
    format: dash,
  }),
  col.accessor('powerSource', {
    header: 'Power source',
    width: '15%',
    minWidth: '128px',
    format: dash,
  }),
  col.accessor('tier', { header: 'Tier', width: '15%', minWidth: '128px', format: dash }),
  col.accessor('placement', { header: 'Placement', width: '10%', minWidth: '96px', format: dash }),
  col.accessor('mounting', { header: 'Mounting', width: '15%', minWidth: '128px', format: dash }),
  col.accessor('coolingType', { header: 'Cooling', width: '10%', minWidth: '96px', format: dash }),
  col.accessor('installedAtUTC', {
    header: 'Installed',
    type: 'date',
    width: '15%',
    minWidth: '128px',
    format: (v) => (v ? dateFormat.format(new Date(v)) : '-'),
  }),
  col.accessor('vendor', { header: 'Vendor', width: '15%', minWidth: '128px', format: dash }),
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
 * A picker, as it would appear inside a dialog: client mode throughout (client sorting and
 * paging), with single selection by row click or radio, and a sticky header inside a bounded
 * 400px scroll area so the column labels stay visible while you scan.
 */
export default function ShowcaseAssetPicker() {
  const { theme, colorScheme, toggle } = useShowcaseTheme();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const rows = useMemo(() => generateAccounts(40).flatMap((a) => getAccountAssets(a)), []);
  const selectedId = Object.keys(selected).find((id) => selected[id]);

  return (
    <ShowcasePage>
      {toggle}
      <h2 className="showcase-title">Select an asset</h2>
      <DataTable<Asset>
        aria-label="asset selection table"
        data={rows}
        columns={columns}
        getRowId={(a) => a.id}
        theme={theme}
        colorScheme={colorScheme}
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
    </ShowcasePage>
  );
}
