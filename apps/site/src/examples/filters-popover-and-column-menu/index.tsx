import { DataTable } from 'react-tablekit';
import { generatePeople } from '../../mock/data/people';
import { peopleColumns } from '../columns';

const data = generatePeople(150);

/**
 * `filterDisplayMode="popover"` plus `enableColumnActions` (05 §3.1): the same controls in a
 * popover anchored to the Filters button, and a "Filter…" entry in each column's actions menu that
 * opens just that column's filter.
 */
export default function FiltersPopoverExample() {
  return (
    <DataTable
      aria-label="People"
      data={data}
      columns={peopleColumns}
      getRowId={(p) => p.id}
      filterDisplayMode="popover"
      enableColumnActions
      enableHiding
      showActiveFilterChips
      initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
    />
  );
}
