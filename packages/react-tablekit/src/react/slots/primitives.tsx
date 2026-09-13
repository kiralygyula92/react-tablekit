import {
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
} from 'react';
import { Portal } from '../portal';
import { CheckIcon, IndeterminateIcon } from '../../icons';
import { computePosition } from '../position';
import type { Placement, SlotPropsMap } from '../types';
import { cx, useIsomorphicLayoutEffect } from '../utils';

type P<K extends keyof SlotPropsMap<unknown>> = SlotPropsMap<unknown>[K];

/** Default `Button` slot. */
export const Button = forwardRef<HTMLButtonElement, P<'Button'>>(function Button(
  {
    variant = 'outlined',
    size = 'medium',
    startIcon,
    endIcon,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('tk-button', className)}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {startIcon && <span className="tk-button__icon">{startIcon}</span>}
      {children}
      {endIcon && <span className="tk-button__icon">{endIcon}</span>}
    </button>
  );
});

/** Default `IconButton` slot: `label` becomes the accessible name. */
export const IconButton = forwardRef<HTMLButtonElement, P<'IconButton'>>(function IconButton(
  { label, color = 'neutral', size = 'medium', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cx('tk-icon-button', className)}
      data-color={color}
      data-size={size}
      {...rest}
    >
      {children}
    </button>
  );
});

/** Default `Checkbox` slot: a 22px themed checkbox with a native input (keyboard + a11y). */
export const Checkbox = forwardRef<HTMLInputElement, P<'Checkbox'>>(function Checkbox(
  {
    checked,
    indeterminate = false,
    disabled = false,
    onChange,
    className,
    style,
    type = 'checkbox',
    ...rest
  },
  ref,
) {
  const inner = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <span
      className={cx('tk-checkbox', className)}
      style={style}
      data-checked={checked || undefined}
      data-indeterminate={(indeterminate && !checked) || undefined}
      data-disabled={disabled || undefined}
      data-type={type}
    >
      <input
        ref={(node) => {
          inner.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type={type}
        className="tk-checkbox__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked, e)}
        onClick={(e) => e.stopPropagation()}
        {...rest}
      />
      <span className="tk-checkbox__box" aria-hidden="true">
        {checked ? <CheckIcon /> : indeterminate ? <IndeterminateIcon /> : null}
      </span>
    </span>
  );
});

/** Default `Chip` slot. */
export const Chip = forwardRef<HTMLSpanElement, P<'Chip'>>(function Chip(
  {
    label,
    color,
    textColor,
    borderColor,
    onDelete,
    deleteLabel = 'Remove',
    size = 'small',
    onClick,
    className,
    style,
    ...rest
  },
  ref,
) {
  const colors: CSSProperties = {};
  if (color) (colors as Record<string, string>)['--tk-chip-bg'] = color;
  if (textColor) (colors as Record<string, string>)['--tk-chip-color'] = textColor;
  if (borderColor) (colors as Record<string, string>)['--tk-chip-border'] = borderColor;
  const interactive = !!onClick;
  return (
    <span
      ref={ref}
      className={cx('tk-chip', className)}
      data-size={size}
      data-clickable={interactive || undefined}
      style={{ ...colors, ...style }}
      {...(interactive
        ? {
            role: 'button',
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            },
          }
        : {})}
      {...rest}
    >
      <span className="tk-chip__label">{label}</span>
      {onDelete && (
        <button
          type="button"
          className="tk-chip__delete"
          aria-label={deleteLabel}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </span>
  );
});

/** Default `Select` slot (native select, no dependency). */
export const Select = forwardRef<HTMLSelectElement, P<'Select'>>(function Select(
  { value, options, onValueChange, className, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cx('tk-select', className)}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});

/** Default `TextInput` slot. */
export const TextInput = forwardRef<HTMLInputElement, P<'TextInput'>>(function TextInput(
  { value, onValueChange, className, type = 'text', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cx('tk-input', className)}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      {...rest}
    />
  );
});

/** Default `Spinner` slot (CSS-animated, respects reduced motion). */
export function Spinner({ size, className, style, label }: P<'Spinner'>) {
  const s: CSSProperties =
    size !== undefined ? { width: size, height: size, ...style } : { ...style };
  return (
    <span
      className={cx('tk-spinner', className)}
      style={s}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <circle cx="22" cy="22" r="20.2" fill="none" strokeWidth="3.6" />
      </svg>
    </span>
  );
}

/** Keeps a floating element positioned next to its anchor while open. */
function useFloating(
  open: boolean,
  anchor: () => HTMLElement | null,
  placement: Placement,
  offset = 4,
) {
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: Placement } | null>(null);
  const update = useCallback(() => {
    const a = anchor();
    const f = floatingRef.current;
    if (!a || !f) return;
    setPos(
      computePosition(
        a.getBoundingClientRect(),
        { width: f.offsetWidth, height: f.offsetHeight },
        placement,
        offset,
      ),
    );
  }, [anchor, placement, offset]);
  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, update]);
  return { floatingRef, pos };
}

