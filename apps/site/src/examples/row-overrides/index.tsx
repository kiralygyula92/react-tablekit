import { useState } from 'react';
import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '../../mock/data/people';
import { peopleColumns } from '../columns';

const data = generatePeople(40);

/**
 * Row-level overrides (06 §4): `renderRow` wraps or replaces a row while still calling
 * `defaultRender`, `getRowProps` adds attributes and events, `getRowClassName` styles state, and
 * disabled rows ignore clicks.
 */
export default function RowOverridesExample() {
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  return (
    <div className="example-stack">
      <DataTable<DemoPerson>
        aria-label="People"
        data={data}
        columns={peopleColumns}
        getRowId={(p) => p.id}
        getRowClassName={(row) => (row.original.remote ? 'example-row--remote' : undefined)}
        getRowProps={(row) => ({ 'data-department': row.original.department })}
        enableRowSelection={(row) => row.original.status !== 'suspended'}
        onRowClick={(row) => setLastClicked(row.original.email)}
        renderRow={({ row, defaultRender }) => (
          <>
            {defaultRender()}
            {row.original.status === 'invited' && (
              <tr className="example-note-row">
                <td colSpan={peopleColumns.length + 1}>
                  Invitation pending since {row.original.joined}
                </td>
              </tr>
            )}
          </>
        )}
        initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
      />
      <p className="site-muted" role="status">
        {lastClicked ? `Clicked ${lastClicked}` : 'Click a row (suspended rows are disabled).'}
      </p>
    </div>
  );
}
