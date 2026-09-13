import { useDocumentTitle } from '../layout/useDocumentTitle';
import { PKG_NAME } from '../pkg';

export function GettingStartedPage() {
  useDocumentTitle('Getting started');
  return (
    <article className="site-prose">
      <h1>Getting started</h1>
      <h2>Install</h2>
      <pre className="site-code">
        <code>{`pnpm add ${PKG_NAME}
# or: npm install ${PKG_NAME}`}</code>
      </pre>
      <h2>Import the styles</h2>
      <pre className="site-code">
        <code>{`import '${PKG_NAME}/styles.css';
// Optional preset (e.g. the Skimmer-parity look):
import '${PKG_NAME}/presets/classic.css';`}</code>
      </pre>
      <p className="site-muted">
        The first table, TypeScript tips and the full guides arrive with the <code>DataTable</code>{' '}
        component in the next milestone.
      </p>
    </article>
  );
}
