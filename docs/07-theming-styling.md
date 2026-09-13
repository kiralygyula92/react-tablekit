# 07: Theming and Styling

## 1. Principles

- **Plain CSS + CSS custom properties.** There is no CSS-in-JS runtime. All rules live in cascade layers, so any consumer CSS (unlayered) wins without `!important`:
  ```css
  @layer tablekit.base, tablekit.theme;   /* declared at the top of styles.css */
  ```
  `tablekit.base` holds structural rules (layout, sticky/pinning, overlay positioning, visually-hidden). `tablekit.theme` holds the visual rules, which read only `--tk-*` tokens.
- **Tokens are the API.** Visual CSS never contains literal colours or sizes; it uses `var(--tk-…)`.
- **State through data attributes**, not modifier-class explosions: `[data-selected]`, `[data-sorted="asc"]`, `[data-pinned="right"]`, `[data-density="compact"]`, `[data-loading]`, `[data-disabled]`, `[data-expanded]`, `[data-depth="2"]`, `[data-scrolled-left]`, `[data-has-footer]`.
- **Stable class names**: the `tk-` prefix, with BEM-ish names like `tk-cell`, `tk-cell--pinned`, `tk-header-cell__label`. These are documented as public API (renaming one is a breaking change).
- Per-row CSS variables allow state-aware pinned cells: a row sets `--tk-row-bg`, and cells use `background: var(--tk-row-bg)`.

## 2. Applying a theme

Three equivalent ways:

```tsx
// A) CSS only: import the base plus a preset, zero JS
import 'react-tablekit/styles.css';
import 'react-tablekit/presets/classic.css';   // scopes tokens to .tk-root[data-theme="classic"] and :root opt-in class
<DataTable data-theme="classic" … />

// B) JS theme object: tokens become inline CSS variables on .tk-root
import { classicTheme, createTheme } from 'react-tablekit';
<DataTable theme={classicTheme} />
<DataTable theme={createTheme(classicTheme, { color: { accent: '#7C3AED' } })} />

// C) App-wide
<TableThemeProvider theme={classicTheme} colorScheme="auto">…</TableThemeProvider>
```

`createTheme(base, ...overrides)` deep-merges and returns a `TableTheme`. `theme.toCssVars()` (a utility) returns a `Record<string,string>` for SSR/static use.

## 3. Token catalogue (`TableTheme` → CSS variable)

