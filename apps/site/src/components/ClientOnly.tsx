import { useSyncExternalStore, type ReactNode } from 'react';

const noop = () => () => undefined;
const onClient = () => true;
const onServer = () => false;

/**
 * Renders its children only in the browser, after hydration.
 *
 * Prerendered HTML cannot contain a lazily-loaded component: a string render emits the Suspense
 * fallback and marks the boundary as one the server will never finish, which forces the browser
 * to throw that subtree away during hydration and report a recoverable error. Rendering the same
 * placeholder on both sides and swapping afterwards avoids the boundary entirely.
 *
 * "Is this the browser yet" is a fact about the environment rather than state of our own, which
 * is why it is read through `useSyncExternalStore` — the snapshot simply differs between the
 * server and the client, and React knows to use the server's during hydration.
 *
 * Use it for anything interactive and code-split — demos, the playground, the generated
 * reference tables. Prose should never be behind it: prose is what prerendering is for.
 */
export function ClientOnly({
  children,
  placeholder,
}: {
  children: ReactNode;
  placeholder?: ReactNode;
}) {
  const hydrated = useSyncExternalStore(noop, onClient, onServer);
  return <>{hydrated ? children : placeholder}</>;
}
