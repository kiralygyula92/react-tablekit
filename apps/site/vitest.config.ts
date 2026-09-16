import { defineConfig } from 'vitest/config';
import { contentPlugins, libraryAliases } from './vite.config.ts';

export default defineConfig({
  plugins: contentPlugins(),
  resolve: { alias: libraryAliases },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
