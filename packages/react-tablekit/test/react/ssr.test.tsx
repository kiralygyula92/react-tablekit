// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createColumnHelper, DataTable } from '../../src';

interface Person {
  id: string;
  name: string;
  age: number;
}

const people: Person[] = [
  { id: '1', name: 'Ada Lovelace', age: 36 },
  { id: '2', name: 'Grace Hopper', age: 45 },
];

const col = createColumnHelper<Person>();
const columns = [
  col.accessor('name', { header: 'Name' }),
  col.accessor('age', { header: 'Age', type: 'number' }),
];

describe('SSR safety (09 §2)', () => {
  it('the React entry can be imported without window/document', async () => {
    expect(typeof globalThis.window).toBe('undefined');
    const mod = await import('../../src');
    expect(typeof mod.version).toBe('string');
  });

  it('renders real rows to HTML on the server', () => {
    const html = renderToString(
      <DataTable aria-label="People" data={people} columns={columns} getRowId={(p) => p.id} />,
    );

    expect(html).toContain('<table');
    // The rows are rendered on the server, not left to a client-only effect.
    expect(html).toContain('Ada Lovelace');
    expect(html).toContain('Grace Hopper');
    expect(html).toContain('Name');
  });

  it('honours ssrBreakpoint instead of measuring the viewport', () => {
    // There is no viewport to measure on the server, so the breakpoint is declared. With a
    // mobile one and the cards layout, the server must emit cards rather than a table.
    const html = renderToString(
      <DataTable
        aria-label="People"
        data={people}
        columns={columns}
        getRowId={(p) => p.id}
        responsive={{ mobileLayout: 'cards', ssrBreakpoint: 'xs' }}
      />,
    );

    expect(html).toContain('Ada Lovelace');
    expect(html).not.toContain('<table');
  });

  it('renders a selectable table without a client-only API', () => {
    const html = renderToString(
      <DataTable
        aria-label="People"
        data={people}
        columns={columns}
        getRowId={(p) => p.id}
        enableRowSelection
        enableStickyHeader
        maxHeight={400}
      />,
    );

    // Selection makes it a grid; that role has to be present in the server HTML too, or the
    // first paint disagrees with the hydrated tree.
    expect(html).toContain('role="grid"');
  });
});
