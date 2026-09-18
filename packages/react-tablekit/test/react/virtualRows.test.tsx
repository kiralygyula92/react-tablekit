import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useVirtualRows } from '../../src';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('virtual row lifecycle', () => {
  it('keeps pending measurements working after a StrictMode effect replay', () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      height: 75,
    } as DOMRect);
    const getScrollElement = () => null;
    function List() {
      const virtual = useVirtualRows({ count: 1, getScrollElement, dynamic: true });
      return (
        <div>
          <output>{virtual.totalSize}</output>
          <div data-index="0" ref={virtual.measureElement} />
        </div>
      );
    }

    render(
      <StrictMode>
        <List />
      </StrictMode>,
    );
    act(() => vi.runAllTimers());
    expect(screen.getByRole('status')).toHaveTextContent('75');
  });

  it('cancels fallback measurement timers on unmount', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', undefined);
    vi.stubGlobal('cancelAnimationFrame', undefined);
    const { result, unmount } = renderHook(() =>
      useVirtualRows({ count: 1, getScrollElement: () => null, dynamic: true }),
    );
    const row = document.createElement('div');
    row.dataset.index = '0';
    act(() => result.current.measureElement(row));
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('follows a replacement scroll element returned by a stable getter', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    Object.defineProperty(first, 'clientHeight', { value: 80 });
    Object.defineProperty(second, 'clientHeight', { value: 80 });
    let current = first;
    const getScrollElement = () => current;
    const { result, rerender } = renderHook(() =>
      useVirtualRows({ count: 100, getScrollElement, overscan: 0 }),
    );
    expect(result.current.virtualRows[0]?.index).toBe(0);

    second.scrollTop = 400;
    current = second;
    rerender();
    expect(result.current.virtualRows[0]?.index).toBe(10);
    first.scrollTop = 800;
    fireEvent.scroll(first);
    expect(result.current.virtualRows[0]?.index).toBe(10);
    second.scrollTop = 1200;
    fireEvent.scroll(second);
    expect(result.current.virtualRows[0]?.index).toBe(30);
  });

  it('updates offsets when a mounted row resizes and releases removed rows', () => {
    vi.useFakeTimers();
    let height = 40;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ height }) as DOMRect,
    );
    const observers = new Set<{
      targets: Set<Element>;
      callback: ResizeObserverCallback;
      observer: ResizeObserver;
    }>();
    class TestResizeObserver {
      targets = new Set<Element>();
      constructor(readonly callback: ResizeObserverCallback) {
        observers.add({ targets: this.targets, callback, observer: this });
      }
      observe(element: Element) {
        this.targets.add(element);
      }
      unobserve(element: Element) {
        this.targets.delete(element);
      }
      disconnect() {
        this.targets.clear();
      }
    }
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
    const getScrollElement = () => null;
    function List({ visible }: { visible: boolean }) {
      const virtual = useVirtualRows({ count: 2, getScrollElement, dynamic: true });
      return (
        <div>
          <output>{virtual.totalSize}</output>
          {visible && <div data-testid="row" data-index="0" ref={virtual.measureElement} />}
        </div>
      );
    }
    const { rerender, unmount } = render(<List visible />);
    act(() => vi.runAllTimers());
    expect(screen.getByRole('status')).toHaveTextContent('80');
    const row = screen.getByTestId('row');

    height = 90;
    act(() => {
      for (const { targets, callback, observer } of observers) {
        if (targets.has(row))
          callback(
            [
              {
                target: row,
                contentRect: row.getBoundingClientRect(),
                borderBoxSize: [],
                contentBoxSize: [],
                devicePixelContentBoxSize: [],
              },
            ],
            observer,
          );
      }
      vi.runAllTimers();
    });
    expect(screen.getByRole('status')).toHaveTextContent('130');

    rerender(<List visible={false} />);
    expect([...observers].every(({ targets }) => !targets.has(row))).toBe(true);
    unmount();
    expect([...observers].every(({ targets }) => targets.size === 0)).toBe(true);
  });
});
