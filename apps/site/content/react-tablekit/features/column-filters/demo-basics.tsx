import { DataTable } from 'react-tablekit';
import { generatePeople } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(150);

/**
 * The default filter panel (05 §3.1): a "Filters" button with an active count, one control per
 * filterable column (text, select, multi-select, range, date range, boolean), active filter chips
 * with per-chip removal, and facet counts taken from the data.
 */
export default function FiltersPanelExample() {
  return (
    <DataTable
      aria-label="People"
      data={data}
      columns={peopleColumns}
      getRowId={(p) => p.id}
      filterDisplayMode="panel"
      showActiveFilterChips
      showFacetCounts
      initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
    />
  );
}
