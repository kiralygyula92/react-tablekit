import { fileURLToPath } from 'node:url';
import mdx from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import { defineConfig, type Alias, type PluginOption } from 'vite';

const lib = (p: string) =>
  fileURLToPath(new URL(`../../packages/react-tablekit/src/${p}`, import.meta.url));

/**
 * The site always runs against the library *source* (docs/08: "it always runs against the
 * current source"), so every public subpath export is aliased to its src counterpart.
 * Order matters: the most specific patterns come first.
 */
export const libraryAliases: Alias[] = [
  { find: /^@\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
  { find: /^react-tablekit\/core$/, replacement: lib('core/index.ts') },
  { find: /^react-tablekit\/meta$/, replacement: lib('meta.ts') },
  { find: /^react-tablekit\/locales\/(.+)$/, replacement: lib('locales/$1.ts') },
  { find: /^react-tablekit\/styles\.css$/, replacement: lib('styles/index.css') },
  { find: /^react-tablekit\/base\.css$/, replacement: lib('styles/base-entry.css') },
  { find: /^react-tablekit\/presets\/(.+)\.css$/, replacement: lib('styles/presets/$1.css') },
  { find: /^react-tablekit$/, replacement: lib('index.ts') },
];

/**
 * The content pipeline, shared by the app build and the test runner so a page renders the same
 * way in both. MDX carries the page prose; its frontmatter becomes a named export.
 */
export const contentPlugins = (): PluginOption[] => [
  {
    enforce: 'pre',
    ...mdx({
      // Without a provider import source the compiled page ignores `MDXProvider`, so `<Demo>`
      // and the other authored components would be undefined at render time.
      providerImportSource: '@mdx-js/react',
      remarkPlugins: [
        remarkFrontmatter,
        [remarkMdxFrontmatter, { name: 'frontmatter' }],
        remarkGfm,
      ],
      rehypePlugins: [rehypeSlug],
    }),
  },
  react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
];

// The origin the canonical URLs, the OG images and the machine surface are built from. On
// Vercel the production domain is already in the build environment, so a deployment nobody
// configured still emits its own URLs rather than someone else's.
const siteOrigin =
  process.env.VITE_SITE_ORIGIN ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined);

// Build-time constants. Vercel Insights is a literal here rather than a runtime check so that a
// build made anywhere else eliminates the branch in `main.tsx` and drops both packages entirely:
// their scripts are served from `/_vercel` and exist on no other host. `VERCEL` is set in every
// Vercel build environment.
const define: Record<string, string> = {
  'import.meta.env.VITE_VERCEL_INSIGHTS': JSON.stringify(process.env.VERCEL === '1'),
  ...(siteOrigin ? { 'import.meta.env.VITE_SITE_ORIGIN': JSON.stringify(siteOrigin) } : {}),
};

export default defineConfig({
  base: process.env.SITE_BASE ?? '/',
  define,
  plugins: contentPlugins(),
  resolve: { alias: libraryAliases },
  server: { port: 5173 },
  preview: { port: 4183 },
});
