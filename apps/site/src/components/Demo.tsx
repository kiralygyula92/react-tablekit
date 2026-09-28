import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import { ClientOnly } from './ClientOnly';
import { ErrorBoundary, FailureNotice } from './ErrorBoundary';

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
    load().then(
      (text) => {
        if (live) setSource(text);
      },
      () => {
        // The source is a convenience. If it cannot be fetched, Copy and Show source stay
        // disabled and the demo itself is unaffected.
      },
    );
    return () => {
      live = false;
    };
  }, [id]);
  return source;
}

/** Everything a viewer needs to take the code away: copy it, read it, or start over. */
function Toolbar({ source, onReset }: { source: string; onReset: () => void }) {
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState<'copied' | 'failed' | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(copyTimer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    let outcome: 'copied' | 'failed';
    try {
      await navigator.clipboard.writeText(source);
      outcome = 'copied';
    } catch {
      // Clipboard access can be blocked. Saying so beats a button that silently does nothing, and
      // the source is still one click away through Show source.
      outcome = 'failed';
    }
    if (!mounted.current) return;
    clearTimeout(copyTimer.current);
    setCopied(outcome);
    copyTimer.current = setTimeout(() => setCopied(null), 2000);
  }, [source]);

  return (
    <>
      <div className="demo__toolbar">
        {/* The source arrives in its own chunk, so these wait for it; Reset never does. */}
        <button type="button" onClick={() => void copy()} disabled={!source}>
          {copied === 'copied' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={() => setShowSource((v) => !v)}
          aria-expanded={showSource}
          disabled={!source}
        >
          {showSource ? 'Hide source' : 'Show source'}
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
          {/* A failing example stays inside its frame; the rest of the page carries on. */}
          <ErrorBoundary
            resetKey={`${id}:${String(nonce)}`}
            fallback={(error, retry) => (
              <FailureNotice title="This example could not be shown." error={error} retry={retry} />
            )}
          >
            <Suspense fallback={<p className="site-muted">Loading example…</p>}>
              {/* `nonce` is the reset: a new key throws the old tree away and starts over. */}
              {/* eslint-disable-next-line react-hooks/static-components --
                  a lookup, not a creation: every lazy component is built once at module scope, so
                  its identity is stable and its state survives re-renders. */}
              <Component key={nonce} />
            </Suspense>
          </ErrorBoundary>
        </ClientOnly>
      </div>
      <Toolbar source={source} onReset={reset} />
    </section>
  );
}
