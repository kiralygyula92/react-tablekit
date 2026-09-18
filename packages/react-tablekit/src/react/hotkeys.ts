import { isApplePlatform } from './utils';

/** A parsed hotkey such as `mod+k`. */
export interface ParsedHotkey {
  key: string;
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

/** Parses `'mod+k'`, `'ctrl+shift+f'`, … (`mod` = ⌘ on Apple platforms, Ctrl elsewhere). */
export function parseHotkey(hotkey: string): ParsedHotkey {
  const parts = hotkey
    .toLowerCase()
    .split('+')
    .map((p) => p.trim());
  const key = parts[parts.length - 1] ?? '';
  return {
    key,
    mod: parts.includes('mod'),
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
  };
}

/** `true` when a keyboard event matches the hotkey. */
export function matchesHotkey(
  e: KeyboardEvent,
  hk: ParsedHotkey,
  apple = isApplePlatform(),
): boolean {
  if (e.key.toLowerCase() !== hk.key) return false;
  const wantCtrl = hk.ctrl || (hk.mod && !apple);
  const wantMeta = hk.meta || (hk.mod && apple);
  return (
    e.ctrlKey === wantCtrl &&
    e.metaKey === wantMeta &&
    e.shiftKey === hk.shift &&
    e.altKey === hk.alt
  );
}

/** Human label for the hint chip: `Ctrl+K` / `⌘K`. */
export function hotkeyLabel(hotkey: string, apple = isApplePlatform()): string {
  const hk = parseHotkey(hotkey);
  const key =
    hk.key.length === 1 ? hk.key.toUpperCase() : hk.key.charAt(0).toUpperCase() + hk.key.slice(1);
  if (apple) {
    return `${hk.ctrl ? '⌃' : ''}${hk.alt ? '⌥' : ''}${hk.shift ? '⇧' : ''}${hk.mod || hk.meta ? '⌘' : ''}${key}`;
  }
  const mods = [
    hk.mod || hk.ctrl ? 'Ctrl' : '',
    hk.meta ? 'Win' : '',
    hk.alt ? 'Alt' : '',
    hk.shift ? 'Shift' : '',
  ].filter(Boolean);
  return [...mods, key].join('+');
}

interface Entry {
  hotkey: ParsedHotkey;
  doc: Document;
  lastActive: number;
  order: number;
  trigger: (event: KeyboardEvent) => void;
}

const entries = new Set<Entry>();
const listening = new WeakSet<Document>();
let seq = 0;

const isTextField = (el: Element | null) =>
  !!el &&
  (el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement &&
      !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(el.type)) ||
    (el as HTMLElement).isContentEditable);

function onKeyDown(this: Document, e: KeyboardEvent) {
  const candidates = [...entries].filter((en) => en.doc === this && matchesHotkey(e, en.hotkey));
  if (!candidates.length) return;
  const hk = candidates[0]!.hotkey;
  // Plain keys never steal typing from another text field.
  if (!hk.mod && !hk.ctrl && !hk.meta && isTextField(this.activeElement)) return;
  const target = candidates.reduce((a, b) =>
    b.lastActive > a.lastActive || (b.lastActive === a.lastActive && b.order > a.order) ? b : a,
  );
  e.preventDefault();
  target.trigger(e);
}

/**
 * Registers a scoped hotkey: only the most recently focused/hovered table with the
 * same hotkey reacts, and it focuses its own input.
 */
export function registerHotkey(hotkey: string, doc: Document, trigger: (e: KeyboardEvent) => void) {
  const entry: Entry = { hotkey: parseHotkey(hotkey), doc, lastActive: 0, order: ++seq, trigger };
  entries.add(entry);
  if (!listening.has(doc)) {
    listening.add(doc);
    doc.addEventListener('keydown', onKeyDown);
  }
  return {
    touch: () => {
      entry.lastActive = ++seq;
    },
    dispose: () => {
      entries.delete(entry);
    },
  };
}
