import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e config for Aura & Earth.
 *
 * Tests drive the real Vite app (HashRouter) on port 4173 and mock the
 * backend `/v1/**` API at the network layer (see e2e/support/mockApi.ts), so
 * the suite is deterministic and does NOT require the NestJS backend or real
 * credentials to be running.
 *
 * Port 4173 (Vite preview's default), NOT 3000: another local app (Control
 * Print IMS) squats on 3000, and `reuseExistingServer` would silently reuse it
 * — the suite would then test the wrong app and pass on pages that merely don't
 * overflow. Keep this port dedicated to Aura.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Cap the worker count. Playwright otherwise defaults to CPU/2 (7 here), and
  // at that level the auth-gated pages (login, profile) intermittently blow the
  // 7s expect timeout — full runs failed 1, 4 and 7 tests on three consecutive
  // attempts, with a different set failing each time. At 2 workers the same
  // suite passes 59/59, and finishes FASTER (52s vs 59s) because no run time is
  // lost to failures and screenshots.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Test against a production build served by `vite preview`. Static assets
  // (no Vite on-demand compilation) keep navigation fast and safe under
  // parallel workers — the dev server stalls when many cold page loads race.
  // Building here also verifies the app compiles.
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
