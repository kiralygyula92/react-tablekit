import { useState } from 'react';
import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(60);

/**
 * Row selection: multi with a tri-state header checkbox, Shift+click range selection,
 * row-click selection, disabled rows that select-all skips, and a selection bar with bulk actions.
 * Switch to single mode to get radio semantics, as a picker dialog would.
 */
export default function RowSelectionExample() {
  const [multi, setMulti] = useState(true);
  const [log, setLog] = useState<string | null>(null);

  return (
    <div className="example-stack">
      <div className="example-controls">
        <label>
          <span>Mode</span>
          <select
            value={multi ? 'multi' : 'single'}
            onChange={(e) => setMulti(e.target.value === 'multi')}
          >
            <option value="multi">Multi (checkboxes)</option>
            <option value="single">Single (radios)</option>
          </select>
        </label>
        <p className="site-muted">
          Suspended people are disabled: they cannot be selected, and “select all” skips them.
        </p>
      </div>
      <DataTable<DemoPerson>
        key={multi ? 'multi' : 'single'}
        aria-label="People"
        data={data}
        columns={peopleColumns}
        getRowId={(p) => p.id}
        enableRowSelection={(row) => row.original.status !== 'suspended'}
        enableMultiRowSelection={multi}
        enableRangeSelection={multi}
        selectOnRowClick
        renderBulkActions={({ selectedRows }) => (
          <button
            type="button"
            onClick={() => setLog(`Emailed ${String(selectedRows.length)} people`)}
          >
            Email selected
          </button>
        )}
        initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
      />
      <p className="example-ok" role="status">
        {log ?? ''}
      </p>
    </div>
  );
}
