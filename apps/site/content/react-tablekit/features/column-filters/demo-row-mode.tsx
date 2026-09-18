import { DataTable } from 'react-tablekit';
import { generatePeople } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(150);

/**
 * `filterDisplayMode="row"`: a second header row with an inline control under each
 * filterable column. Tab order follows the columns, so keyboard users can filter without leaving
 * the header.
 */
export default function FiltersRowExample() {
  return (
    <DataTable
      aria-label="People"
      data={data}
      columns={peopleColumns}
      getRowId={(p) => p.id}
      filterDisplayMode="row"
      showActiveFilterChips
      initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
    />
  );
}
