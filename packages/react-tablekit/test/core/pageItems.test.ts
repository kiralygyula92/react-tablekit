import { describe, expect, it } from 'vitest';
import { getPageItems, type PageItem } from '../../src/core';

/** Renders items as the compact notation used in the spec: `0 1 2 3 … 8 9`. */
const render = (items: PageItem[]) =>
  items.map((i) => (i.type === 'page' ? String(i.index) : '…')).join(' ');

describe('getPageItems: classic', () => {
  const expected: [number, string][] = [
    [0, '0 1 2 3 … 8 9'],
    [1, '0 1 2 3 … 8 9'],
    [2, '0 1 2 3 … 8 9'],
    [3, '0 1 2 3 4 … 8 9'],
    [4, '0 1 2 3 4 5 … 8 9'],
    [5, '0 1 … 4 5 6 7 8 9'],
    [6, '0 1 … 5 6 7 8 9'],
    [7, '0 1 … 6 7 8 9'],
    [8, '0 1 … 6 7 8 9'],
    [9, '0 1 … 6 7 8 9'],
  ];

  it.each(expected)('n=10, c=%i → %s', (c, out) => {
    expect(render(getPageItems({ pageIndex: c, pageCount: 10 }))).toBe(out);
  });

  it('never inserts an ellipsis between adjacent pages or hides one page', () => {
    for (let n = 1; n <= 40; n++) {
      for (let c = 0; c < n; c++) {
        const items = getPageItems({ pageIndex: c, pageCount: n });
        items.forEach((item, i) => {
          if (item.type !== 'ellipsis') return;
          const prev = items[i - 1];
          const next = items[i + 1];
          expect(prev?.type).toBe('page');
          expect(next?.type).toBe('page');
          if (prev?.type === 'page' && next?.type === 'page') {
            expect(next.index - prev.index - 1, `n=${n} c=${c}`).toBeGreaterThanOrEqual(2);
          }
        });
        // pages are strictly increasing and include first, last and current
        const pages = items
          .filter((i) => i.type === 'page')
          .map((i) => (i as { index: number }).index);
        expect(pages).toEqual([...pages].sort((a, b) => a - b));
        expect(new Set(pages).size).toBe(pages.length);
        expect(pages).toContain(0);
        expect(pages).toContain(n - 1);
        expect(pages).toContain(c);
      }
    }
  });

  it('marks the current page as selected', () => {
    const items = getPageItems({ pageIndex: 4, pageCount: 10 });
    const selected = items.filter((i) => i.type === 'page' && i.selected);
    expect(selected).toEqual([{ type: 'page', index: 4, selected: true }]);
  });

  it('handles the documented edge cases', () => {
    expect(render(getPageItems({ pageIndex: 3, pageCount: 7 }))).toBe('0 1 2 3 4 5 6');
    expect(render(getPageItems({ pageIndex: 0, pageCount: 8 }))).toBe('0 1 2 3 … 6 7');
    expect(render(getPageItems({ pageIndex: 4, pageCount: 8 }))).toBe('0 1 2 3 4 5 6 7');
    expect(render(getPageItems({ pageIndex: 0, pageCount: 1 }))).toBe('0');
    expect(getPageItems({ pageIndex: 0, pageCount: 0 })).toEqual([]);
  });

  it('clamps an out-of-range page index', () => {
    expect(render(getPageItems({ pageIndex: 99, pageCount: 10 }))).toBe('0 1 … 6 7 8 9');
    expect(render(getPageItems({ pageIndex: -5, pageCount: 10 }))).toBe('0 1 2 3 … 8 9');
  });

  it('ellipsis keys are unique', () => {
    const items = getPageItems({ pageIndex: 12, pageCount: 24 });
    const keys = items.filter((i) => i.type === 'ellipsis').map((i) => (i as { key: string }).key);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
  });
});

describe('getPageItems: stable', () => {
  it('renders a constant number of slots for n=50 across every page', () => {
    const counts = new Set<number>();
    for (let c = 0; c < 50; c++) {
      counts.add(getPageItems({ pageIndex: c, pageCount: 50, algorithm: 'stable' }).length);
    }
    expect([...counts]).toEqual([2 * 2 + 2 * 1 + 3]);
  });

  it('matches MUI usePagination output (siblingCount 0, boundaryCount 2)', () => {
    const at = (c: number) =>
      render(
        getPageItems({
          pageIndex: c,
          pageCount: 10,
          siblingCount: 0,
          boundaryCount: 2,
          algorithm: 'stable',
        }),
      );
    expect(at(0)).toBe('0 1 2 3 … 8 9');
    expect(at(4)).toBe('0 1 … 4 … 8 9');
    expect(at(9)).toBe('0 1 … 6 7 8 9');
  });

  it('lists every page when there is room', () => {
    expect(render(getPageItems({ pageIndex: 2, pageCount: 5, algorithm: 'stable' }))).toBe(
      '0 1 2 3 4',
    );
  });
});

describe('getPageItems: custom', () => {
  it('delegates to a custom function with normalized args', () => {
    const items = getPageItems({
      pageIndex: 3,
      pageCount: 5,
      algorithm: ({ pageIndex, pageCount, siblingCount, boundaryCount }) => {
        expect({ pageIndex, pageCount, siblingCount, boundaryCount }).toEqual({
          pageIndex: 3,
          pageCount: 5,
          siblingCount: 1,
          boundaryCount: 2,
        });
        return [{ type: 'page', index: pageIndex, selected: true }];
      },
    });
    expect(items).toHaveLength(1);
  });
});
