import { describe, expect, it, vi } from 'vitest';
import { breakpointForWidth, resolveResponsive } from '../../src/core';
import { isAtLeast, isResponsive } from '../../src/core/responsive';
import {
  clamp,
  deepEqual,
  escapeRegExp,
  fold,
  getDeepValue,
  humanize,
  interpolate,
  isDateLike,
  isEmptyValue,
  memo,
  toTime,
} from '../../src/core/utils';

describe('utils', () => {
  it('deepEqual handles primitives, arrays, objects, dates and undefined keys', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, '1')).toBe(false);
    expect(deepEqual([1, [2]], [1, [2]])).toBe(true);
    expect(deepEqual([1], [1, 2])).toBe(false);
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual(new Date(1), new Date(1))).toBe(true);
    expect(deepEqual(new Date(1), { a: 1 })).toBe(false);
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
  });

  it('getDeepValue reads dot paths safely', () => {
    expect(getDeepValue({ a: { b: { c: 3 } } }, 'a.b.c')).toBe(3);
    expect(getDeepValue({ a: null }, 'a.b')).toBeUndefined();
    expect(getDeepValue(null, 'a')).toBeUndefined();
  });

  it('humanize, fold, interpolate, clamp, escapeRegExp', () => {
    expect(humanize('billingAddress.city')).toBe('Billing address city');
    expect(humanize('first_name')).toBe('First name');
    expect(fold('Ärvíztűrő')).toBe('arvizturo');
    expect(interpolate('Page {page} of {count} {x}', { page: 2, count: 5 })).toBe(
      'Page 2 of 5 {x}',
    );
    expect(clamp(5, 0, 3)).toBe(3);
    expect(new RegExp(escapeRegExp('a.b*')).test('a.b*')).toBe(true);
  });

  it('isEmptyValue, isDateLike, toTime', () => {
    expect([undefined, null, '', []].every(isEmptyValue)).toBe(true);
    expect(isEmptyValue(0)).toBe(false);
    expect(isDateLike('2024-01-02')).toBe(true);
    expect(isDateLike('2024-01-02T10:00:00Z')).toBe(true);
    expect(isDateLike('hello')).toBe(false);
    expect(isDateLike(new Date('x'))).toBe(false);
    expect(toTime(5)).toBe(5);
    expect(toTime(new Date(7))).toBe(7);
    expect(Number.isNaN(toTime({}))).toBe(true);
  });

  it('memo debug logs timings when enabled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const get = memo(
      () => [1],
      () => 2,
      { key: 'x', debug: () => true },
    );
    get();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('x:'));
    warn.mockRestore();
  });
});

describe('responsive', () => {
  it('resolves mobile-first values; an explicit undefined stops inheritance', () => {
    const v = { base: 'compact', md: 'numbered' };
    expect(resolveResponsive(v, 'xs')).toBe('compact');
    expect(resolveResponsive(v, 'md')).toBe('numbered');
    expect(resolveResponsive(v, 'xl')).toBe('numbered');
    expect(resolveResponsive({ base: 'Svc', sm: undefined }, 'lg')).toBeUndefined();
    expect(resolveResponsive({ base: 'Svc', sm: undefined }, 'xs')).toBe('Svc');
    expect(resolveResponsive('plain', 'xs')).toBe('plain');
  });

  it('breakpointForWidth uses min-widths (switches at exactly 600 and 960)', () => {
    expect(breakpointForWidth(599)).toBe('xs');
    expect(breakpointForWidth(600)).toBe('sm');
    expect(breakpointForWidth(959)).toBe('sm');
    expect(breakpointForWidth(960)).toBe('md');
    expect(breakpointForWidth(1500)).toBe('xl');
    expect(isAtLeast('md', 'sm')).toBe(true);
    expect(isResponsive({ foo: 1 })).toBe(false);
    expect(isResponsive({})).toBe(false);
  });
});
