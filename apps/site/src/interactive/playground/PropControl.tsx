import { useId, useState } from 'react';
import type { PropControl as PropControlSchema, PropValue } from './props';

interface PropControlProps {
  control: PropControlSchema;
  /** `undefined`: the prop is not passed and the library default applies. */
  value: PropValue | undefined;
  onChange: (value: PropValue | undefined) => void;
}

const DEFAULT_OPTION = '';

/** Parses "10, 25, 50" into numbers; returns undefined while the text is not a valid list yet. */
function parseNumberList(text: string): number[] | undefined {
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  const numbers = parts.map(Number);
  return numbers.every((n) => Number.isFinite(n)) ? numbers : undefined;
}

/**
 * One prop as a control. Every kind has a "default" state in which the prop is not passed, shown
 * next to the documented default — so the generated code only ever contains what you changed.
 */
export function PropControl({ control, value, onChange }: PropControlProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const changed = value !== undefined;
  const isFalse = value === false && (control.kind === 'text' || control.kind === 'numberList');

  // Free-text inputs keep their own draft, so an unfinished "10, 2" is not rejected mid-typing.
  const [draft, setDraft] = useState(() =>
    Array.isArray(value)
      ? value.join(', ')
      : typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '',
  );

  let input;
  switch (control.kind) {
    case 'boolean':
    case 'select': {
      const options = control.kind === 'boolean' ? [true, false] : (control.options ?? []);
      const index = options.findIndex((option) => option === value);
      input = (
        <select
          id={id}
          aria-describedby={hintId}
          value={index === -1 ? DEFAULT_OPTION : String(index)}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next === DEFAULT_OPTION ? undefined : options[Number(next)]);
          }}
        >
          <option value={DEFAULT_OPTION}>default</option>
          {options.map((option, i) => (
            <option key={String(option)} value={String(i)}>
              {String(option)}
            </option>
          ))}
        </select>
      );
      break;
    }
    case 'number':
      input = (
        <input
          id={id}
          aria-describedby={hintId}
          type="number"
          placeholder="default"
          value={typeof value === 'number' ? value : ''}
          onChange={(event) => {
            const raw = event.target.value;
            const n = Number(raw);
            onChange(raw === '' || !Number.isFinite(n) ? undefined : n);
          }}
        />
      );
      break;
    case 'text':
    case 'numberList':
      input = (
        <input
          id={id}
          aria-describedby={hintId}
          type="text"
          placeholder={control.kind === 'numberList' ? 'e.g. 10, 25, 50' : 'default'}
          disabled={isFalse}
          value={isFalse ? '' : draft}
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            if (text.trim() === '') {
              onChange(undefined);
            } else if (control.kind === 'numberList') {
              const list = parseNumberList(text);
              if (list) onChange(list);
            } else if (control.numeric && /^\d+(\.\d+)?$/.test(text.trim())) {
              onChange(Number(text.trim()));
            } else {
              onChange(text);
            }
          }}
        />
      );
      break;
  }

  return (
    <div className="prop-control" data-changed={changed || undefined}>
      <div className="prop-control__head">
        <label htmlFor={id}>
          <code>{control.path}</code>
        </label>
        {changed && (
          <button
            type="button"
            className="prop-control__reset"
            onClick={() => {
              setDraft('');
              onChange(undefined);
            }}
          >
            Reset<span className="site-visually-hidden"> {control.path}</span>
          </button>
        )}
      </div>
      <div className="prop-control__input">
        {input}
        {control.allowFalse && (
          <label className="prop-control__false">
            <input
              type="checkbox"
              checked={isFalse}
              onChange={(event) => {
                if (event.target.checked) onChange(false);
                else {
                  const restored =
                    control.kind === 'numberList' ? parseNumberList(draft) : draft || undefined;
                  onChange(restored);
                }
              }}
            />
            <code>false</code>
            <span className="site-visually-hidden"> for {control.path}</span>
          </label>
        )}
      </div>
      <p className="prop-control__hint" id={hintId}>
        <code>{control.type}</code>
        {control.defaultText !== undefined && <> · default {control.defaultText}</>}
        {control.description && <span className="prop-control__desc">{control.description}</span>}
      </p>
    </div>
  );
}
