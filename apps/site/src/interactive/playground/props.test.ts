import { describe, expect, it } from 'vitest';
import {
  groupControls,
  isValidValue,
  jsLiteral,
  matchesFilter,
  PROP_SCHEMA,
  propsToJsx,
  readPropParams,
  unflatten,
  writePropParams,
  type PropControl,
} from './props';

const control = (overrides: Partial<PropControl>): PropControl => ({
  path: 'x',
  group: 'Other',
  kind: 'boolean',
  type: 'boolean',
  description: '',
  ...overrides,
});

describe('generated prop schema', () => {
  it('covers far more than a hand-written list would', () => {
    expect(PROP_SCHEMA.controls.length).toBeGreaterThanOrEqual(100);
  });

  it('includes the rows-per-page option, with an "off" state', () => {
    const pageSizes = PROP_SCHEMA.controls.find((c) => c.path === 'pagination.pageSizeOptions');
    expect(pageSizes).toMatchObject({ kind: 'numberList', allowFalse: true });
  });

  it('never offers a control for a prop the playground supplies itself', () => {
    const paths = new Set(PROP_SCHEMA.controls.map((c) => c.path));
    for (const managed of ['data', 'columns', 'dataSource', 'getRowId', 'theme', 'localization']) {
      expect(paths.has(managed)).toBe(false);
    }
  });

  it('lists every prop exactly once, as a control or as code only', () => {
    const names = [
      ...PROP_SCHEMA.controls.map((c) => c.path),
      ...PROP_SCHEMA.codeOnly.map((c) => c.name),
    ];
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('isValidValue', () => {
  it('accepts only the kinds each control can represent', () => {
    expect(isValidValue(control({ kind: 'boolean' }), true)).toBe(true);
    expect(isValidValue(control({ kind: 'boolean' }), 'true')).toBe(false);
    expect(isValidValue(control({ kind: 'select', options: ['a', true] }), true)).toBe(true);
    expect(isValidValue(control({ kind: 'select', options: ['a'] }), 'b')).toBe(false);
    expect(isValidValue(control({ kind: 'number' }), Number.NaN)).toBe(false);
    expect(isValidValue(control({ kind: 'numberList', allowFalse: true }), false)).toBe(true);
    expect(isValidValue(control({ kind: 'numberList' }), false)).toBe(false);
    expect(isValidValue(control({ kind: 'numberList' }), [10, 'x'])).toBe(false);
    expect(isValidValue(control({ kind: 'text', numeric: true }), 460)).toBe(true);
    expect(isValidValue(control({ kind: 'text' }), 460)).toBe(false);
  });
});

describe('unflatten', () => {
  it('nests option fields under their prop and keeps plain props flat', () => {
    expect(
      unflatten({
        enableSorting: false,
        'pagination.pageSizeOptions': false,
        'pagination.variant': 'simple',
      }),
    ).toEqual({ enableSorting: false, pagination: { pageSizeOptions: false, variant: 'simple' } });
  });
});

describe('URL round trip', () => {
  it('restores exactly what was written', () => {
    const values = { 'pagination.pageSizeOptions': [5, 20], toolbar: 'bottom', maxHeight: 300 };
    const params = new URLSearchParams();
    writePropParams(values, params);
    expect(readPropParams(new URLSearchParams(params.toString()))).toEqual(values);
  });

  it('drops unknown props, malformed JSON and values of the wrong kind', () => {
    const params = new URLSearchParams(
      'p.notAProp=true&p.enableSorting=%7Bbad&p.pagination.pageSizeOptions="many"&p.toolbar="bottom"',
    );
    expect(readPropParams(params)).toEqual({ toolbar: 'bottom' });
  });
});

describe('code generation', () => {
  it('writes values the way people write them', () => {
    expect(jsLiteral({ pageSizeOptions: false, 'data-x': "it's" })).toBe(
      "{ pageSizeOptions: false, 'data-x': 'it\\'s' }",
    );
    expect(
      propsToJsx({
        enableRowSelection: true,
        enableSorting: false,
        toolbar: 'bottom',
        maxHeight: 300,
      }),
    ).toEqual([
      '  enableRowSelection',
      '  enableSorting={false}',
      '  toolbar="bottom"',
      '  maxHeight={300}',
    ]);
  });
});

describe('grouping and filtering', () => {
  it('orders the common feature groups first', () => {
    const groups = groupControls([
      control({ path: 'b', group: 'Other' }),
      control({ path: 'a', group: 'Pagination' }),
    ]).map(([group]) => group);
    expect(groups).toEqual(['Pagination', 'Other']);
  });

  it('matches the path, the type and the description', () => {
    const c = control({
      path: 'pagination.pageSizeOptions',
      type: 'number[] | false',
      description: 'Rows per page',
    });
    expect(matchesFilter(c, 'pagesize')).toBe(true);
    expect(matchesFilter(c, 'false')).toBe(true);
    expect(matchesFilter(c, 'rows per')).toBe(true);
    expect(matchesFilter(c, 'nothing')).toBe(false);
  });
});
