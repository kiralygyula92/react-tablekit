import { createColumnHelper, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';

const data = generatePeople(50);
const col = createColumnHelper<DemoPerson>();
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

/**
 * `type` is the one setting that moves several defaults at once: alignment, the comparator,
 * the filter control and the formatter. Everything it picks can still be overridden per column.
 */
const columns = [
  col.accessor((p) => `${p.firstName} ${p.lastName}`, {
    id: 'name',
    header: 'Name',
    type: 'text',
    getSearchValue: (p) => `${p.firstName} ${p.lastName} ${p.email}`,
  }),
  // Numbers align right and sort numerically without being told to.
  col.accessor('age', { header: 'Age', type: 'number' }),
  col.accessor('salary', {
    header: 'Salary',
    type: 'number',
    format: (v) => money.format(v),
  }),
  // Dates sort chronologically; `format` decides only what is displayed, searched and exported.
  col.accessor('joined', {
    header: 'Joined',
    type: 'date',
    format: (v) => date.format(new Date(v)),
  }),
  col.accessor('remote', {
    header: 'Remote',
    type: 'boolean',
    align: 'center',
    format: (v) => (v ? 'Yes' : 'No'),
  }),
  // `city` is absent for roughly one row in six — that is what the fallback is for.
  col.accessor('city', {
    header: 'City',
    renderFallbackValue: <span className="site-muted">unknown</span>,
  }),
  // A display column has no value of its own: it is computed, so it cannot be sorted or filtered.
  col.display({
    id: 'tenure',
    header: 'Tenure',
    align: 'right',
    cell: ({ row }) => {
      const years = Math.max(
        0,
        new Date().getFullYear() - new Date(row.original.joined).getFullYear(),
      );
      return years === 0 ? 'First year' : `${String(years)} yr`;
    },
  }),
];

/** Column types, formatting, alignment and fallback values (05 §2). */
export default function ColumnTypesExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={columns}
      getRowId={(p) => p.id}
      enableColumnFilters
      initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
    />
  );
}
