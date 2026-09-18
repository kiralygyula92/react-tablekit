import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTable, useTableState } from '../../src';
import { people, personColumns } from './helpers';

describe('useTableState snapshots', () => {
  it('supports selectors that return a new object without a render loop', () => {
    const table = createTable({ data: people, columns: personColumns });
    const { result } = renderHook(() =>
      useTableState(table, (state) => ({ density: state.density })),
    );

    expect(result.current).toEqual({ density: 'standard' });
    act(() => table.setDensity('compact'));
    expect(result.current).toEqual({ density: 'compact' });
  });

  it('keeps equal selections stable across unrelated state updates', () => {
    const table = createTable({ data: people, columns: personColumns });
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return useTableState(
        table,
        (state) => ({ density: state.density }),
        (a, b) => a.density === b.density,
      );
    });
    const before = result.current;
    const rendersBefore = renders;

    act(() => table.setSorting([{ id: 'name', desc: true }]));
    expect(result.current).toBe(before);
    expect(renders).toBe(rendersBefore);
    act(() => table.setDensity('compact'));
    expect(result.current).toEqual({ density: 'compact' });
  });

  it('recomputes when the selector or controlled options change without a notification', () => {
    const table = createTable({ data: people, columns: personColumns });
    const selectDensity = (state: ReturnType<typeof table.getState>): { value: string } => ({
      value: state.density,
    });
    const selectSize = (state: ReturnType<typeof table.getState>) => ({
      value: String(state.pagination.pageSize),
    });
    const { result, rerender } = renderHook(({ selector }) => useTableState(table, selector), {
      initialProps: { selector: selectDensity },
    });

    table.setOptions((options) => ({ ...options, state: { density: 'comfortable' } }));
    rerender({ selector: selectDensity });
    expect(result.current).toEqual({ value: 'comfortable' });
    rerender({ selector: selectSize });
    expect(result.current).toEqual({ value: '10' });
  });
});
