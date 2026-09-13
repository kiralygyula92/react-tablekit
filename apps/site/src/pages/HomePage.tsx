import { Link } from 'react-router';
import { useDocumentTitle } from '../layout/useDocumentTitle';
import { PKG_NAME } from '../pkg';

const FEATURES = [
  [
    'Client & server modes',
    'Pagination, search, filters, sorting, grouping, expansion, selection and faceting work either way, per feature.',
  ],
  [
    'Headless core',
    'A framework-agnostic engine. Use the all-in-one component or build your own markup from hooks.',
  ],
  [
    'Override everything',
    'Every part is a slot; every interaction is an overridable handler that can call the default.',
  ],
  [
    'Themable with CSS variables',
    'Plain CSS in a cascade layer. Presets include a pixel-faithful "classic" look.',
  ],
  [
    'Accessible by default',
    'Table/grid semantics, aria-sort, keyboard support, focus management and live announcements.',
  ],
  [
    'Zero runtime dependencies',
    'Only React as a peer. ESM + CJS + types, tree-shakeable, SSR-safe.',
  ],
] as const;

export function HomePage() {
  useDocumentTitle(undefined);
  return (
    <article className="site-prose">
      <h1>{PKG_NAME}</h1>
      <p className="site-lead">
        A production-grade React data table with a headless core, client and server data modes,
        slots, handler middleware and CSS-variable theming.
      </p>
      <pre className="site-code">
        <code>{`pnpm add ${PKG_NAME}`}</code>
      </pre>
      <p>
        <Link to="/docs/getting-started">Get started</Link> ·{' '}
        <Link to="/examples">Browse examples</Link> · <Link to="/api">API reference</Link>
      </p>
      <h2>Features</h2>
      <ul className="site-feature-grid">
        {FEATURES.map(([title, text]) => (
          <li key={title} className="site-card">
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
