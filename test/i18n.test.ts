import { describe, expect, it } from "vitest";
import en from "../src/locales/en/translation.json";
import he from "../src/locales/he/translation.json";
import i18n, { setUiLocale, UI_LOCALE_STORAGE_KEY } from "../src/i18n";

function keys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("interface localization", () => {
  it("keeps the English and Hebrew catalogs structurally aligned", () => {
    expect(keys(en).sort()).toEqual(keys(he).sort());
  });

  it("persists the selected locale and updates document language and direction", async () => {
    await setUiLocale("en");
    expect(localStorage.getItem(UI_LOCALE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(document.documentElement).toHaveAttribute("dir", "ltr");
    expect(i18n.t("auth.password")).toBe("Password");

    await setUiLocale("he");
    expect(document.documentElement).toHaveAttribute("lang", "he");
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(i18n.t("auth.password")).toBe("סיסמה");
  });
});
