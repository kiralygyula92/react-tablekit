import { Suspense, useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router';
import { findExample } from '../examples/registry';
import { useDocumentTitle } from '../layout/useDocumentTitle';
import { NotFoundPage } from './NotFoundPage';

const WIDTHS = [
  { label: '375', value: 375 },
  { label: '768', value: 768 },
  { label: '1280', value: 1280 },
  { label: 'Full', value: 0 },
] as const;

/** Example page template (08 §2): live demo with width presets, source tab and related links. */
export function ExamplePage() {
  const { slug } = useParams();
  const example = findExample(slug);
  useDocumentTitle(example?.title);
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [width, setWidth] = useState(0);
  const [loaded, setLoaded] = useState<{ slug: string; text: string } | null>(null);
  const tabsId = useId();

  useEffect(() => {
    if (tab !== 'code' || !example) return;
    let live = true;
    void example.loadSource().then((text) => {
      if (live) setLoaded({ slug: example.slug, text });
    });
    return () => {
      live = false;
    };
  }, [tab, example]);
  const source = loaded && loaded.slug === example?.slug ? loaded.text : null;

  if (!example) return <NotFoundPage />;
  const { Component: Demo } = example;
  const related = (example.related ?? []).map(findExample).filter((e) => e !== undefined);

  return (
    <article className="site-prose site-prose--wide">
      <p>
        <Link to="/examples">← All examples</Link>
      </p>
      <h1>{example.title}</h1>
      <p className="site-lead">{example.description}</p>
      <div className="example-toolbar">
        <div role="tablist" aria-label="Example view" className="example-tabs">
          {(['preview', 'code'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`${tabsId}-${t}`}
              aria-selected={tab === t}
              aria-controls={`${tabsId}-panel`}
              onClick={() => setTab(t)}
            >
              {t === 'preview' ? 'Preview' : 'Code'}
            </button>
          ))}
        </div>
        {tab === 'preview' && (
          <fieldset className="example-widths">
            <legend>Preview width</legend>
            {WIDTHS.map((w) => (
              <label key={w.label}>
                <input
                  type="radio"
                  name="preview-width"
                  checked={width === w.value}
                  onChange={() => setWidth(w.value)}
                />
                {w.label}
              </label>
            ))}
          </fieldset>
        )}
      </div>
      <section
        id={`${tabsId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-${tab}`}
        className="site-demo"
      >
        {tab === 'preview' ? (
          width ? (
            <iframe
              className="example-iframe"
              title={`${example.title} at ${width}px`}
              src={`${import.meta.env.BASE_URL}embed/${example.slug}${window.location.search}`}
              style={{ width }}
            />
          ) : (
            <div className="example-frame">
              <Suspense fallback={<p className="site-muted">Loading demo…</p>}>
                <Demo />
              </Suspense>
            </div>
          )
        ) : (
          // A scrollable region must be keyboard-focusable (axe `scrollable-region-focusable`).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          <pre className="site-code" tabIndex={0}>
            <code>{source ?? 'Loading source…'}</code>
          </pre>
        )}
      </section>
      {related.length > 0 && (
        <nav aria-label="Related examples" className="example-related">
          <h2>Related examples</h2>
          <ul>
            {related.map((r) => (
              <li key={r.slug}>
                <Link to={`/examples/${r.slug}`}>{r.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
}
