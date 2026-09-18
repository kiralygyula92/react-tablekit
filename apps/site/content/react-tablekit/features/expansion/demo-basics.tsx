import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(40);

/**
 * Collapsible row content: `renderDetailPanel` adds a full-width row under the expanded
 * one, with an expand toggle column. The panel is sticky-left, so it stays put while a wide table
 * scrolls sideways.
 */
export default function DetailPanelsExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={peopleColumns}
      getRowId={(p) => p.id}
      renderDetailPanel={({ row }) => (
        <dl className="example-dl">
          <dt>Email</dt>
          <dd>
            <code>{row.original.email}</code>
          </dd>
          <dt>City</dt>
          <dd>{row.original.city ?? 'Unknown'}</dd>
          <dt>Joined</dt>
          <dd>{row.original.joined}</dd>
          <dt>Remote</dt>
          <dd>{row.original.remote ? 'Yes' : 'No'}</dd>
        </dl>
      )}
      initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
    />
  );
}
