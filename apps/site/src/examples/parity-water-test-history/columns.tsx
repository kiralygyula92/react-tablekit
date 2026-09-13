import { ActionButton, createColumnHelper } from 'react-tablekit';
import type { WaterTestHistoryItem } from '../../mock/types';
import { FileIcon, PaperPlaneIcon } from '../icons';

/** Handlers passed through `meta`, so the columns are created once at module scope (10 §3.1). */
export interface WaterTestMeta {
  onResend: (test: WaterTestHistoryItem) => void;
  onViewReport: (test: WaterTestHistoryItem) => void;
}

const col = createColumnHelper<WaterTestHistoryItem>();
const meta = (table: { options: { meta?: unknown } }) => table.options.meta as WaterTestMeta;

const dateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/** The 16 chemical columns of 01 §5.3, in order, with their Skimmer widths. */
const CHEMICALS: { id: keyof WaterTestHistoryItem; header: string; width: string; min: string }[] =
  [
    { id: 'pH', header: 'pH', width: '5%', min: '80px' },
    { id: 'totalChlorine', header: 'Total chlorine', width: '6%', min: '96px' },
    { id: 'freeChlorine', header: 'Free chlorine', width: '6%', min: '96px' },
    { id: 'salt', header: 'Salt', width: '5%', min: '80px' },
    { id: 'cyanuricAcid', header: 'Cyanuric acid', width: '6%', min: '96px' },
    { id: 'totalAlkalinity', header: 'Total alkalinity', width: '7%', min: '112px' },
    // Skimmer labels `calciumHardness` as "Total hardness".
    { id: 'calciumHardness', header: 'Total hardness', width: '7%', min: '112px' },
    { id: 'totalDissolvedSolids', header: 'Total dissolved solids', width: '8%', min: '128px' },
    { id: 'phosphates', header: 'Phosphates', width: '6%', min: '96px' },
    { id: 'iron', header: 'Iron', width: '5%', min: '80px' },
    { id: 'totalBromine', header: 'Total bromine', width: '6%', min: '96px' },
    { id: 'borate', header: 'Borate', width: '5%', min: '80px' },
    { id: 'copper', header: 'Copper', width: '5%', min: '80px' },
    { id: 'biguanide', header: 'Biguanide', width: '6%', min: '96px' },
    { id: 'biguanideShock', header: 'Biguanide shock', width: '7%', min: '112px' },
    { id: 'waterTemperature', header: 'Water temperature', width: '7%', min: '112px' },
  ];

export const waterTestColumns = [
  col.accessor('date', {
    header: 'Date',
    type: 'date',
    width: '10%',
    minWidth: '128px',
    format: (v) => dateFormat.format(new Date(v)),
  }),
  ...CHEMICALS.map((c) =>
    col.accessor(c.id, {
      header: c.header,
      type: 'number',
      align: 'right' as const,
      width: c.width,
      minWidth: c.min,
      // Skimmer renders chemical values at weight 600.
      cellClassName: 'parity-chemical',
    }),
  ),
  col.display({
    id: 'actions',
    header: 'Actions',
    align: 'right',
    width: '6%',
    minWidth: '90px',
    // `stickyActions` defaults to true on this screen.
    pin: 'right',
    static: true,
    cell: ({ row, table }) => (
      <>
        <ActionButton
          icon={<PaperPlaneIcon />}
          label="Resend"
          disabled={!row.original.pdfId}
          onClick={() => meta(table).onResend(row.original)}
        />
        <ActionButton
          icon={<FileIcon />}
          label="View report"
          disabled={!row.original.pdfUrl}
          onClick={() => meta(table).onViewReport(row.original)}
        />
      </>
    ),
  }),
];
