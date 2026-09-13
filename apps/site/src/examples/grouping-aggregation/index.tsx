import { createColumnHelper, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '../../mock/data/people';

const col = createColumnHelper<DemoPerson>();
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const columns = [
  col.accessor('department', { header: 'Department', enableGrouping: true }),
  col.accessor('city', { header: 'City', enableGrouping: true }),
  col.accessor((p) => `${p.firstName} ${p.lastName}`, { id: 'name', header: 'Name' }),
  col.accessor('age', {
    header: 'Age',
    type: 'number',
    aggregationFn: 'mean',
    footer: 'Average age',
  }),
  col.accessor('salary', {
    header: 'Salary',
    type: 'number',
    format: (v) => money.format(v),
    aggregationFn: 'sum',
    footer: 'Payroll',
  }),
];

const data = generatePeople(200);

/**
 * Grouping and aggregation (05 §7): group by one or more columns from the column menu, and the
 * group rows show the value, the row count and the aggregates of the other columns. The footer
 * aggregates the whole filtered set, not just the page.
 */
export default function GroupingAggregationExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={columns}
      getRowId={(p) => p.id}
      enableGrouping
      enableColumnActions
      enableColumnFooters
      groupedColumnMode="reorder"
      initialState={{
        grouping: ['department'],
        pagination: { pageIndex: 0, pageSize: 25 },
      }}
    />
  );
}
