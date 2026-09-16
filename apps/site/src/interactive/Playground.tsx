import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react';
import {
  classicTheme,
  compactTheme,
  createLocalDataSource,
  darkTheme,
  DataTable,
  lightTheme,
  minimalTheme,
  type TableQuery,
  type TableTheme,
} from 'react-tablekit';
import de from 'react-tablekit/locales/de';
import es from 'react-tablekit/locales/es';
import hu from 'react-tablekit/locales/hu';
import { peopleColumns } from '@/demo-support/columns';
import { buildOrgTree, type OrgNode } from '@/demo-support/orgTree';
import { generateAccounts } from '@/mock/data/accounts';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { PropControl } from './playground/PropControl';
import {
  groupControls,
  jsLiteral,
  matchesFilter,
  PROP_SCHEMA,
  propsToJsx,
  readPropParams,
  unflatten,
  writePropParams,
  type PropValue,
  type PropValues,
} from './playground/props';
import {
  changedValues,
  defaultValues,
  readSetupParams,
  SCHEMA,
  writeSetupParams,
  type PlaygroundValues,
} from './playground/schema';

const THEMES: Record<string, { theme: TableTheme; name: string }> = {
  light: { theme: lightTheme, name: 'lightTheme' },
  classic: { theme: classicTheme, name: 'classicTheme' },
  dark: { theme: darkTheme, name: 'darkTheme' },
  compact: { theme: compactTheme, name: 'compactTheme' },
  minimal: { theme: minimalTheme, name: 'minimalTheme' },
};
const LOCALES = { en: undefined, hu, de, es } as const;

/** Virtualization and a sticky header only do anything inside a bounded height. */
const AUTO_MAX_HEIGHT = 460;

function readHash(): { setup: PlaygroundValues; props: PropValues } {
  if (typeof window === 'undefined') return { setup: defaultValues(), props: {} };
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return { setup: readSetupParams(params), props: readPropParams(params) };
}

/** Catches a render error so that any combination of props can be explored safely. */
class PreviewBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[playground] this combination of props threw:', error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="playground__error" role="alert">
        <p>
          <strong>This combination of props threw an error:</strong> {this.state.error.message}
        </p>
        <button type="button" onClick={this.props.onReset}>
          Reset props
        </button>
      </div>
    );
  }
}

