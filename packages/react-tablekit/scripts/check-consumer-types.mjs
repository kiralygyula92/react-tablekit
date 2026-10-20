// Compiles a consumer project with declaration emit against dist/, the way a library that
// depends on this one would. Every value of every entry point is re-exported through an inferred
// type, so a type that a public declaration uses but no public entry exports fails with TS2883
// ("the inferred type ... cannot be named without a reference to dist/types-….js").
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const pkgDir = new URL('..', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', pkgDir), 'utf8'));

// Inside the package's node_modules: the consumer resolves react and @types/react from there, and
// git, ESLint and Prettier never see what is written.
const root = new URL('node_modules/.cache/consumer-types/', pkgDir);
const installed = new URL(`node_modules/${pkg.name}/`, root);
rmSync(root, { recursive: true, force: true });
mkdirSync(installed, { recursive: true });
cpSync(new URL('dist/', pkgDir), new URL('dist/', installed), { recursive: true });
cpSync(new URL('package.json', pkgDir), new URL('package.json', installed));

const locales = readdirSync(new URL('src/locales', pkgDir))
  .filter((f) => f.endsWith('.ts') && f !== 'types.ts')
  .map((f) => f.replace(/\.ts$/, ''));
const entries = {
  main: pkg.name,
  core: `${pkg.name}/core`,
  meta: `${pkg.name}/meta`,
  ...Object.fromEntries(locales.map((l) => [`locale_${l}`, `${pkg.name}/locales/${l}`])),
};
const source = [
  ...Object.entries(entries).map(([id, spec]) => `import * as ${id} from '${spec}';`),
  '',
  ...Object.keys(entries).map((id) => `export const ${id}Exports = { ...${id} };`),
  '',
].join('\n');

// .mts resolves the `import` condition (.d.ts), .cts the `require` condition (.d.cts).
writeFileSync(new URL('consumer.mts', root), source);
writeFileSync(new URL('consumer.cts', root), source);
writeFileSync(new URL('package.json', root), JSON.stringify({ name: 'consumer', private: true }));
writeFileSync(
  new URL('tsconfig.json', root),
  JSON.stringify({
    compilerOptions: {
      module: 'node16',
      moduleResolution: 'node16',
      target: 'es2022',
      lib: ['es2022', 'dom'],
      strict: true,
      declaration: true,
      emitDeclarationOnly: true,
      outDir: 'out',
      skipLibCheck: true,
      types: [],
    },
    files: ['consumer.mts', 'consumer.cts'],
  }),
);

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
const result = spawnSync(process.execPath, [tsc, '-p', fileURLToPath(root)], { stdio: 'inherit' });
if (result.status !== 0) {
  console.error('[consumer-types] a public declaration uses a type no public entry exports');
  process.exit(result.status ?? 1);
}
rmSync(root, { recursive: true, force: true });
console.log('[consumer-types] OK');
