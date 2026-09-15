import { useState } from 'react';
import { Link } from 'react-router';
import { allTags, examples } from '../examples/registry';
import { useDocumentTitle } from '../layout/useDocumentTitle';

export function ExamplesGalleryPage() {
  useDocumentTitle('Examples');
  const [tag, setTag] = useState<string>('');
  const tags = allTags();
  const visible = tag ? examples.filter((e) => e.tags.includes(tag)) : examples;

  return (
    <section className="site-prose site-prose--wide" aria-labelledby="examples-title">
      <h1 id="examples-title">Examples</h1>
      <label className="site-field">
        <span>Filter by tag</span>
        <select value={tag} onChange={(e) => setTag(e.target.value)} disabled={tags.length === 0}>
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      {visible.length === 0 ? (
        <p className="site-muted" data-testid="examples-empty">
          No examples match that tag.
        </p>
      ) : (
        <ul className="site-feature-grid">
          {visible.map((e) => (
            <li key={e.slug} className="site-card">
              <h2 className="site-card__title">
                <Link to={`/examples/${e.slug}`}>{e.title}</Link>
              </h2>
              <p>{e.description}</p>
              <p className="site-tags">{e.tags.join(' · ')}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
