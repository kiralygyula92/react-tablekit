import { DataTable } from 'react-tablekit';
import { generatePeople } from '../../mock/data/people';
import { peopleColumns } from '../columns';

const data = generatePeople(120);

/** The minimal table: `data` + `columns` (plus an accessible name and stable row ids). */
export default function BasicExample() {
  return (
    <DataTable aria-label="People" data={data} columns={peopleColumns} getRowId={(p) => p.id} />
  );
}
