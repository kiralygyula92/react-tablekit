import { useState } from 'react';
import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(40);

/**
 * Surface and corners. `card` wraps the table and its pagination in one panel; `plain` removes it
 * so the table sits on whatever the page provides, with the pagination as a block beneath.
 */
export default function SurfaceExample() {
  const [surface, setSurface] = useState<'card' | 'plain'>('card');
  const [rounded, setRounded] = useState(true);

  return (
    <>
      <fieldset className="demo-controls">
        <legend>Surface</legend>
        {(['card', 'plain'] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="surface"
              value={value}
              checked={surface === value}
              onChange={() => setSurface(value)}
            />
            {value}
          </label>
        ))}
        <label>
          <input type="checkbox" checked={rounded} onChange={(e) => setRounded(e.target.checked)} />
          rounded
        </label>
      </fieldset>
      <DataTable<DemoPerson>
        aria-label="People"
        data={data}
        columns={peopleColumns}
        getRowId={(p) => p.id}
        surface={surface}
        rounded={rounded}
        initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
      />
    </>
  );
}
