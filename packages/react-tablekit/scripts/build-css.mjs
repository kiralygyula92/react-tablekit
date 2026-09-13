// Builds the distributable CSS:
//   dist/styles.css          = layer order + base + light tokens + theme
//   dist/base.css            = layer order + base (structural only, for unstyled mode)
//   dist/presets/<name>.css  = one file per preset
// Everything is minified with Lightning CSS; @layer blocks are preserved.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { transform } from 'lightningcss';

const src = new URL('../src/styles/', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
const LAYER_ORDER = '@layer tablekit.base, tablekit.theme;\n';

const read = (name) => readFileSync(new URL(name, src), 'utf8');

function emit(outName, code) {
  const { code: out, warnings } = transform({
    filename: outName,
    code: Buffer.from(code),
    minify: true,
    // Safari 15.4 is the documented baseline (@layer + inset support).
    targets: { safari: (15 << 16) | (4 << 8), chrome: 99 << 16, firefox: 97 << 16 },
  });
  for (const w of warnings) console.warn(`[build-css] ${outName}: ${w.message}`);
  const target = new URL(outName, dist);
  mkdirSync(new URL('.', target), { recursive: true });
  writeFileSync(target, out);
  console.log(`[build-css] ${outName} (${out.length} bytes)`);
}

emit('styles.css', LAYER_ORDER + read('base.css') + read('tokens.css') + read('theme.css'));
emit('base.css', LAYER_ORDER + read('base.css'));

for (const file of readdirSync(new URL('presets/', src))) {
  if (file.endsWith('.css')) emit(`presets/${file}`, LAYER_ORDER + read(`presets/${file}`));
}
