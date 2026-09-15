import { ActionButton, createColumnHelper } from 'react-tablekit';
import type { Reading } from '../../mock/types';
import { FileIcon, PaperPlaneIcon } from '../icons';

/** Handlers passed through `meta`, so the columns are created once at module scope. */
export interface ReadingsMeta {
  onResend: (reading: Reading) => void;
  onViewReport: (reading: Reading) => void;
}

const col = createColumnHelper<Reading>();
const meta = (table: { options: { meta?: unknown } }) => table.options.meta as ReadingsMeta;

const dateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/** Sixteen numeric metrics, which is what makes this table wider than any viewport. */
const METRICS: { id: keyof Reading; header: string; width: string; min: string }[] = [
  { id: 'loadFactor', header: 'Load factor', width: '5%', min: '80px' },
  { id: 'inputVoltage', header: 'Input voltage', width: '6%', min: '96px' },
  { id: 'outputVoltage', header: 'Output voltage', width: '6%', min: '96px' },
  { id: 'throughput', header: 'Throughput', width: '5%', min: '80px' },
  { id: 'errorRate', header: 'Error rate', width: '6%', min: '96px' },
  { id: 'queueDepth', header: 'Queue depth', width: '7%', min: '112px' },
  { id: 'memoryUsed', header: 'Memory used', width: '7%', min: '112px' },
  { id: 'diskUsed', header: 'Disk used', width: '8%', min: '128px' },
  { id: 'packetLoss', header: 'Packet loss', width: '6%', min: '96px' },
  { id: 'jitter', header: 'Jitter', width: '5%', min: '80px' },
  { id: 'latency', header: 'Latency', width: '6%', min: '96px' },
  { id: 'uptimeDays', header: 'Uptime (days)', width: '5%', min: '80px' },
  { id: 'fanSpeed', header: 'Fan speed', width: '5%', min: '80px' },
  { id: 'powerDraw', header: 'Power draw', width: '6%', min: '96px' },
  { id: 'peakDraw', header: 'Peak draw', width: '7%', min: '112px' },
  { id: 'temperature', header: 'Temperature', width: '7%', min: '112px' },
];

export const readingColumns = [
  col.accessor('date', {
    header: 'Date',
    type: 'date',
    width: '10%',
    minWidth: '128px',
    format: (v) => dateFormat.format(new Date(v)),
  }),
  ...METRICS.map((m) =>
    col.accessor(m.id, {
      header: m.header,
      type: 'number',
      align: 'right' as const,
      width: m.width,
      minWidth: m.min,
      // Measured values are emphasised so they stand out from the labels.
      cellClassName: 'showcase-metric',
    }),
  ),
  col.display({
    id: 'actions',
    header: 'Actions',
    align: 'right',
    width: '6%',
    minWidth: '90px',
    // Pinned right, so the actions stay put while the metrics scroll sideways.
    pin: 'right',
    static: true,
    cell: ({ row, table }) => (
      <>
        <ActionButton
          icon={<PaperPlaneIcon />}
          label="Resend"
          disabled={!row.original.reportId}
          onClick={() => meta(table).onResend(row.original)}
        />
        <ActionButton
          icon={<FileIcon />}
          label="View report"
          disabled={!row.original.reportUrl}
          onClick={() => meta(table).onViewReport(row.original)}
        />
      </>
    ),
  }),
];
