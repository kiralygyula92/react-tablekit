import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { groupEntries, searchEntries, type SearchEntry } from './buildIndex';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The Ctrl+K palette: one in-memory index over the pages, guide headings, examples,
 * API symbols, tokens and icons.
 *
 * It is a native `<dialog>`, so the browser supplies the modality, the focus trap, the backdrop
 * and Escape. The list is a listbox whose active option is tracked with `aria-activedescendant`,
 * which keeps focus — and therefore typing — in the input while the arrows move the selection.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => searchEntries(query), [query]);

  /**
   * The results are shown grouped, but the arrow keys walk a single list. Numbering the entries
   * here — in the order they are actually rendered — is what keeps the highlighted row and the
   * row that Enter opens the same row.
   */
  const sections = useMemo(() => {
    let next = 0;
    return groupEntries(results).map(([section, entries]) => ({
      section,
      items: entries.map((entry) => ({ entry, index: next++ })),
    }));
  }, [results]);

  const ordered = useMemo(
    () => sections.flatMap((group) => group.items.map((item) => item.entry)),
    [sections],
  );

  // Opening and closing is driven by the prop; `showModal` is what makes it a real dialog.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery('');
      setActive(0);
      dialog.showModal();
      // Focused here rather than with `autoFocus`, so re-opening focuses the box again.
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // A click on the backdrop lands on the dialog element itself. This is a DOM concern rather
  // than a JSX one, so it is a native listener.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose();
    };
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('click', onClick);
    };
  }, [onClose]);

  // Keep the highlighted row in view when the arrows walk past the edge of the list.
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (entry: SearchEntry | undefined) => {
    if (!entry) return;
    onClose();
    void navigate(entry.to);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (ordered.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      // Wrapping means the list is never a dead end in either direction.
      setActive((index) => (index + step + ordered.length) % ordered.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(ordered[active]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(Math.max(0, ordered.length - 1));
    }
  };

  const optionId = (index: number) => `palette-option-${String(index)}`;

  return (
    <dialog
      ref={dialogRef}
      className="palette"
      aria-label="Search the documentation"
      onClose={onClose}
    >
      <div className="palette__form">
        <span aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          className="palette__input"
          type="text"
          value={query}
          placeholder="Search guides, examples, props, tokens…"
          aria-label="Search"
          role="combobox"
          aria-expanded={ordered.length > 0}
          aria-controls="palette-list"
          aria-activedescendant={ordered.length > 0 ? optionId(active) : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <kbd className="palette__kbd">Esc</kbd>
      </div>

      {query.trim() === '' ? (
        <p className="palette__empty">
          Search the guides, the examples, every prop and every theme token.
        </p>
      ) : ordered.length === 0 ? (
        <p className="palette__empty">No matches for “{query}”.</p>
      ) : (
        <div
          className="palette__list"
          id="palette-list"
          role="listbox"
          aria-label="Search results"
          ref={listRef}
        >
          {sections.map((group) => (
            <div key={group.section} role="group" aria-label={group.section}>
              <div className="palette__section" aria-hidden="true">
                {group.section}
              </div>
              {group.items.map(({ entry, index }) => (
                // In the combobox pattern the options are deliberately not focusable: focus stays
                // in the input, `aria-activedescendant` points at the active option, and the keys
                // are handled there. Neither rule models that pattern.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                <div
                  key={entry.id}
                  id={optionId(index)}
                  className="palette__item"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(entry)}
                >
                  <strong>{entry.title}</strong>
                  <span>{entry.detail}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </dialog>
  );
}
