import {
  useContext,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { defaultIcons } from '../../icons';
import { en } from '../../locales/en';
import { ViewContext } from '../context';
import { renderIcon } from '../renderIcon';
import { defaultSlots } from '../slots';
import type { Placement, RowAction, SlotPropsMap } from '../types';
import { cx } from '../utils';

/**
 * Cell building blocks (04 §9). They cover the layouts tables need repeatedly and honour slot
 * overrides when rendered inside a table (they also work standalone).
 */

function useSlots() {
  const view = useContext(ViewContext);
  return { slots: view?.slots ?? defaultSlots, icons: view?.icons ?? defaultIcons, t: view?.t };
}

/** Props of {@link Tooltip}. */
export type TooltipProps = SlotPropsMap<unknown>['Tooltip'];

/** Dark tooltip with portal positioning, shown on hover and focus (no dependency). */
export function Tooltip(props: TooltipProps) {
  const { slots } = useSlots();
  return <slots.Tooltip {...props} />;
}

/** Props of {@link ActionButton}. */
export interface ActionButtonProps {
  icon: ReactNode;
  /** Tooltip text and accessible name. */
  label: string;
  /** Runs when the button is activated. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  /** @default 'top' */
  tooltipPlacement?: Placement;
  /** @default 'primary' */
  color?: 'primary' | 'danger' | 'neutral';
  /** Stops the click from reaching the row (row click / selection). @default true */
  stopPropagation?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** An icon action button with a tooltip on top. */
export function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  tooltipPlacement = 'top',
  color = 'primary',
  stopPropagation = true,
  className,
  style,
}: ActionButtonProps) {
  const { slots } = useSlots();
  const button = (
    <slots.IconButton
      label={label}
      color={color}
      size="small"
      disabled={disabled}
      className={cx('tk-action-button', className)}
      style={style}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        onClick?.(e);
      }}
    >
      {icon}
    </slots.IconButton>
  );
  // A disabled button fires no pointer events; wrap it so the tooltip still works.
  return (
    <slots.Tooltip content={label} placement={tooltipPlacement}>
      {disabled ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focusable so keyboard users can reveal the tooltip
        <span className="tk-action-button__wrapper" tabIndex={0}>
          {button}
        </span>
      ) : (
        button
      )}
    </slots.Tooltip>
  );
}

/** Props of {@link RowActionsMenu}. */
export interface RowActionsMenuProps {
  actions: RowAction[];
  /** The first N actions are inline buttons; the rest go into a kebab menu. @default 2 */
  inlineCount?: number;
  /** Accessible name of the kebab button. */
  menuLabel?: string;
}

/** Inline action buttons plus an overflow "⋮" menu. */
export function RowActionsMenu({ actions, inlineCount = 2, menuLabel }: RowActionsMenuProps) {
  const { slots, icons, t } = useSlots();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const visible = actions.filter((a) => !a.hidden);
  const inline = visible.slice(0, inlineCount);
  const overflow = visible.slice(inlineCount);
  const label = menuLabel ?? t?.('moreActions') ?? String(en.moreActions);
  return (
    <span className="tk-row-actions">
      {inline.map((a) => (
        <ActionButton
          key={a.label}
          icon={a.icon}
          label={a.label}
          onClick={a.onClick}
          disabled={a.disabled ?? false}
          color={a.danger ? 'danger' : 'primary'}
        />
      ))}
      {overflow.length > 0 && (
        <>
          <slots.IconButton
            ref={anchorRef}
            label={label}
            size="small"
            className="tk-action-button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          >
            {renderIcon(icons.more)}
          </slots.IconButton>
          <slots.Menu
            open={open}
            onClose={() => setOpen(false)}
            anchorRef={anchorRef}
            label={label}
          >
            {overflow.map((a) => (
              <slots.MenuItem
                key={a.label}
                icon={a.icon}
                danger={a.danger ?? false}
                disabled={a.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  a.onClick();
                }}
              >
                {a.label}
              </slots.MenuItem>
            ))}
          </slots.Menu>
        </>
      )}
    </span>
  );
}

/** Props of {@link Checkbox}. */
export type CheckboxProps = SlotPropsMap<unknown>['Checkbox'];

/** 22px themed checkbox. */
export function Checkbox(props: CheckboxProps) {
  const { slots } = useSlots();
  return <slots.Checkbox {...props} />;
}

/** Props of {@link Chip}. */
export type ChipProps = SlotPropsMap<unknown>['Chip'];