/** `/playground`: every prop of the table as a control, a live table, and the code for it. */
export function PlaygroundPage() {
  const [initial] = useState(readHash);
  const [setup, setSetup] = useState<PlaygroundValues>(initial.setup);
  const [props, setProps] = useState<PropValues>(initial.props);
  const [filter, setFilter] = useState('');
  const [changedOnly, setChangedOnly] = useState(false);
  /** Bumped by "Reset all", so free-text controls drop their drafts. */
  const [generation, setGeneration] = useState(0);
  const [tab, setTab] = useState<'code' | 'state' | 'query'>('code');
  const [queryLog, setQueryLog] = useState<string[]>([]);

  // The whole configuration lives in the URL hash, so it can be shared as a link.
  useEffect(() => {
    const params = new URLSearchParams();
    writeSetupParams(setup, params);
    writePropParams(props, params);
    const hash = params.toString();
    const next = `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ''}`;
    window.history.replaceState(null, '', next);
  }, [setup, props]);

  const dataset = String(setup.dataset);
  const rowCount = Number(setup.rowCount);
  const fromApi = setup.source === 'api';
  const data = useMemo(() => {
    if (dataset === 'accounts') return generateAccounts(Math.min(rowCount, 235));
    if (dataset === 'tree') return buildOrgTree();
    return generatePeople(dataset === 'generated-10k' ? 10_000 : rowCount);
  }, [dataset, rowCount]);
  // Every dataset is rendered through the people columns, so the row type is uniform here.
  const rows = data as DemoPerson[];
  const dataSource = useMemo(
    () =>
      fromApi
        ? createLocalDataSource(rows, {
            columns: peopleColumns,
            getRowId: (p: DemoPerson) => p.id,
            latencyMs: Number(setup.latencyMs),
            failRate: Number(setup.failRate),
          })
        : undefined,
    [fromApi, rows, setup.latencyMs, setup.failRate],
  );

  const passed = useMemo(() => unflatten(props), [props]);
  const needsHeight =
    (passed.enableRowVirtualization === true || passed.enableStickyHeader === true) &&
    passed.maxHeight === undefined;
  const autoProps = useMemo<Record<string, unknown>>(
    () => (needsHeight ? { maxHeight: AUTO_MAX_HEIGHT } : {}),
    [needsHeight],
  );

  const setProp = (path: string, value: PropValue | undefined) =>
    setProps((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[path];
      else next[path] = value;
      return next;
    });

  const resetAll = () => {
    setSetup(defaultValues());
    setProps({});
    setGeneration((g) => g + 1);
  };

  const onQueryChange = (query: TableQuery, change: { reason: string }) =>
    setQueryLog((prev) =>
      [
        `${change.reason}: page ${String(query.pagination.pageIndex + 1)}${
          query.globalFilter ? `, q="${query.globalFilter}"` : ''
        }${query.sorting.length > 0 ? `, sort ${query.sorting.map((s) => s.id).join(',')}` : ''}`,
        ...prev,
      ].slice(0, 8),
    );

  const theme = THEMES[String(setup.theme)];
  const localization = LOCALES[String(setup.locale) as keyof typeof LOCALES];
  const pageSize = Number(setup.pageSize);
  const density = String(setup.density) as 'compact' | 'standard' | 'comfortable';

  const code = useMemo(() => {
    const lines = [
      '<DataTable',
      '  aria-label="People"',
      fromApi ? '  dataSource={dataSource}' : '  data={data}',
      '  columns={columns}',
      '  getRowId={(row) => row.id}',
    ];
    if (setup.theme !== 'light' && theme) lines.push(`  theme={${theme.name}}`);
    if (setup.locale !== 'en') lines.push(`  localization={${String(setup.locale)}}`);
    const initialState: Record<string, unknown> = {};
    if (pageSize !== 10) initialState.pagination = { pageIndex: 0, pageSize };
    if (density !== 'standard') initialState.density = density;
    if (Object.keys(initialState).length > 0) {
      lines.push(`  initialState={${jsLiteral(initialState)}}`);
    }
    lines.push(...propsToJsx({ ...autoProps, ...passed }));
    return `${lines.join('\n')}\n/>`;
  }, [fromApi, setup.theme, setup.locale, theme, pageSize, density, autoProps, passed]);

  const visibleControls = PROP_SCHEMA.controls.filter(
    (control) => matchesFilter(control, filter) && (!changedOnly || control.path in props),
  );
  const groups = groupControls(visibleControls);
  const changedCount = Object.keys(props).length;
  const filtering = filter.trim() !== '' || changedOnly;
  // Remount the table when the props change shape, so a boundary error clears on the next edit.
  const previewKey = `${dataset}-${String(setup.source)}-${String(setup.locale)}-${JSON.stringify(props)}`;

  return (
    <div className="playground">
      <aside className="playground__controls" aria-label="Options">
        <div className="playground__head">
          {' '}
          <button type="button" onClick={resetAll}>
            Reset all
          </button>
        </div>

        {SCHEMA.map((group) => (
          <details key={group.id} open>
            <summary>{group.label}</summary>
            <div className="playground__group">
              {group.controls.map((control) => (
                <label key={control.id} className="playground__control">
                  <span>{control.label}</span>
                  {control.kind === 'select' ? (
                    <select
                      value={String(setup[control.id])}
                      onChange={(e) =>
                        setSetup((prev) => ({ ...prev, [control.id]: e.target.value }))
                      }
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
                      value={Number(setup[control.id])}
                      min={control.min}
                      max={control.max}
                      step={control.step ?? 1}
                      onChange={(e) =>
                        setSetup((prev) => ({ ...prev, [control.id]: Number(e.target.value) }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
          </details>
        ))}

        <div className="playground__props-bar">
          <h2 className="playground__props-title">
            Props{' '}
            <span className="site-muted">
              {PROP_SCHEMA.controls.length} · {changedCount} changed
            </span>
          </h2>
          <label className="playground__filter">
            <span className="site-visually-hidden">Filter props</span>
            <input
              type="search"
              placeholder="Filter props, e.g. pageSize"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </label>
          <label className="playground__changed-only">
            <input
              type="checkbox"
              checked={changedOnly}
              onChange={(e) => setChangedOnly(e.target.checked)}
            />
            Changed only
          </label>
        </div>

        {groups.length === 0 && <p className="site-muted">No props match.</p>}
        {groups.map(([group, controls]) => {
          const changedInGroup = controls.filter((c) => c.path in props).length;
          return (
            <details key={group} open={filtering}>
              <summary>
                {group}{' '}
                <span className="site-muted">
                  ({controls.length}
                  {changedInGroup > 0 ? `, ${String(changedInGroup)} changed` : ''})
                </span>
              </summary>
              <div className="playground__group">
                {controls.map((control) => (
                  <PropControl
                    key={`${control.path}-${String(generation)}`}
                    control={control}
                    value={props[control.path]}
                    onChange={(value) => setProp(control.path, value)}
                  />
                ))}
              </div>
            </details>
          );
        })}

        <details>
          <summary>
            Code only <span className="site-muted">({PROP_SCHEMA.codeOnly.length})</span>
          </summary>
          <p className="site-muted">
            Callbacks, render functions, registries and data cannot be toggled; set them in code.
          </p>
          <ul className="playground__code-only">
            {PROP_SCHEMA.codeOnly.map((prop) => (
              <li key={prop.name}>
                <code>{prop.name}</code> <span className="site-muted">{prop.type}</span>
              </li>
            ))}
          </ul>
        </details>
      </aside>

      <section className="playground__preview" aria-label="Preview">
        <PreviewBoundary key={previewKey} onReset={() => setProps({})}>
          <DataTable<DemoPerson>
            key={`${dataset}-${String(setup.source)}-${String(setup.locale)}`}
            aria-label="Playground"
            {...(dataSource ? { dataSource } : { data: rows })}
            columns={peopleColumns}
            getRowId={(row) => row.id}
            {...(theme ? { theme: theme.theme } : {})}
            {...(localization ? { localization } : {})}
            {...(dataset === 'tree'
              ? {
                  getSubRows: (n: DemoPerson) =>
                    (n as unknown as OrgNode).children as unknown as DemoPerson[] | undefined,
                }
              : {})}
            initialState={{ pagination: { pageIndex: 0, pageSize }, density }}
            onQueryChange={onQueryChange}
            {...autoProps}
            {...passed}
          />
        </PreviewBoundary>

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
            <pre className="site-code" tabIndex={0} data-testid="playground-code">
              <code>{code}</code>
            </pre>
          )}
          {tab === 'state' && (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable (axe)
            <pre className="site-code" tabIndex={0}>
              <code>{JSON.stringify({ setup: changedValues(setup), props: passed }, null, 2)}</code>
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
      </section>
    </div>
  );
}
