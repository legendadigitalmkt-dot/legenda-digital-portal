import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/editorial/e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    launchOptions: process.env.PORTAL_TEST_CHROMIUM_PATH
      ? {
          executablePath: process.env.PORTAL_TEST_CHROMIUM_PATH,
          args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        }
      : undefined,
    trace: "retain-on-failure",
    reducedMotion: "reduce",
  },
  webServer: {
    command: "node scripts/editorial/test-server.mjs",
    url: "http://127.0.0.1:4173/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
