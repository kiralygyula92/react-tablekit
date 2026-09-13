import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createLocalDataSource,
  DataTable,
  type QueryChangeReason,
  type TableQuery,
} from 'react-tablekit';
import { generatePeople, type DemoPerson } from '../../mock/data/people';
import { peopleColumns } from '../columns';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000 } },
});

/** Stands in for a real HTTP endpoint, with latency so the cache is observable. */
const api = createLocalDataSource(generatePeople(500), {
  columns: peopleColumns,
  getRowId: (p: DemoPerson) => p.id,
  latencyMs: 500,
});

/**
 * The table never owns the cache here: `fetch` hands the query to React Query and returns
 * its promise. `fetchQuery` resolves from the cache when it can, so going back to a page you
 * have already seen is instant, while the table keeps doing the debouncing, aborting and
 * race-handling it always does.
 *
 * The query itself is the cache key — it is a plain serializable object, which is what makes
 * this work at all.
 */
const dataSource = {
  fetch: (query: TableQuery, ctx: { signal: AbortSignal; reason: QueryChangeReason }) =>
    queryClient.query({
      queryKey: ['people', query],
      // The context is forwarded whole: the underlying source needs the abort signal, and
      // `reason` tells it why the query changed.
      queryFn: () => api.fetch(query, ctx),
    }),
};

/** `dataSource` backed by React Query, so the two caches never disagree. */
export default function ReactQueryRecipeExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataTable<DemoPerson>
        aria-label="People"
        dataSource={dataSource}
        columns={peopleColumns}
        getRowId={(p) => p.id}
        enableGlobalFilter
        initialState={{ pagination: { pageIndex: 0, pageSize: 10 } }}
      />
    </QueryClientProvider>
  );
}
