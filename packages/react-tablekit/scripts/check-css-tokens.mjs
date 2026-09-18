// Enforces "tokens are the API" on theme.css:
//  1. No colour literals (#hex, rgb(), hsl(), named colours) in any declaration except custom
//     property definitions (component tokens such as --tk-shadow-popover live at the top).
//  2. Colour, background, border, radius, shadow and typography properties must read a --tk-*
//     variable (or be a colour-free keyword like `none`, `0`, `transparent`, `inherit`).
// Layout spacing inside chrome (gaps in menus, toolbars) may use literal lengths.
import { readFileSync } from 'node:fs';

const file = new URL('../src/styles/theme.css', import.meta.url);
const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const TOKENIZED =
  /^(color|background|background-color|border|border-(top|right|bottom|left|block|inline)(-(start|end))?|border(-(top|right|bottom|left|block|inline))?-color|border-color|border-radius|border-(start|end)-(start|end)-radius|box-shadow|outline|outline-color|font|font-family|font-size|font-weight|text-transform|letter-spacing|fill|stroke|accent-color|text-decoration-color|caret-color)$/;
const KEYWORDS =
  /^(0|none|inherit|initial|unset|transparent|currentcolor|normal|1|inherit !important)$/i;
const COLOUR_FREE =
  /^(\d+(\.\d+)?(px|rem|em)?\s+)*(\d+(\.\d+)?(px|rem|em)\s+)?(solid|dashed|dotted)?\s*(transparent|currentcolor)$/i;
const COLOUR_LITERAL =
  /#[0-9a-f]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|lab|lch)\(|\b(white|black|red|blue|green|gray|grey|silver|yellow|orange|purple)\b/i;

const problems = [];
const declRe = /(^|[;{\s])(-{0,2}[a-z-]+)\s*:\s*([^;{}]+);/g;
for (const match of css.matchAll(declRe)) {
  const prop = match[2];
  const value = match[3].trim();
  const line = css.slice(0, match.index).split('\n').length;
  if (prop.startsWith('--')) continue;
  if (COLOUR_LITERAL.test(value.replace(/var\([^)]*\)/g, ''))) {
    problems.push(`theme.css:${line}  ${prop}: ${value}  (colour literal)`);
    continue;
  }
  if (!TOKENIZED.test(prop)) continue;
  if (value.includes('var(--tk-') || KEYWORDS.test(value) || COLOUR_FREE.test(value)) continue;
  problems.push(`theme.css:${line}  ${prop}: ${value}  (must read a --tk-* token)`);
}

if (problems.length > 0) {
  console.error('Visual CSS must use --tk-* tokens. Offending declarations:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('[check-css-tokens] theme.css OK');
