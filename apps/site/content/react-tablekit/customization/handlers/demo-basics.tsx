import { useState } from 'react';
import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(60);

/**
 * Handler middleware (06 §5): every interaction runs through an overridable handler that receives
 * the intent and a `next` to run the default. You can observe it, change it, or cancel it by not
 * calling `next` — here sorting is logged, paging past page 3 is blocked, and a search shorter
 * than two characters is rewritten to an empty one.
 */
export default function HandlersMiddlewareExample() {
  const [log, setLog] = useState<string[]>([]);
  const add = (line: string) => setLog((prev) => [line, ...prev].slice(0, 6));

  return (
    <div className="example-stack">
      <DataTable<DemoPerson>
        aria-label="People"
        data={data}
        columns={peopleColumns}
        getRowId={(p) => p.id}
        handlers={{
          onSortToggle: (ctx, next) => {
            add(`sort → ${ctx.column.id}`);
            return next(ctx);
          },
          onPageChange: (ctx, next) => {
            if (ctx.pageIndex > 2) {
              add(`page ${String(ctx.pageIndex + 1)} blocked by middleware`);
              return;
            }
            return next(ctx);
          },
          onGlobalFilterInput: (ctx, next) => {
            const value = ctx.value.length < 2 ? '' : ctx.value;
            add(`search → ${JSON.stringify(value)}`);
            return next({ ...ctx, value });
          },
        }}
        initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
      />
      <section className="example-panel">
        <h2>Handler log</h2>
        {log.length === 0 ? (
          <p className="example-pending">Sort a column, search, or try to reach page 4.</p>
        ) : (
          <ol className="example-log">
            {log.map((line, i) => (
              <li key={`${line}-${String(i)}`}>
                <code>{line}</code>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
