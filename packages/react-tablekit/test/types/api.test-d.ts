import { describe, expectTypeOf, test } from 'vitest';
import {
  createColumnHelper,
  sortingFns,
  filterFns,
  type CellContext,
  type ColumnDef,
  type DeepKeys,
  type DeepValue,
  type Handler,
  type HandlerContext,
  type SlotPropsMap,
  type SortingFn,
  type TableSlots,
  type Updater,
} from '../../src';

interface Customer {
  id: string;
  age: number;
  displayName: { firstName: string; companyName?: string };
  tags: string[];
}

describe('DeepKeys / DeepValue', () => {
  test('dot paths, optional links and arrays', () => {
    expectTypeOf<'displayName.companyName'>().toExtend<DeepKeys<Customer>>();
    expectTypeOf<'tags'>().toExtend<DeepKeys<Customer>>();
    expectTypeOf<DeepValue<Customer, 'displayName.firstName'>>().toEqualTypeOf<string>();
    expectTypeOf<DeepValue<Customer, 'displayName.companyName'>>().toEqualTypeOf<
      string | undefined
    >();
  });
});

describe('createColumnHelper infers TValue', () => {
  const col = createColumnHelper<Customer>();

  test('from accessorKey', () => {
    col.accessor('age', {
      cell: (ctx) => {
        expectTypeOf(ctx.getValue()).toEqualTypeOf<number>();
        return null;
      },
    });
    col.accessor('displayName.companyName', {
      cell: (ctx) => {
        expectTypeOf(ctx.getValue()).toEqualTypeOf<string | undefined>();
        return null;
      },
    });
  });

  test('from accessorFn', () => {
    col.accessor((c) => c.tags.length > 0, {
      id: 'hasTags',
      cell: (ctx) => {
        expectTypeOf(ctx.getValue()).toEqualTypeOf<boolean>();
        expectTypeOf(ctx.row.original).toEqualTypeOf<Customer>();
        return null;
      },
    });
  });

  test('rejects unknown keys', () => {
    // @ts-expect-error -- not a path of Customer
    col.accessor('nope', {});
  });
});

describe('registries and handlers', () => {
  test('built-in fns are usable on typed columns', () => {
    const def: ColumnDef<Customer> = {
      accessorKey: 'age',
      sortingFn: sortingFns.basic,
      filterFn: filterFns.inNumberRange,
    };
    expectTypeOf(def).toExtend<ColumnDef<Customer>>();
    expectTypeOf(sortingFns.text).toExtend<SortingFn<Customer>>();
  });

  test('handler context types', () => {
    type Sort = HandlerContext<Customer, 'onSortToggle'>;
    const h: Handler<Sort> = (ctx, next) => {
      expectTypeOf(ctx.multi).toBeBoolean();
      return next({ multi: false });
    };
    expectTypeOf(h).toBeFunction();
  });

  test('slot prop types', () => {
    type HeaderCellProps = SlotPropsMap<Customer>['HeaderCell'];
    expectTypeOf<HeaderCellProps['column']['id']>().toBeString();
    expectTypeOf<SlotPropsMap<Customer>['Pagination']['goTo']>().toEqualTypeOf<
      (pageIndex: number) => void
    >();
    expectTypeOf<TableSlots<Customer>['Pagination']>().not.toBeAny();
  });

  test('Updater accepts values and functions', () => {
    expectTypeOf<number>().toExtend<Updater<number>>();
    expectTypeOf<(n: number) => number>().toExtend<Updater<number>>();
  });

  test('CellContext carries the row type', () => {
    expectTypeOf<CellContext<Customer, number>['row']['original']>().toEqualTypeOf<Customer>();
  });
});
