import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import i18n from "../src/i18n";
import { invalidateResourceCache } from "../src/lib/resourceCache";

beforeEach(async () => {
  invalidateResourceCache(true);
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
  // The redesign is the product default. Tests of the previous screens keep running
  // against them; a test of a redesigned screen turns its switch on with stubEnv.
  for (const screen of [
    "DASHBOARD",
    "PRACTICE",
    "MYWORDS",
    "PROGRAMS",
    "SETTINGS",
  ])
    vi.stubEnv(`VITE_${screen}_DESIGN`, "false");
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
