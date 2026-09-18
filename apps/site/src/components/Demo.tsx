import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import { ClientOnly } from './ClientOnly';

interface DemoModule {
  default: ComponentType;
}

// Demos are colocated with the page that shows them, so a page and its examples move
// together and neither can be orphaned. Neither glob is eager: a demo costs nothing until a
// reader opens the page that embeds it.
const demoLoaders = import.meta.glob<DemoModule>('../../content/**/demo-*.tsx');
const sourceLoaders = import.meta.glob<string>('../../content/**/demo-*.tsx', {
  query: '?raw',
  import: 'default',
});

const keyFor = (id: string) => `../../content/${id}.tsx`;

const componentById = new Map<string, LazyExoticComponent<ComponentType>>(
  Object.keys(demoLoaders).map((file) => {
    const id = file.replace('../../content/', '').replace(/\.tsx$/, '');
    return [id, lazy(demoLoaders[file]!)] as const;
  }),
);

/** The demo's own source, fetched alongside it so the toolbar can hand it to the reader. */
function useDemoSource(id: string): string {
  const [source, setSource] = useState('');
  useEffect(() => {
    let live = true;
    const load = sourceLoaders[keyFor(id)];
    if (!load) return;
    void load().then((text) => {
      if (live) setSource(text);
    });
    return () => {
      live = false;
    };
  }, [id]);
  return source;
}

/** Everything a viewer needs to take the code away: copy, read, fork, or start over. */
function Toolbar({ source, onReset }: { source: string; onReset: () => void }) {
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(source).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [source]);

  // StackBlitz accepts a project as a form POST, so a live sandbox needs no SDK.
  const openSandbox = useCallback(() => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://stackblitz.com/run';
    form.target = '_blank';
    const add = (name: string, value: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };
    add('project[title]', 'react-tablekit demo');
    add('project[template]', 'node');
    add('project[files][src/Demo.tsx]', source);
    add(
      'project[files][package.json]',
      JSON.stringify(
        {
          name: 'react-tablekit-demo',
          scripts: { dev: 'vite', build: 'vite build' },
          dependencies: { react: '^19.2.0', 'react-dom': '^19.2.0', 'react-tablekit': 'latest' },
          devDependencies: { vite: '^8.3.0', '@vitejs/plugin-react': '^6.1.1' },
        },
        null,
        2,
      ),
    );
    document.body.appendChild(form);
    form.submit();
    form.remove();
  }, [source]);

  return (
    <>
      <div className="demo__toolbar">
        {/* The source arrives in its own chunk, so these wait for it; Reset never does. */}
        <button type="button" onClick={copy} disabled={!source}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={() => setShowSource((v) => !v)}
          aria-expanded={showSource}
          disabled={!source}
        >
          {showSource ? 'Hide source' : 'Show source'}
        </button>
        <button type="button" onClick={openSandbox} disabled={!source}>
          Open in StackBlitz
        </button>
        <button type="button" onClick={onReset}>
          Reset
        </button>
      </div>
      {showSource && (
        // A scrollable region must be keyboard-focusable (axe `scrollable-region-focusable`).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        <pre className="demo__source site-code" tabIndex={0}>
          <code>{source}</code>
        </pre>
      )}
    </>
  );
}

/** A runnable demo. `id` is the colocated file, e.g. `react-tablekit/features/sorting/demo-basics`. */
export function Demo({ id, label }: { id: string; label?: string }) {
  const [nonce, setNonce] = useState(0);
  const reset = useCallback(() => setNonce((n) => n + 1), []);
  const Component = componentById.get(id);
  const source = useDemoSource(id);

  if (!Component) {
    return (
      <p className="demo demo--missing" role="alert">
        Missing demo <code>{id}</code>.
      </p>
    );
  }

  return (
    <section className="demo" aria-label={label ?? 'Example'}>
      <div className="demo__stage">
        <ClientOnly placeholder={<p className="site-muted">Loading example…</p>}>
          <Suspense fallback={<p className="site-muted">Loading example…</p>}>
            {/* `nonce` is the reset: a new key throws the old tree away and starts over. */}
            {/* eslint-disable-next-line react-hooks/static-components --
                a lookup, not a creation: every lazy component is built once at module scope, so
                its identity is stable and its state survives re-renders. */}
            <Component key={nonce} />
          </Suspense>
        </ClientOnly>
      </div>
      <Toolbar source={source} onReset={reset} />
    </section>
  );
}
