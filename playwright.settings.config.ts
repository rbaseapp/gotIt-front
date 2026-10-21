import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "settings-live.spec.ts",
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5193",
    channel: "chrome",
    locale: "he-IL",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5193",
    url: "http://127.0.0.1:5193",
    env: { VITE_DEMO_MODE: "true", VITE_SETTINGS_DESIGN: "true" },
    reuseExistingServer: false,
  },
});
