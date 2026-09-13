import { defineConfig } from 'vitest/config';
import { libraryAliases } from './vite.config.ts';

export default defineConfig({
  resolve: { alias: libraryAliases },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
