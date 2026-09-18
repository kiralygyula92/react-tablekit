import { defineConfig, devices } from '@playwright/test';

// 4173 is Vite's default and is often already taken by another project's preview server;
// a dedicated port means a stray server cannot be mistaken for this site (reuseExistingServer).
const PORT = 4183;
const isCI = !!process.env.CI;
// Chromium on PRs; all three engines on main / release.
const allBrowsers = process.env.E2E_ALL_BROWSERS === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Each worker runs a Chromium with its own MSW service worker; too many starve each other and
  // the demos time out. Six is stable on a developer machine, two in CI.
  workers: isCI ? 2 : 6,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /visual\.spec\.ts/ },
    ...(allBrowsers
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            testIgnore: /visual\.spec\.ts/,
          },
          { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /visual\.spec\.ts/ },
        ]
      : []),
    // Pixel baselines are per platform; run explicitly with `pnpm e2e:visual`.
    { name: 'visual', use: { ...devices['Desktop Chrome'] }, testMatch: /visual\.spec\.ts/ },
  ],
  webServer: {
    // The suite runs against the deployed artefact, prerendered HTML included — not against a
    // build that skips the step the site actually ships with.
    command: `pnpm exec vite build && pnpm run prerender && pnpm exec vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
