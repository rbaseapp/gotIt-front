import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import i18n from "../src/i18n";

beforeEach(async () => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
  localStorage.setItem("gotit.uiLocale.v1", "he");
  await i18n.changeLanguage("he");
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
