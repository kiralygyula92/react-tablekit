import {
  ActionButton,
  ChipList,
  createColumnHelper,
  DataTable,
  MultiLineList,
  RowActionsMenu,
  TruncatedText,
  TwoLineText,
} from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';

const data = generatePeople(30);
const col = createColumnHelper<DemoPerson>();

/**
 * Inline 16px line icons drawn like the table's own, so the example needs no icon dependency.
 * In an application these would come from whatever icon set the rest of the product uses.
 */
const LineIcon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={d} />
  </svg>
);
const MailIcon = () => <LineIcon d="M2.5 4h11v8h-11zM2.5 4.5 8 8.5l5.5-4" />;
const CopyIcon = () => <LineIcon d="M5.5 5.5h8v8h-8zM2.5 10.5v-8h8" />;
const TrashIcon = () => <LineIcon d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 9h6l.5-9" />;
const OpenIcon = () => <LineIcon d="M6.5 3.5h-3v9h9v-3M9 3h4v4M13 3 7.5 8.5" />;

const skillsFor = (p: DemoPerson) =>
  ['TypeScript', 'React', 'CSS', 'Testing', 'Node', 'SQL'].slice(0, (p.age % 5) + 1);

const columns = [
  // Two lines: a strong identity line and a muted qualifier, in one cell.
  col.accessor((p) => `${p.firstName} ${p.lastName}`, {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <TwoLineText
        primary={`${row.original.firstName} ${row.original.lastName}`}
        secondary={row.original.city}
      />
    ),
  }),
  // One item per line, with a fallback when the list is empty.
  col.display({
    id: 'contact',
    header: 'Contact',
    cell: ({ row }) => (
      <MultiLineList
        items={[row.original.email, `${row.original.department} team`]}
        empty="No contact details"
      />
    ),
  }),
  // A wrapping chip list that collapses the tail into a "+N" chip.
  col.display({
    id: 'skills',
    header: 'Skills',
    cell: ({ row }) => <ChipList items={skillsFor(row.original)} maxVisible={3} />,
  }),
  // Long text, clipped with the full value in a tooltip.
  col.display({
    id: 'notes',
    header: 'Notes',
    cell: ({ row }) => (
      <TruncatedText
        text={`${row.original.firstName} joined the ${row.original.department} team in ${row.original.joined} and is currently ${row.original.status}.`}
        maxChars={40}
      />
    ),
  }),
  // Inline actions plus an overflow menu; `danger` marks the destructive one.
  col.display({
    id: 'actions',
    header: 'Actions',
    align: 'right',
    size: 140,
    pin: 'right',
    cell: ({ row }) => (
      <RowActionsMenu
        inlineCount={1}
        actions={[
          {
            label: `Email ${row.original.firstName}`,
            icon: <MailIcon />,
            onClick: () => window.alert(`Email ${row.original.email}`),
          },
          {
            label: 'Duplicate',
            icon: <CopyIcon />,
            onClick: () => window.alert('Duplicated'),
          },
          {
            label: 'Delete',
            icon: <TrashIcon />,
            danger: true,
            disabled: row.original.status === 'suspended',
            onClick: () => window.alert('Deleted'),
          },
        ]}
      />
    ),
  }),
  // A single action button, with its label doubling as the tooltip and the accessible name.
  col.display({
    id: 'open',
    header: '',
    align: 'center',
    size: 60,
    cell: ({ row }) => (
      <ActionButton
        icon={<OpenIcon />}
        label={`Open ${row.original.firstName}'s profile`}
        onClick={() => window.alert(row.original.id)}
      />
    ),
  }),
];

/** The cell primitives, each solving a layout problem that recurs in every table. */
export default function CellBuildingBlocksExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={columns}
      getRowId={(p) => p.id}
      initialState={{ pagination: { pageIndex: 0, pageSize: 6 } }}
    />
  );
}
