import { useEffect, useMemo, useState } from 'react';
import {
  classicTheme,
  compactTheme,
  darkTheme,
  DataTable,
  createLocalDataSource,
  lightTheme,
  minimalTheme,
  type TableQuery,
  type TableTheme,
} from 'react-tablekit';
import de from 'react-tablekit/locales/de';
import es from 'react-tablekit/locales/es';
import hu from 'react-tablekit/locales/hu';
import { peopleColumns } from '../examples/columns';
import { buildOrgTree, type OrgNode } from '../examples/orgTree';
import { generateCustomers } from '../mock/data/customers';
import { generatePeople, type DemoPerson } from '../mock/data/people';
import { useDocumentTitle } from '../layout/useDocumentTitle';
import {
  changedValues,
  decodeHash,
  defaultValues,
  encodeHash,
  SCHEMA,
  type PlaygroundValues,
} from './playground/schema';

const THEMES: Record<string, TableTheme> = {
  light: lightTheme,
  classic: classicTheme,
  dark: darkTheme,
  compact: compactTheme,
  minimal: minimalTheme,
};
const LOCALES = { en: undefined, hu, de, es } as const;

/** Builds the props the live table gets, from the control values. */
function useTableProps(values: PlaygroundValues) {
  const rowCount = Number(values.rowCount);
  const dataset = String(values.dataset);

  const data = useMemo(() => {
    if (dataset === 'customers') return generateCustomers(Math.min(rowCount, 235));
    if (dataset === 'tree') return buildOrgTree();
    return generatePeople(dataset === 'generated-10k' ? 10_000 : rowCount);
  }, [dataset, rowCount]);

  const server = values.dataMode === 'server';
  const dataSource = useMemo(
    () =>
      server
        ? createLocalDataSource(data as DemoPerson[], {
            columns: peopleColumns,
            getRowId: (p: DemoPerson) => p.id,
            latencyMs: Number(values.latencyMs),
            failRate: Number(values.failRate),
          })
        : undefined,
    [server, data, values.latencyMs, values.failRate],
  );

  return { data, dataSource, server, dataset };
}

/** Renders the generated TSX for the non-default options (08 §4). */
function generatedCode(values: PlaygroundValues): string {
  const changed = changedValues(values);
  const skip = new Set(['dataset', 'rowCount', 'latencyMs', 'failRate', 'locale', 'theme']);
  const props = Object.entries(changed)
    .filter(([key]) => !skip.has(key))
    .map(([key, value]) => {
      if (key === 'paginationVariant') return `  pagination={{ variant: '${String(value)}' }}`;
      if (key === 'pageSize')
        return `  initialState={{ pagination: { pageIndex: 0, pageSize: ${String(value)} } }}`;
      if (key === 'mobileLayout') return `  responsive={{ mobileLayout: '${String(value)}' }}`;
      if (key === 'density') return `  initialState={{ density: '${String(value)}' }}`;
      if (typeof value === 'boolean') return value ? `  ${key}` : `  ${key}={false}`;
      if (typeof value === 'number') return `  ${key}={${String(value)}}`;
      return `  ${key}="${value}"`;
    });
  if (changed.theme) props.unshift(`  theme={${String(changed.theme)}Theme}`);
  if (values.dataMode === 'server') props.unshift('  dataSource={dataSource}');
  else props.unshift('  data={data}');
  return `<DataTable\n  aria-label="People"\n${props.join('\n')}\n  columns={columns}\n  getRowId={(row) => row.id}\n/>`;
}

