import { createLocalDataSource, DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '../../mock/data/people';
import { peopleColumns } from '../columns';

const people = generatePeople(5_000);
const source = createLocalDataSource(people, {
  columns: peopleColumns,
  getRowId: (p) => p.id,
  latencyMs: [200, 400],
});

/**
 * Infinite pagination (05 §4.1): instead of page buttons, reaching the end of the scroll area
 * loads the next page and appends it, with virtualization keeping the DOM small. A search or a
 * sort starts the list again from the first page.
 */
export default function InfiniteScrollExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      columns={peopleColumns}
      dataSource={source}
      getRowId={(p) => p.id}
      pagination={{ variant: 'infinite' }}
      enableRowVirtualization
      enableStickyHeader
      maxHeight={460}
      estimateRowHeight={44}
      initialState={{ pagination: { pageIndex: 0, pageSize: 50 } }}
    />
  );
}