interface TriggerProps {
  onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLElement>) => void;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  onBlur?: (e: FocusEvent<HTMLElement>) => void;
  'aria-describedby'?: string | undefined;
}

/**
 * Default `Tooltip` slot: dark tooltip rendered in a portal, shown on hover and focus, hidden
 * with Escape. No positioning dependency.
 */
export function Tooltip({ content, placement = 'top', delay = 100, children }: P<'Tooltip'>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const getAnchor = useCallback(() => anchorRef.current, []);
  const { floatingRef, pos } = useFloating(open, getAnchor, placement, 4);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (
    !isValidElement<TriggerProps>(children) ||
    content === null ||
    content === undefined ||
    content === ''
  ) {
    return children;
  }
  const show = (el: HTMLElement) => {
    anchorRef.current = el;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };
  const child = children;
  // eslint-disable-next-line react-hooks/refs -- reads the child element's props, not a ref
  const trigger = cloneElement(child, {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => {
      child.props.onMouseEnter?.(e);
      show(e.currentTarget);
    },
    onMouseLeave: (e: MouseEvent<HTMLElement>) => {
      child.props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      child.props.onFocus?.(e);
      show(e.currentTarget);
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      child.props.onBlur?.(e);
      hide();
    },
    'aria-describedby': open ? id : child.props['aria-describedby'],
  });
  return (
    <>
      {trigger}
      {open && (
        <Portal>
          <div
            ref={floatingRef}
            id={id}
            role="tooltip"
            className="tk-tooltip"
            data-placement={pos?.placement ?? placement}
            style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          >
            {content}
          </div>
        </Portal>
      )}
    </>
  );
}

/** Closes a floating element on outside click / Escape and restores focus to the anchor. */
function useDismiss(
  open: boolean,
  onClose: () => void,
  floatingRef: React.RefObject<HTMLDivElement | null>,
  anchorRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (floatingRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        anchorRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, floatingRef, anchorRef]);
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Default `Popover` slot: a non-modal dialog anchored to a trigger. */
export function Popover({
  open,
  onClose,
  anchorRef,
  placement = 'bottom-start',
  label,
  className,
  children,
  style,
  ...rest
}: P<'Popover'>) {
  const getAnchor = useCallback(() => anchorRef.current, [anchorRef]);
  const { floatingRef, pos } = useFloating(open, getAnchor, placement, 6);
  useDismiss(open, onClose, floatingRef, anchorRef);
  useEffect(() => {
    if (open) floatingRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [open, floatingRef]);
  if (!open) return null;
  return (
    <Portal>
      <div
        ref={floatingRef}
        role="dialog"
        aria-label={label}
        className={cx('tk-popover', className)}
        style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, ...style }}
        {...rest}
      >
        {children}
      </div>
    </Portal>
  );
}

/** Default `Menu` slot: `role="menu"` with arrow-key navigation. */
export function Menu({
  open,
  onClose,
  anchorRef,
  placement = 'bottom-end',
  label,
  className,
  children,
  style,
  ...rest
}: P<'Menu'>) {
  const getAnchor = useCallback(() => anchorRef.current, [anchorRef]);
  const { floatingRef, pos } = useFloating(open, getAnchor, placement, 4);
  useDismiss(open, onClose, floatingRef, anchorRef);
  useEffect(() => {
    if (open)
      floatingRef.current
        ?.querySelector<HTMLElement>('[role^="menuitem"]:not([disabled])')
        ?.focus();
  }, [open, floatingRef]);
  if (!open) return null;
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = [
      ...e.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])'),
    ];
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowDown') next = items[(index + 1) % items.length];
    else if (e.key === 'ArrowUp') next = items[(index - 1 + items.length) % items.length];
    else if (e.key === 'Home') next = items[0];
    else if (e.key === 'End') next = items[items.length - 1];
    else if (e.key === 'Tab') onClose();
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };
  return (
    <Portal>
      <div
        ref={floatingRef}
        role="menu"
        tabIndex={-1}
        aria-label={label}
        className={cx('tk-menu', className)}
        style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, ...style }}
        onKeyDown={onKeyDown}
        {...rest}
      >
        {children}
      </div>
    </Portal>
  );
}

/** Default `MenuItem` slot. */
export const MenuItem = forwardRef<HTMLButtonElement, P<'MenuItem'>>(function MenuItem(
  { icon, danger, checked, role = 'menuitem', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      role={role}
      tabIndex={-1}
      aria-checked={role === 'menuitem' ? undefined : !!checked}
      className={cx('tk-menu-item', className)}
      data-danger={danger || undefined}
      {...rest}
    >
      <span className="tk-menu-item__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="tk-menu-item__label">{children}</span>
    </button>
  );
});