/** A small rounded label (optionally clickable / deletable). */
export function Chip(props: ChipProps) {
  const { slots } = useSlots();
  return <slots.Chip {...props} />;
}

/** Props of {@link ChipList}. */
export interface ChipListProps<T> {
  items: T[];
  /** @default 3 */
  maxVisible?: number;
  /** Renders one chip; without it each item is shown with `getLabel`. */
  renderChip?: (item: T, index: number) => ReactNode;
  /** Label of the overflow chip. @default `(n) => '+' + n` */
  overflowLabel?: (hidden: number) => string;
  /** Text of each chip when `renderChip` is not given. */
  getLabel?: (item: T) => ReactNode;
  className?: string;
}

/** Wrapping chip list with a `+N` overflow chip. */
export function ChipList<T>({
  items,
  maxVisible = 3,
  renderChip,
  overflowLabel = (n) => `+${n}`,
  getLabel,
  className,
}: ChipListProps<T>) {
  const { slots } = useSlots();
  const visible = items.slice(0, maxVisible);
  const hidden = items.length - visible.length;
  return (
    <span className={cx('tk-chip-list', className)}>
      {visible.map((item, i) =>
        renderChip ? (
          <span key={i}>{renderChip(item, i)}</span>
        ) : (
          <slots.Chip key={i} label={getLabel ? getLabel(item) : String(item)} />
        ),
      )}
      {hidden > 0 && <slots.Chip className="tk-chip--overflow" label={overflowLabel(hidden)} />}
    </span>
  );
}

/** Props of {@link TruncatedText}. */
export interface TruncatedTextProps {
  text: string | null | undefined;
  /** Truncate after N characters. */
  maxChars?: number;
  /** Or clamp to N lines with CSS. */
  lines?: number;
  /** Show the full text in a tooltip when truncated. @default true */
  tooltip?: boolean;
  /** Rendered for empty text. @default '-' */
  empty?: ReactNode;
}

/** Truncated text with the full value in a tooltip. */
export function TruncatedText({
  text,
  maxChars,
  lines,
  tooltip = true,
  empty = '-',
}: TruncatedTextProps) {
  const { slots } = useSlots();
  if (!text) return <>{empty}</>;
  const truncated = maxChars !== undefined && text.length > maxChars;
  const shown = truncated ? `${text.slice(0, maxChars)}…` : text;
  const node = (
    <span
      className="tk-truncated"
      data-truncated={truncated || undefined}
      data-lines={lines}
      style={lines ? { WebkitLineClamp: lines } : undefined}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focusable so keyboard users can reveal the tooltip
      tabIndex={truncated && tooltip ? 0 : undefined}
    >
      {shown}
    </span>
  );
  return (truncated || lines) && tooltip ? (
    <slots.Tooltip content={text}>{node}</slots.Tooltip>
  ) : (
    node
  );
}

/** Props of {@link MultiLineList}. */
export interface MultiLineListProps {
  items: ReactNode[];
  /** Gap between lines in px. @default 4 */
  gap?: number;
  /** Rendered for an empty list. @default '-' */
  empty?: ReactNode;
}

/** One item per line, for lists such as emails or phone numbers. */
export function MultiLineList({ items, gap = 4, empty = '-' }: MultiLineListProps) {
  if (!items.length) return <>{empty}</>;
  return (
    <span className="tk-multiline" style={{ gap }}>
      {items.map((item, i) => (
        <span key={i} className="tk-multiline__item">
          {item}
        </span>
      ))}
    </span>
  );
}

/** Props of {@link TwoLineText}. */
export interface TwoLineTextProps {
  primary: ReactNode;
  secondary?: ReactNode;
  /** @default 600 */
  primaryWeight?: number;
  /** Rendered when the primary line is empty. @default '-' */
  empty?: ReactNode;
}

/** A strong first line and a muted second line, for an address or a similar pair. */
export function TwoLineText({
  primary,
  secondary,
  primaryWeight = 600,
  empty = '-',
}: TwoLineTextProps) {
  return (
    <span className="tk-two-line">
      <span className="tk-two-line__primary" style={{ fontWeight: primaryWeight }}>
        {primary === null || primary === undefined || primary === '' ? empty : primary}
      </span>
      {secondary !== null && secondary !== undefined && secondary !== '' && (
        <span className="tk-two-line__secondary">{secondary}</span>
      )}
    </span>
  );
}
