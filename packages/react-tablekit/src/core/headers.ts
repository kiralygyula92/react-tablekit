import type { Column, Header, HeaderGroup, TableInstance } from './types';

/**
 * Builds the header rows for one section (left / center / right) of visible leaf columns.
 * Leaf headers are bottom-aligned; the space above shallower columns is filled with
 * placeholders. The top-most placeholder of a column gets `rowSpan` covering the rest, and the
 * cells it covers get `rowSpan: 0` so renderers can skip them.
 */
export function buildHeaderGroups<TData>(
  table: TableInstance<TData>,
  leaves: Column<TData>[],
  maxDepth: number,
  section: 'left' | 'center' | 'right',
): HeaderGroup<TData>[] {
  const rows = maxDepth + 1;
  const groups: HeaderGroup<TData>[] = Array.from({ length: rows }, (_, depth) => ({
    id: `${section}_${depth}`,
    depth,
    headers: [],
  }));

  // chain[r] = the column shown at header row r for this leaf (or null = placeholder)
  const chains = leaves.map((leaf) => {
    const chain: Column<TData>[] = [];
    let current: Column<TData> | undefined = leaf;
    while (current) {
      chain.unshift(current);
      current = current.parent;
    }
    const offset = rows - chain.length;
    return Array.from({ length: rows }, (_, r) =>
      r < offset ? null : (chain[r - offset] ?? null),
    );
  });

  for (let r = 0; r < rows; r++) {
    const group = groups[r]!;
    let i = 0;
    while (i < leaves.length) {
      const leaf = leaves[i]!;
      const col = chains[i]![r] ?? null;
      let span = 1;
      if (col && col !== leaf) {
        while (i + span < leaves.length && chains[i + span]![r] === col) span++;
      }
      const isPlaceholder = col === null;
      const column = col ?? leaf;
      const chain = chains[i]!;
      const firstRealRow = chain.findIndex((c) => c !== null);
      // Placeholders fill rows [0, firstRealRow). When the first real header is the leaf itself
      // (a column without groups), the top placeholder absorbs the leaf: it spans every row.
      const mergesLeaf = chain[firstRealRow] === leaf;
      let rowSpan = 1;
      if (isPlaceholder) rowSpan = r === 0 ? (mergesLeaf ? rows : firstRealRow) : 0;
      else if (col === leaf && firstRealRow > 0 && mergesLeaf) rowSpan = 0;

      const header = createHeader(
        table,
        group,
        column,
        r,
        span,
        rowSpan,
        isPlaceholder,
        group.headers.length,
        section,
      );
      group.headers.push(header);
      i += span;
    }
  }

  // Link sub-headers (headers in the next row that sit under this one).
  for (let r = 0; r < rows - 1; r++) {
    const current = groups[r]!.headers;
    const next = groups[r + 1]!.headers;
    let cursor = 0;
    for (const header of current) {
      let covered = 0;
      while (covered < header.colSpan && cursor < next.length) {
        const child = next[cursor]!;
        header.subHeaders.push(child);
        covered += child.colSpan;
        cursor++;
      }
    }
  }
  return groups;
}

function createHeader<TData>(
  table: TableInstance<TData>,
  headerGroup: HeaderGroup<TData>,
  column: Column<TData>,
  depth: number,
  colSpan: number,
  rowSpan: number,
  isPlaceholder: boolean,
  index: number,
  section: string,
): Header<TData> {
  const header: Header<TData> = {
    id: `${section}_${depth}_${column.id}${isPlaceholder ? `_placeholder` : ''}`,
    index,
    depth,
    column,
    headerGroup,
    colSpan,
    rowSpan,
    isPlaceholder,
    subHeaders: [],
    getLeafHeaders: () => {
      if (!header.subHeaders.length) return [header];
      return header.subHeaders.flatMap((h) => h.getLeafHeaders());
    },
    getContext: () => ({ table, header, column }),
    getSize: () => column.getSize(),
    getStart: (position) => column.getStart(position),
  };
  for (const feature of table._features) feature.createHeader?.(header, table);
  return header;
}
