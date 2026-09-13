import { Suspense } from 'react';
import { useParams } from 'react-router';
import { findExample } from '../examples/registry';
import { useDocumentTitle } from '../layout/useDocumentTitle';

/** A chrome-less example, loaded in an iframe so width presets exercise real breakpoints. */
export function EmbedPage() {
  const { slug } = useParams();
  const example = findExample(slug);
  useDocumentTitle(example?.title);
  if (!example) return <p>Unknown example</p>;
  const { Component: Demo } = example;
  return (
    <main className="embed-main" aria-label={example.title}>
      <h1 className="site-visually-hidden">{example.title}</h1>
      <Suspense fallback={<p>Loading demo…</p>}>
        <Demo />
      </Suspense>
    </main>
  );
}
