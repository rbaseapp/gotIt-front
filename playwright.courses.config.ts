import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "courses.spec.ts",
  workers: 2,
  use: { ...base.use, channel: "msedge", reducedMotion: "reduce" },
});