| Group | Theme key | CSS variable | `light` default |
|---|---|---|---|
| **Font** | `font.family` | `--tk-font-family` | `inherit` |
| | `font.size` | `--tk-font-size` | `14px` |
| | `font.sizeSm` | `--tk-font-size-sm` | `0.875rem` |
| | `font.sizeXs` | `--tk-font-size-xs` | `0.75rem` |
| | `font.lineHeight` | `--tk-line-height` | `1.5` |
| | `font.weightRegular` / `weightStrong` | `--tk-font-weight` / `--tk-font-weight-strong` | `400` / `600` |
| | `font.numeric` | `--tk-font-variant-numeric` | `tabular-nums` |
| **Colour: surfaces** | `color.surface` | `--tk-color-surface` | `#FFFFFF` |
| | `color.surfaceMuted` | `--tk-color-surface-muted` | `#FAFAFA` |
| | `color.surfaceRaised` | `--tk-color-surface-raised` | `#FFFFFF` (menus, popovers) |
| **Colour: text** | `color.text` | `--tk-color-text` | `#252B37` |
| | `color.textMuted` | `--tk-color-text-muted` | `#717680` |
| | `color.textDisabled` | `--tk-color-text-disabled` | `#A4A7AE` |
| | `color.textOnAccent` | `--tk-color-text-on-accent` | `#FFFFFF` |
| **Colour: lines** | `color.border` | `--tk-color-border` | `#E9EAEB` |
| | `color.borderStrong` | `--tk-color-border-strong` | `#D5D7DA` |
| **Colour: accent** | `color.accent` | `--tk-color-accent` | `#2196F3` |
| | `color.accentSoft` | `--tk-color-accent-soft` | `#369AE91A` |
| | `color.accentBorder` | `--tk-color-accent-border` | `#2196F380` |
| | `color.danger` / `dangerSoft` / `dangerBorder` | `--tk-color-danger…` | `#F04438` / `#F044381A` / `#F0443880` |
| **Header** | `header.bg` | `--tk-header-bg` | `var(--tk-color-surface-muted)` |
| | `header.color` | `--tk-header-color` | `var(--tk-color-text-muted)` |
| | `header.fontSize` / `fontWeight` | `--tk-header-font-size` / `--tk-header-font-weight` | `var(--tk-font-size-sm)` / `600` |
| | `header.textTransform` / `letterSpacing` | `--tk-header-text-transform` / `--tk-header-letter-spacing` | `none` / `normal` |
| **Rows** | `row.bg` | `--tk-row-bg-default` | `var(--tk-color-surface)` |
| | `row.hoverBg` | `--tk-row-hover-bg` | `#F5F5F5` |
| | `row.selectedBg` | `--tk-row-selected-bg` | `#EAF6FF` |
| | `row.selectedHoverBg` | `--tk-row-selected-hover-bg` | `#DDEFFD` |
| | `row.stripedBg` | `--tk-row-striped-bg` | `#FAFAFA` |
| | `row.disabledOpacity` | `--tk-row-disabled-opacity` | `0.5` |
| | `row.divider` | `--tk-row-divider` | `1px solid var(--tk-color-border)` |
| **Spacing** | `space.cellX` / `cellXSm` | `--tk-cell-px` / `--tk-cell-px-sm` (below `sm`) | `20px` / `12px` |
| | `space.cellY` | `--tk-cell-py` | `12px` |
| | `space.headerY` / `headerYSm` | `--tk-header-py` / `--tk-header-py-sm` | `8px` / `12px` |
| | `space.toolbarGap` / `toolbarY` | `--tk-toolbar-gap` / `--tk-toolbar-py` | `12px` / `16px` |
| | `space.treeIndent` | `--tk-tree-indent` | `20px` |
| | density multipliers | `--tk-density-compact` / `--tk-density-comfortable` | `0.5` / `1.33` (applied to `cell-py`) |
| **Shape** | `radius.container` | `--tk-radius` | `8px` |
| | `radius.control` | `--tk-radius-sm` | `4px` |
| | `radius.chip` | `--tk-radius-chip` | `16px` |
| **Container** | `container.border` | `--tk-container-border` | `1px solid var(--tk-color-border)` |
| | `container.shadow` | `--tk-container-shadow` | `none` |
| | `container.minTableWidth` | `--tk-table-min-width` | `auto` |
| **Pinning** | `pinned.shadowLeft` / `shadowRight` | `--tk-pinned-shadow-left` / `-right` | `4px 0 6px -4px rgb(0 0 0 / .12)` / mirrored |
| **Overlay** | `overlay.bg` | `--tk-overlay-bg` | `rgb(255 255 255 / .7)` |
| | `overlay.spinnerSize` / `spinnerColor` | `--tk-spinner-size` / `--tk-spinner-color` | `40px` / `var(--tk-color-accent)` |
| **Focus** | `focus.ring` | `--tk-focus-ring` | `0 0 0 2px var(--tk-color-surface), 0 0 0 4px var(--tk-color-accent)` |
| **Controls** | `control.height` | `--tk-control-height` | `40px` |
| | `control.checkboxSize` | `--tk-checkbox-size` | `22px` |
| | `control.checkboxBorder` | `--tk-checkbox-border` | `#D5D7DA` |
| **Action button** | `action.color` / `hoverBg` / `hoverBorder` / `radius` / `padding` | `--tk-action-*` | accent / accentSoft / accentBorder / `4px` / `6px 4px` |
| **Tooltip** | `tooltip.bg` / `color` / `radius` / `padding` / `fontSize` | `--tk-tooltip-*` | `#181D27` / `#FFF` / `8px` / `8px 12px` / `0.75rem` |
| **Pagination** | `pagination.padding` | `--tk-pagination-padding` | `10px 20px` |
| | `pagination.itemSize` / `itemGap` / `itemRadius` / `itemPadding` | `--tk-page-item-size` / `-gap` / `-radius` / `-padding` | `40px` / `2px` / `4px` / `10px 16px` |
| | `pagination.itemColor` / `itemHoverBg` | `--tk-page-item-color` / `-hover-bg` | `#717680` / `#F5F5F5` |
| | `pagination.activeBg` / `activeColor` / `activeBorder` / `activeHoverBg` | `--tk-page-item-active-*` | `#F5F5F5` / `#252B37` / `#E9EAEB` / `#D5D7DA` |
| | `pagination.navBorder` / `navColor` / `navIcon` / `navHoverBorder` / `navHoverBg` / `navDisabledBorder` / `navDisabledColor` / `navDisabledIcon` | `--tk-page-nav-*` | `#D5D7DA` / `#252B37` / `#A4A7AE` / `#252B37` / `#F5F5F5` / `#E9EAEB` / `#A4A7AE` / `#D5D7DA` |
| **Z-index** | `z.pinned` / `header` / `pinnedHeader` / `overlay` / `popover` | `--tk-z-*` | `1` / `2` / `3` / `10` / `1300` |
| **Motion** | `motion.duration` / `easing` | `--tk-motion-duration` / `--tk-motion-easing` | `200ms` / `cubic-bezier(.2,0,0,1)` |
| **Breakpoints** | `breakpoints` | (JS only) | `{ xs:0, sm:600, md:960, lg:1280, xl:1440 }` |

