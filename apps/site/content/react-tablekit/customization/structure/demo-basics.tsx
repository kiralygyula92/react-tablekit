import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(40);

/**
 * Re-skinning without replacing anything. `unstyled` drops the visual layer but keeps
 * the markup and behaviour, and `classNames` puts your own class on each part, the same shape
 * a utility framework such as Tailwind expects. The keys are the camelCase slot names.
 *
 * A class can also be a function of the row, which is how the zebra striping and the muted
 * suspended rows below are done.
 */
export default function SlotsDesignSystemExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={peopleColumns}
      getRowId={(p) => p.id}
      unstyled
      classNames={{
        root: 'ds',
        toolbar: 'ds-toolbar',
        table: 'ds-table',
        headerCell: 'ds-th',
        cell: 'ds-td',
        row: ({ row }) =>
          [
            'ds-tr',
            row.index % 2 === 1 ? 'ds-tr--alt' : '',
            row.original.status === 'suspended' ? 'ds-tr--muted' : '',
          ]
            .filter(Boolean)
            .join(' '),
        pagination: 'ds-pager',
      }}
      enableRowSelection
      initialState={{ pagination: { pageIndex: 0, pageSize: 6 } }}
    />
  );
}
