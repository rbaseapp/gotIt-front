import { defineConfig } from "@playwright/test";

const deployedURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./test/e2e",
  reporter: [["list"]],
  use: {
    baseURL: deployedURL || "http://127.0.0.1:4184",
    channel: "chrome",
    locale: "he-IL",
    screenshot: "only-on-failure",
  },
  webServer: deployedURL
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 4184 --strictPort",
        env: { VITE_DEMO_MODE: "true" },
        url: "http://127.0.0.1:4184",
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