## 4. `classic` preset: 1:1 Skimmer parity (exact)

Differences from `light` are **bold**. Everything else equals the `light` defaults above, which were chosen from Skimmer's palette on purpose.

```ts
export const classicTheme = createTheme(lightTheme, {
  name: 'classic',
  font: { family: '"Open Sans Variable", "Open Sans", Arial, sans-serif', size: '14px', lineHeight: '1.5' },
  row: { hoverBg: 'transparent' /* Skimmer has no hover */, selectedBg: '#EAF6FF', selectedHoverBg: '#EAF6FF' },
  pinned: { shadowLeft: 'none', shadowRight: 'none' },
  container: { minTableWidth: '650px', border: '1px solid #E9EAEB', shadow: 'none' },
  focus: { ring: '0 0 0 2px #FFFFFF, 0 0 0 4px #2196F3' }, // added; Skimmer relied on MUI defaults
  overlay: { bg: 'rgba(255,255,255,0.7)', spinnerSize: '40px', spinnerColor: '#2196F3' },
  pagination: { /* exactly the light values listed in §3 */ },
  breakpoints: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1440 },
  defaults: {                               // prop defaults a preset may set
    renderFallbackValue: '-',
    loadingDisplay: 'text',
    loadingOverlayDelayMs: 0,
    enableHover: false,
    minWidth: 650,
    noWrap: true,
    firstColumnAsRowHeader: true,
    pagination: {
      variant: { base: 'compact', md: 'numbered' },
      showFirstLast: { base: true, md: false },
      showPrevNextLabels: { base: false, md: true },
      siblingCount: 1, boundaryCount: 2,
      pageItemsAlgorithm: 'classic', hideOnSinglePage: true,
      pageSizeOptions: false, showRowRange: false,
    },
    compactPagination: { siblingCount: 0, boundaryCount: 2 },
    searchMinLength: 3, searchDebounceMs: 300,
    icons: { prev: ArrowLeftIcon, next: ArrowRightIcon },
  },
});
```

Parity details to verify in visual tests (from 01 §4 and §8):

