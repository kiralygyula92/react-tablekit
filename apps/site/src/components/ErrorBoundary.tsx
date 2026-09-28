import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Whether an error is a code chunk that could not be fetched. After a deploy the previous build's
 * chunks are gone, so a reader who kept a tab open gets this on their next click. Chrome, Firefox
 * and Safari each word it differently.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk .* failed/i.test(
    message,
  );
}

const RELOAD_KEY = 'tk-site:reloaded-for';

/**
 * Reloads once for this address, which fetches the new build and is the actual cure. A second
 * failure at the same address is not a stale tab, so it is shown rather than reloaded forever.
 */
export function reloadOnceForNewBuild(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === window.location.href) return false;
    sessionStorage.setItem(RELOAD_KEY, window.location.href);
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

interface Props {
  /** What to show instead of the children once they have thrown. */
  fallback: (error: Error, retry: () => void) => ReactNode;
  /** Changing it clears the error: a new page gets a fresh start. */
  resetKey?: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  resetKey: string | undefined;
}

/**
 * Keeps a failure where it happened. Without one, a single throw anywhere below unmounts the whole
 * tree and the reader is left with a blank page and no way out.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Navigating elsewhere clears the error, so one broken page does not follow the reader around.
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error) && reloadOnceForNewBuild()) return;
    console.error(error, info.componentStack);
  }

  retry = () => {
    this.setState({ error: null });
  };

  override render() {
    return this.state.error
      ? this.props.fallback(this.state.error, this.retry)
      : this.props.children;
  }
}

/** The message a reader sees when part of a page fails. */
export function FailureNotice({
  title,
  error,
  retry,
}: {
  title: string;
  error: Error;
  retry: () => void;
}) {
  const stale = isChunkLoadError(error);
  return (
    <div className="failure-notice" role="alert">
      <p className="failure-notice__title">{title}</p>
      <p className="failure-notice__body">
        {stale
          ? 'The site has been updated since this page was opened. Reload to get the new version.'
          : 'Something went wrong while showing it. Reloading usually fixes this; if it does not, please report it.'}
      </p>
      <p className="failure-notice__actions">
        <button type="button" onClick={() => window.location.reload()}>
          Reload the page
        </button>
        {!stale && (
          <button type="button" onClick={retry}>
            Try again
          </button>
        )}
      </p>
    </div>
  );
}
