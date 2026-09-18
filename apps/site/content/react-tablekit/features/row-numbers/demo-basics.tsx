import { useState } from 'react';
import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(40);

/**
 * Row numbers. `absolute` counts through the whole result — row 11 is the first row of
 * page 2 — while `relative` restarts at 1 on every page. Page forward to see the difference.
 */
export default function RowNumbersExample() {
  const [mode, setMode] = useState<'absolute' | 'relative'>('absolute');

  return (
    <>
      <fieldset className="demo-controls">
        <legend>Numbering</legend>
        {(['absolute', 'relative'] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="row-number-mode"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
            />
            {value}
          </label>
        ))}
      </fieldset>
      <DataTable<DemoPerson>
        aria-label="People"
        data={data}
        columns={peopleColumns}
        getRowId={(p) => p.id}
        enableRowNumbers
        rowNumberMode={mode}
        initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
      />
    </>
  );
}
