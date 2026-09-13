import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '../../mock/data/people';
import { peopleColumns } from '../columns';

const data = generatePeople(40);

/**
 * The cards layout (05 §13): below the mobile breakpoint each row renders as a card with
 * label/value pairs instead of a horizontally scrolling table — semantically a list of articles.
 * Narrow the preview (or your window) below 960px to see it switch.
 */
export default function ResponsiveCardsExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={peopleColumns}
      getRowId={(p) => p.id}
      responsive={{
        mobileLayout: 'cards',
        mobileBreakpoint: 'md',
        cardColumns: ['name', 'email', 'department', 'city', 'salary'],
      }}
      initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
    />
  );
}