| Element | Required rendering |
|---|---|
| Container | `1px #E9EAEB` border, `8px` radius. When pagination is visible, the container has no bottom border and square bottom corners; the pagination bar has no top border and `0 0 8px 8px` radius, so the two look like one box |
| Header cells | `#FAFAFA` background, `#717680` text, `0.875rem/1.5`, weight 600, padding `8px 20px` (≥600) / `12px` (<600), nowrap |
| Body cells | padding `12px 20px` / `12px`, text `#252B37`, 14px/1.5; the row divider is `1px #E9EAEB`; the last row has no divider |
| Selected row | `#EAF6FF`, including pinned cells |
| Pinned (actions) cell | White background (the row background), no shadow |
| Action icon button | Colour `#2196F3`, padding `6px 4px`, transparent 1px border. Hover: `#369AE91A` background, `#2196F380` border, 4px radius. Tooltip placed on top |
| Numbered pagination | As in 01 §4.6 (Prev/Next outlined with arrow icons, 40×40 page buttons, 2px gap) |
| Compact pagination | Centred, first/last/prev/next icon buttons, `siblingCount 0`, `boundaryCount 2`, small rounded items |
| Loading (initial) | One text row, centred, `16px` vertical padding, muted colour, "Loading..." |
| Overlay | `rgba(255,255,255,.7)` below the header, 40px accent spinner |
| Empty | One text row, centred, `16px` vertical padding, muted colour |
| Checkbox | 22px, `#D5D7DA` unchecked, `#2196F3` checked/indeterminate |

## 5. Other presets

| Preset | Description |
|---|---|
| `light` | The default. Same palette as classic, plus row hover, pinned-edge shadows, skeleton loading, row range, and a page-size selector |
| `dark` | Surface `#0F1115`, muted surface `#161A20`, text `#E6E8EB`, muted text `#9AA1AC`, border `#262B33`, accent `#4DA3FF`, selected `#13263B`, hover `#1B2028`, overlay `rgb(15 17 21 / .6)`, tooltip `#E6E8EB` on `#0F1115`. Contrast is AA-verified |
| `compact` | Density compact by default, 13px font, cell padding `6px 12px`, 32px controls, page items 32px |
| `minimal` | No outer border, no header background, dividers only. Good for embedding in cards |

`colorScheme: 'auto'` switches between `light` and `dark` (or the user-supplied `theme` and `darkTheme`) with `prefers-color-scheme`. `data-color-scheme` is set on the root.

## 6. Structural CSS rules (base layer): must-haves

```css
@layer tablekit.base {
  .tk-root { position: relative; box-sizing: border-box; font: var(--tk-font-size)/var(--tk-line-height) var(--tk-font-family); color: var(--tk-color-text); }
  .tk-container { position: relative; overflow: auto; max-width: 100%; }
  .tk-table { border-collapse: separate; border-spacing: 0; width: 100%; min-width: var(--tk-table-min-width); }
  /* separate + per-cell borders is required so sticky cells keep their borders */
  .tk-row { --tk-row-bg: var(--tk-row-bg-default); background: var(--tk-row-bg); }
  .tk-row[data-selected] { --tk-row-bg: var(--tk-row-selected-bg); }
  .tk-cell, .tk-header-cell { background: var(--tk-row-bg, var(--tk-header-bg)); }
  .tk-cell[data-pinned], .tk-header-cell[data-pinned] { position: sticky; z-index: var(--tk-z-pinned); }
  .tk-cell[data-pinned="left"]  { inset-inline-start: var(--tk-pin-offset); }
  .tk-cell[data-pinned="right"] { inset-inline-end:   var(--tk-pin-offset); }
  .tk-head[data-sticky] .tk-header-cell { position: sticky; top: 0; z-index: var(--tk-z-header); }
  .tk-head[data-sticky] .tk-header-cell[data-pinned] { z-index: var(--tk-z-pinned-header); }
  .tk-overlay { position: absolute; inset: var(--tk-head-height, 0px) 0 0 0; display: grid; place-items: center; z-index: var(--tk-z-overlay); }
  .tk-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  @media (prefers-reduced-motion: reduce) { .tk-root * { transition: none !important; animation: none !important; } }
}
```

(Illustrative; the builder completes it. The important points are the separate border model, the row-bg variable, sticky pinning with offset variables, and the overlay inset.)

## 7. Unstyled mode

`unstyled` (prop) or importing only `react-tablekit/base.css` gives structural CSS and no visual CSS. Class names and data attributes stay the same, so Tailwind/other styling can target them. There is a documented recipe for a full Tailwind skin using `classNames`.

## 8. Theme editor in the demo

The site has a live **theme editor** (08 §3.4) that edits tokens, previews them on a sample table, and exports the result as a `createTheme(...)` snippet or a CSS-variables block. It is the fastest way to validate token coverage: every visual property on the demo table must be controllable from it.
