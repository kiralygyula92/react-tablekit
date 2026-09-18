import { createColumnHelper, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';

const data = generatePeople(60);
const col = createColumnHelper<DemoPerson>();
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/**
 * Column footers. A footer is either a renderer or an aggregate over the filtered rows —
 * `footerAggregationScope` is what decides whether "total" means this page or the whole result.
 */
const columns = [
  col.accessor((p) => `${p.firstName} ${p.lastName}`, {
    id: 'name',
    header: 'Name',
    footer: ({ table }) => `${table.getFilteredRowModel().rows.length} people`,
  }),
  col.accessor('department', { header: 'Department', filterVariant: 'select' }),
  col.accessor('age', { header: 'Age', type: 'number', aggregationFn: 'mean' }),
  col.accessor('salary', {
    header: 'Salary',
    type: 'number',
    format: (v) => money.format(v),
    aggregationFn: 'sum',
  }),
];

export default function ColumnFootersExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="Payroll"
      data={data}
      columns={columns}
      getRowId={(p) => p.id}
      enableColumnFooters
      footerAggregationScope="filtered"
      initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
    />
  );
}
