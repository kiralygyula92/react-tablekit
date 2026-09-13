import { useEffect, useState } from 'react';
import { DataTable } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '../../mock/data/people';
import { peopleColumns } from '../columns';

const data = generatePeople(120);

/**
 * URL and storage persistence (03 §7). The page, sort, search and filters live in the URL in a
 * compact, stable format (`?tk.page=2&tk.sort=name.asc&tk.q=ava`), so a link restores the exact
 * view; column layout and density go to `localStorage` instead, because they are personal
 * preferences rather than something you share.
 *
 * With a router, pass its search params through `useRouterSync` instead of the History API.
 */
export default function UrlSyncExample() {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const update = () => setUrl(window.location.search || '(no parameters yet)');
    update();
    // The table writes with history.replaceState, which fires no event; poll for the demo.
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="example-stack">
      <p className="site-muted">
        Sort, search, filter or page, then reload — the view comes back. Current URL state:{' '}
        <code>{url}</code>
      </p>
      <DataTable<DemoPerson>
        aria-label="People"
        data={data}
        columns={peopleColumns}
        getRowId={(p) => p.id}
        enableHiding
        enableDensityToggle
        showActiveFilterChips
        syncState={{
          url: { keys: ['pagination', 'sorting', 'globalFilter', 'columnFilters'] },
          storage: { key: 'react-tablekit:url-sync-demo', version: 1 },
        }}
        initialState={{ pagination: { pageIndex: 0, pageSize: 8 } }}
      />
    </div>
  );
}
