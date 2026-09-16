import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(40);

/**
 * Row appearance (05 §23). Striping and hover are table-wide switches; `getRowClassName` and
 * `getRowStyle` decorate individual rows from their data — here, suspended people are dimmed and
 * remote workers carry an accent border.
 */
export default function RowAppearanceExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={peopleColumns}
      getRowId={(p) => p.id}
      enableStriped
      enableHover
      getRowClassName={(row) => (row.original.status === 'suspended' ? 'is-muted' : undefined)}
      getRowStyle={(row) =>
        row.original.remote ? { boxShadow: 'inset 3px 0 0 var(--tk-color-accent)' } : undefined
      }
      initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
    />
  );
}
