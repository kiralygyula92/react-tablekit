import { useId, useState } from 'react';
import { DataTable, getPageItems, type PageItem, type PaginationVariant } from 'react-tablekit';
import { generatePeople } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(235);
const columns = peopleColumns.slice(0, 4);
const VARIANTS: PaginationVariant[] = ['numbered', 'compact', 'simple', 'loadMore'];

const render = (items: PageItem[]) =>
  items
    .map((i) => (i.type === 'page' ? (i.selected ? `[${i.index + 1}]` : String(i.index + 1)) : '…'))
    .join(' ');

/** Algorithm visualizer: classic (boundary + window rule) vs stable (constant width). */
function Visualizer() {
  const [pageCount, setPageCount] = useState(24);
  const [pageIndex, setPageIndex] = useState(0);
  const pageId = useId();
  const countId = useId();
  const classic = getPageItems({ pageIndex, pageCount });
  const stable = getPageItems({ pageIndex, pageCount, algorithm: 'stable' });
  return (
    <section className="example-panel" aria-labelledby={`${pageId}-title`}>
      <h2 id={`${pageId}-title`}>Page-item algorithms</h2>
      <div className="example-controls">
        <label htmlFor={countId}>
          Pages: {pageCount}
          <input
            id={countId}
            type="range"
            min={1}
            max={50}
            value={pageCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              setPageCount(n);
              setPageIndex((i) => Math.min(i, n - 1));
            }}
          />
        </label>
        <label htmlFor={pageId}>
          Current page: {pageIndex + 1}
          <input
            id={pageId}
            type="range"
            min={0}
            max={pageCount - 1}
            value={pageIndex}
            onChange={(e) => setPageIndex(Number(e.target.value))}
          />
        </label>
      </div>
      <dl className="example-dl">
        <dt>classic ({classic.length} items)</dt>
        <dd>
          <code data-testid="classic-items">{render(classic)}</code>
        </dd>
        <dt>stable ({stable.length} items)</dt>
        <dd>
          <code data-testid="stable-items">{render(stable)}</code>
        </dd>
      </dl>
    </section>
  );
}

/** Every pagination variant side by side, plus the page-size selector and row range. */
export default function PaginationVariantsExample() {
  return (
    <div className="example-stack">
      {VARIANTS.map((variant) => (
        <section key={variant} className="example-panel" aria-label={`${variant} pagination`}>
          <h2>{variant}</h2>
          <DataTable
            aria-label={`People (${variant} pagination)`}
            data={data}
            columns={columns}
            getRowId={(p) => p.id}
            toolbar={false}
            initialState={{ pagination: { pageIndex: 0, pageSize: 5 } }}
            pagination={{
              variant,
              pageSizeOptions: [5, 10, 25],
              showRowRange: true,
              showFirstLast: variant === 'compact',
            }}
          />
        </section>
      ))}
      <Visualizer />
    </div>
  );
}
