import { useEffect, useState } from 'react';
import type { Heading } from '../content/types';

/**
 * Marks the heading the reader is currently under.
 *
 * The observer reports which headings are on screen; the one that counts is the last one to have
 * crossed the top of the viewport, which is the section whose text is being read — not simply the
 * topmost visible heading, because a long section scrolls its own heading away entirely.
 */
function useActiveHeading(headings: Heading[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(headings[0]?.id);

  useEffect(() => {
    if (headings.length === 0) return;
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const update = () => {
      // The header is sticky, so "crossed the top" means crossed the bottom of the header.
      const top = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80;
      let current = elements[0]?.id;
      for (const element of elements) {
        if (element.getBoundingClientRect().top - top <= 1) current = element.id;
      }
      // At the very bottom of the page the last heading is the one being read, whatever the
      // rectangles say — its section may be too short to reach the top of the viewport.
      if (window.scrollY + window.innerHeight >= document.body.scrollHeight - 2) {
        current = elements[elements.length - 1]?.id;
      }
      setActive(current);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [headings]);

  return active;
}

/** The right rail: the page's own headings, with the one being read marked. */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  const active = useActiveHeading(headings);
  if (headings.length === 0) return <aside className="site-toc" aria-label="On this page" />;

  return (
    <aside className="site-toc" aria-label="On this page">
      <p className="site-toc__title">On this page</p>
      <ul>
        {headings.map((entry) => (
          <li key={entry.id} data-level={entry.level}>
            <a href={`#${entry.id}`} aria-current={entry.id === active ? 'location' : undefined}>
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
