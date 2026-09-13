// Bundle budgets, measured min+gzip (not brotli), as a
// consumer's production build sees them: `process.env.NODE_ENV` is "production", so dev-only
// warnings are dropped.
//
// The limits are regression guards (measured size + ~2% headroom), not the docs/09 §4 targets;
// see docs/adr/003-bundle-budgets-and-tree-shaking.md. Raise them only deliberately, with a reason.
const production = (config) => ({
  ...config,
  define: { ...config.define, 'process.env.NODE_ENV': '"production"' },
});

module.exports = [
  {
    name: "import { DataTable } from 'react-tablekit'",
    path: 'dist/index.js',
    import: '{ DataTable }',
    limit: '58 kB',
    gzip: true,
    modifyEsbuildConfig: production,
    ignore: ['react', 'react-dom'],
  },
  {
    name: 'react-tablekit (full import)',
    path: 'dist/index.js',
    import: '*',
    limit: '61.5 kB',
    gzip: true,
    modifyEsbuildConfig: production,
    ignore: ['react', 'react-dom'],
  },
  {
    name: 'react-tablekit/core',
    path: 'dist/core/index.js',
    import: '*',
    limit: '21 kB',
    gzip: true,
    modifyEsbuildConfig: production,
  },
  {
    name: 'styles.css',
    path: 'dist/styles.css',
    limit: '7 kB',
    gzip: true,
  },
];
