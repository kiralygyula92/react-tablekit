import type { PageItem, PageItemsArgs } from './types';

const range = (start: number, end: number): number[] =>
  end < start ? [] : Array.from({ length: end - start + 1 }, (_, i) => start + i);

/**
 * The classic rule (05 §4.4): boundary pages, two extra pages near the
 * edges, siblings in the middle; an ellipsis only replaces two or more hidden pages.
 */
function classicItems(c: number, n: number, s: number, b: number): PageItem[] {
  if (n <= 2 * b + 3) return range(0, n - 1).map((i) => page(i, c));
  const pages = new Set<number>([...range(0, b - 1), ...range(n - b, n - 1)]);
  if (c <= b - 1) range(b, b + 1).forEach((p) => pages.add(p));
  else if (c >= n - b) range(n - b - 2, n - b - 1).forEach((p) => pages.add(p));
  else range(c - s, c + s).forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 0 && p < n).sort((x, y) => x - y);
  const items: PageItem[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined) {
      const gap = p - prev - 1;
      if (gap === 1) items.push(page(prev + 1, c));
      else if (gap >= 2) items.push({ type: 'ellipsis', key: `ellipsis-${prev}-${p}` });
    }
    items.push(page(p, c));
  });
  return items;
}

/**
 * MUI-style algorithm (fixes B17): renders a constant `2b + 2s + 3` slots once `n` is large
 * enough, so the bar never changes width. Re-implemented 0-based.
 */
function stableItems(c: number, n: number, s: number, b: number): PageItem[] {
  // Work 1-based like MUI's usePagination, convert at the end.
  const count = n;
  const current = c + 1;
  const startPages = range(1, Math.min(b, count));
  const endPages = range(Math.max(count - b + 1, b + 1), count);
  const siblingsStart = Math.max(Math.min(current - s, count - b - s * 2 - 1), b + 2);
  const siblingsEnd = Math.min(
    Math.max(current + s, b + s * 2 + 2),
    endPages.length > 0 ? (endPages[0] ?? count) - 2 : count - 1,
  );
  const raw: (number | 'start' | 'end')[] = [...startPages];
  if (siblingsStart > b + 2) raw.push('start');
  else if (b + 1 < count - b) raw.push(b + 1);
  raw.push(...range(siblingsStart, siblingsEnd));
  if (siblingsEnd < count - b - 1) raw.push('end');
  else if (count - b > b) raw.push(count - b);
  raw.push(...endPages);

  const seen = new Set<number>();
  const items: PageItem[] = [];
  for (const r of raw) {
    if (r === 'start' || r === 'end') {
      items.push({ type: 'ellipsis', key: `ellipsis-${r}` });
    } else if (r >= 1 && r <= count && !seen.has(r)) {
      seen.add(r);
      items.push(page(r - 1, c));
    }
  }
  return items;
}

function page(index: number, current: number): PageItem {
  return { type: 'page', index, selected: index === current };
}

/**
 * Pure pagination item generator (0-based). `algorithm` is `'classic'` (default, the corrected
 * classic rule), `'stable'` (constant slot count) or a custom function.
 *
 * @example
 * ```ts
 * getPageItems({ pageIndex: 4, pageCount: 10 });
 * // → pages 0 1 2 3 4 5, ellipsis, pages 8 9
 * ```
 */
export function getPageItems(args: PageItemsArgs): PageItem[] {
  const pageCount = Math.max(0, Math.floor(args.pageCount));
  if (pageCount === 0) return [];
  const pageIndex = Math.min(Math.max(0, Math.floor(args.pageIndex)), pageCount - 1);
  const siblingCount = Math.max(0, args.siblingCount ?? 1);
  const boundaryCount = Math.max(0, args.boundaryCount ?? 2);
  const algorithm = args.algorithm ?? 'classic';
  if (typeof algorithm === 'function') {
    return algorithm({ pageIndex, pageCount, siblingCount, boundaryCount });
  }
  return algorithm === 'stable'
    ? stableItems(pageIndex, pageCount, siblingCount, boundaryCount)
    : classicItems(pageIndex, pageCount, siblingCount, boundaryCount);
}
