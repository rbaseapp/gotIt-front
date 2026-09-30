import { defineConfig } from "@playwright/test";
import base from "./playwright.courses.config";

export default defineConfig({
  ...base,
  testMatch: "private-lesson-flow.spec.ts",
});
