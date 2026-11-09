import { defineConfig } from "@playwright/test";

const port = process.env.E2E_PORT ?? "4174";

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: "chrome",
    locale: "he-IL",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    // These layout tests were written for the previous screens, which is what a loopback
    // host showed before the redesign became the default; they keep running against them.
    env: {
      VITE_DEMO_MODE: "true",
      VITE_DASHBOARD_DESIGN: "false",
      VITE_PRACTICE_DESIGN: "false",
      VITE_MYWORDS_DESIGN: "false",
      VITE_PROGRAMS_DESIGN: "false",
      VITE_SETTINGS_DESIGN: "false",
    },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
