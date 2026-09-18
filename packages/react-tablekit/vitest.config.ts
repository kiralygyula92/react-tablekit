import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          // The headless engine is tested without a DOM, which also proves it never needs one.
          name: 'core',
          environment: 'node',
          include: ['test/core/**/*.test.ts', 'test/property/**/*.test.ts'],
          typecheck: {
            enabled: true,
            include: ['test/types/**/*.test-d.ts'],
            tsconfig: './tsconfig.json',
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'react',
          environment: 'jsdom',
          include: ['test/react/**/*.test.{ts,tsx}'],
          setupFiles: ['test/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          // The performance budgets. Single-threaded and serial, so timings are not distorted by
          // workers competing for the CPU.
          name: 'perf',
          environment: 'jsdom',
          include: ['test/perf/**/*.test.{ts,tsx}'],
          setupFiles: ['test/setup.ts'],
          fileParallelism: false,
          maxWorkers: 1,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/meta.ts', 'src/locales/**'],
      reporter: ['text-summary', 'lcov'],
      // Coverage gates: core >= 90% lines / 85% branches, react >= 80%.
      thresholds: {
        'src/core/**': { lines: 90, branches: 85 },
        'src/react/**': { lines: 80, branches: 80 },
      },
    },
  },
});
