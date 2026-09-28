import { DataTable, type TableSlots } from 'react-tablekit';
import { generatePeople, type DemoPerson } from '@/mock/data/people';
import { peopleColumns } from '@/demo-support/columns';

const data = generatePeople(40);

/**
 * Four replaced slots. Every slot receives the state it needs as props, so a
 * replacement is a plain component; there is no registry to configure and no CSS to fight.
 */
const slots: Partial<TableSlots<DemoPerson>> = {
  /** A search box with its own wrapper; `inputRef` must be forwarded for the hotkey to focus it. */
  SearchInput: ({ value, onChange, onClear, placeholder, label, clearLabel, inputRef }) => (
    <div className="demo-search">
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" onClick={onClear}>
          {clearLabel}
        </button>
      )}
    </div>
  ),

  /**
   * Wrapping the default is unnecessary here: the header cell is rebuilt, sorting included.
   *
   * Only presentation is taken from the slot props. The default `<th>` is itself clickable to
   * sort, so spreading the rest would leave those handlers on the cell, and a real button inside
   * a clickable cell is a nested interactive control, which is an axe violation.
   */
  HeaderCell: ({ header, isSorted, canSort, children, className, style }) => (
    <th
      className={className}
      style={style}
      scope="col"
      aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : undefined}
    >
      {/*
        `children` is already the sort control when the column is sortable: the default header
        builds a button around the label. Wrapping it in another button would nest one interactive
        control inside another, so the custom indicator goes beside it rather than around it.
      */}
      <span className="demo-th-button">
        {children}
        {canSort && (
          <span aria-hidden="true">
            {isSorted === 'asc' ? '▲' : isSorted === 'desc' ? '▼' : '·'}
          </span>
        )}
      </span>
      <span className="demo-th-id">{header.column.id}</span>
    </th>
  ),

  /** `reason` distinguishes "there is no data" from "nothing matched the filters". */
  EmptyState: ({ reason, onClearFilters, colSpan, ...rest }) => (
    <tr {...rest}>
      <td colSpan={colSpan} className="demo-empty">
        <p>{reason === 'noRows' ? 'Nobody here yet.' : 'No one matches those filters.'}</p>
        {onClearFilters && (
          <button type="button" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </td>
    </tr>
  ),

  /** A minimal pager; the slot hands over every command it needs. */
  Pagination: ({
    pageIndex,
    pageCount,
    canPrev,
    canNext,
    prev,
    next,
    style,
    'aria-label': label,
  }) => (
    <nav style={style} aria-label={label} className="demo-pager">
      <button type="button" onClick={prev} disabled={!canPrev}>
        ← Previous
      </button>
      <span>
        Page {pageIndex + 1} of {pageCount}
      </span>
      <button type="button" onClick={next} disabled={!canNext}>
        Next →
      </button>
    </nav>
  ),
};

/** Replacing the search box, the header cells, the empty state and the pager. */
export default function SlotsCustomComponentsExample() {
  return (
    <DataTable<DemoPerson>
      aria-label="People"
      data={data}
      columns={peopleColumns}
      getRowId={(p) => p.id}
      slots={slots}
      enableGlobalFilter
      initialState={{ pagination: { pageIndex: 0, pageSize: 6 } }}
    />
  );
}
