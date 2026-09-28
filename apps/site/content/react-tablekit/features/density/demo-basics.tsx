import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(40);

/**
 * Density changes row height and cell padding only, never the layout. The toolbar
 * button cycles compact → standard → comfortable; `initialState.density` picks the start.
 */
export default function DensityExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={peopleColumns}
      getRowId={(p) => p.id}
      enableDensityToggle
      enableRowSelection
      initialState={{ density: 'compact', pagination: { pageIndex: 0, pageSize: 8 } }}
    />
  );
}
