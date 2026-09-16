import { createColumnHelper, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';

const col = createColumnHelper<DemoPerson>();
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const columns = [
  col.accessor((p) => `${p.firstName} ${p.lastName}`, { id: 'name', header: 'Name' }),
  col.accessor('department', { header: 'Department', pin: 'left' }),
  col.accessor('city', { header: 'City' }),
  col.accessor('age', { header: 'Age', type: 'number', aggregationFn: 'mean', footer: 'Average' }),
  col.accessor('salary', {
    header: 'Salary',
    type: 'number',
    format: (v) => money.format(v),
    aggregationFn: 'sum',
    footer: 'Total',
  }),
];

const data = generatePeople(200);

/**
 * A bounded, scrollable table (05 §19): the header sticks to the top of the scroll container, the
 * footer with its aggregates sticks to the bottom, and the pinned Department column stays put in
 * both axes. Pagination lives outside the scroll area, so it is always visible.
 */
export default function StickyHeaderFooterExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={columns}
      getRowId={(p) => p.id}
      enableStickyHeader
      enableStickyFooter
      enableColumnFooters
      maxHeight={420}
      initialState={{ pagination: { pageIndex: 0, pageSize: 50 } }}
    />
  );
}