/** `/playground`: every option as a control, a live table, and the code that produces it. */
export function PlaygroundPage() {
  useDocumentTitle('Playground');
  const [values, setValues] = useState<PlaygroundValues>(() =>
    typeof window === 'undefined' ? defaultValues() : decodeHash(window.location.hash),
  );
  const [tab, setTab] = useState<'code' | 'state' | 'query'>('code');
  const [queryLog, setQueryLog] = useState<string[]>([]);
  const { data, dataSource, server, dataset } = useTableProps(values);

  // The control state lives in the URL hash, so a configuration is shareable.
  useEffect(() => {
    const hash = encodeHash(values);
    const next = `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ''}`;
    window.history.replaceState(null, '', next);
  }, [values]);

  const set = (id: string, value: string | number | boolean) =>
    setValues((prev) => ({ ...prev, [id]: value }));

  const onQueryChange = (query: TableQuery, change: { reason: string }) =>
    setQueryLog((prev) =>
      [
        `${change.reason}: page ${String(query.pagination.pageIndex + 1)}${
          query.globalFilter ? `, q="${query.globalFilter}"` : ''
        }${query.sorting.length > 0 ? `, sort ${query.sorting.map((s) => s.id).join(',')}` : ''}`,
        ...prev,
      ].slice(0, 8),
    );

  // Every dataset is rendered through the people columns, so the row type is uniform here.
  const rows = data as DemoPerson[];
  // Hoisted so TypeScript can narrow them away when they are absent (English, unknown preset).
  const localization = LOCALES[String(values.locale) as keyof typeof LOCALES];
  const theme = THEMES[String(values.theme)];
  const table = (
    <DataTable<DemoPerson>
      key={`${dataset}-${String(values.dataMode)}-${String(values.locale)}`}
      aria-label="Playground"
      {...(server && dataSource ? { dataSource } : { data: rows })}
      columns={peopleColumns}
      getRowId={(row) => row.id}
      {...(theme ? { theme } : {})}
      {...(localization ? { localization } : {})}
      {...(dataset === 'tree'
        ? {
            getSubRows: (n: DemoPerson) =>
              (n as unknown as OrgNode).children as unknown as DemoPerson[] | undefined,
          }
        : {})}
      enableSorting={Boolean(values.enableSorting)}
      enableMultiSort={Boolean(values.enableMultiSort)}
      enableGlobalFilter={Boolean(values.enableGlobalFilter)}
      highlightSearchMatches={Boolean(values.highlightSearchMatches)}
      enableColumnFilters={Boolean(values.enableColumnFilters)}
      filterDisplayMode={String(values.filterDisplayMode) as 'panel'}
      showActiveFilterChips={Boolean(values.showActiveFilterChips)}
      enableRowSelection={Boolean(values.enableRowSelection)}
      enableMultiRowSelection={Boolean(values.enableMultiRowSelection)}
      enableExpanding={Boolean(values.enableExpanding)}
      enableGrouping={Boolean(values.enableGrouping)}
      enableHiding={Boolean(values.enableHiding)}
      enableColumnActions={Boolean(values.enableColumnActions)}
      enableColumnResizing={Boolean(values.enableColumnResizing)}
      enableColumnOrdering={Boolean(values.enableColumnOrdering)}
      enableDensityToggle={Boolean(values.enableDensityToggle)}
      enableExport={Boolean(values.enableExport)}
      enableKeyboardNavigation={Boolean(values.enableKeyboardNavigation)}
      enableStickyHeader={Boolean(values.enableStickyHeader)}
      enableRowVirtualization={Boolean(values.enableRowVirtualization)}
      enablePagination={Boolean(values.enablePagination)}
      pagination={{
        variant: String(values.paginationVariant) as 'numbered',
        showRowRange: Boolean(values.showRowRange),
      }}
      responsive={{ mobileLayout: String(values.mobileLayout) as 'scroll' }}
      {...(Boolean(values.enableRowVirtualization) || Boolean(values.enableStickyHeader)
        ? { maxHeight: 460 }
        : {})}
      onQueryChange={onQueryChange}
      initialState={{
        pagination: { pageIndex: 0, pageSize: Number(values.pageSize) },
        density: String(values.density) as 'standard',
      }}
    />
  );

  return (
    <div className="playground">
      <aside className="playground__controls" aria-label="Options">
        <div className="playground__head">
          <h1>Playground</h1>
          <button type="button" onClick={() => setValues(defaultValues())}>
            Reset
          </button>
        </div>
        {SCHEMA.map((group) => (
          <details key={group.id} open={group.id !== 'appearance'}>
            <summary>{group.label}</summary>
            <div className="playground__group">
              {group.controls.map((control) => (
                <label key={control.id} className="playground__control">
                  <span>{control.label}</span>
                  {control.kind === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={Boolean(values[control.id])}
                      onChange={(e) => set(control.id, e.target.checked)}
                    />
                  ) : control.kind === 'select' ? (
                    <select
                      value={String(values[control.id])}
                      onChange={(e) => set(control.id, e.target.value)}
                    >
                      {(control.options ?? []).map((option) => (
                        <option key={String(option)} value={String(option)}>
                          {String(option)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      value={Number(values[control.id])}
                      min={control.min}
                      max={control.max}
                      step={control.id === 'failRate' ? 0.1 : 1}
                      onChange={(e) => set(control.id, Number(e.target.value))}
                    />
                  )}
                </label>
              ))}
            </div>
          </details>
        ))}
      </aside>

      <main className="playground__preview">
        {table}
        <div className="playground__output">
          <div role="tablist" aria-label="Output" className="example-tabs">
            {(['code', 'state', 'query'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
              >
                {t === 'code' ? 'Code' : t === 'state' ? 'Options' : 'Query log'}
              </button>
            ))}
          </div>
          {tab === 'code' && (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable (axe)
            <pre className="site-code" tabIndex={0}>
              <code>{generatedCode(values)}</code>
            </pre>
          )}
          {tab === 'state' && (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable (axe)
            <pre className="site-code" tabIndex={0}>
              <code>{JSON.stringify(changedValues(values), null, 2)}</code>
            </pre>
          )}
          {tab === 'query' && (
            <ol className="example-log">
              {queryLog.length === 0 ? (
                <li className="example-pending">Interact with the table to see its query.</li>
              ) : (
                queryLog.map((line, i) => (
                  <li key={`${line}-${String(i)}`}>
                    <code>{line}</code>
                  </li>
                ))
              )}
            </ol>
          )}
        </div>
      </main>
    </div>
  );
}
