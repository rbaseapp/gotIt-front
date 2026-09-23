import { afterEach, describe, expect, it } from "vitest";
import ar from "../src/locales/ar/translation.json";
import de from "../src/locales/de/translation.json";
import en from "../src/locales/en/translation.json";
import es from "../src/locales/es/translation.json";
import fr from "../src/locales/fr/translation.json";
import he from "../src/locales/he/translation.json";
import ru from "../src/locales/ru/translation.json";
import zh from "../src/locales/zh/translation.json";
import i18n, {
  normalizeUiLocale,
  setUiLocale,
  UI_LOCALE_STORAGE_KEY,
} from "../src/i18n";

function strings(
  value: unknown,
  path: Array<string | number> = [],
  result = new Map<string, string>(),
) {
  if (typeof value === "string") result.set(JSON.stringify(path), value);
  else if (Array.isArray(value))
    value.forEach((item, index) => strings(item, [...path, index], result));
  else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      strings(item, [...path, key], result),
    );
  }
  return result;
}

function placeholders(value: string) {
  return [...value.matchAll(/\{\{[^{}]+\}\}/gu)]
    .map((match) => match[0])
    .sort();
}

describe("UI locales", () => {
  afterEach(async () => {
    await setUiLocale("he");
  });

  it("keeps the English and Hebrew catalogs structurally aligned", () => {
    expect([...strings(en).keys()].sort()).toEqual(
      [...strings(he).keys()].sort(),
    );
  });

  it("normalizes supported regional language tags", () => {
    expect(normalizeUiLocale("zh-CN")).toBe("zh");
    expect(normalizeUiLocale("ar-IL")).toBe("ar");
    expect(normalizeUiLocale("ru-RU")).toBe("ru");
    expect(normalizeUiLocale("de-DE")).toBe("de");
    expect(normalizeUiLocale("fr-FR")).toBe("fr");
    expect(normalizeUiLocale("es-ES")).toBe("es");
    expect(normalizeUiLocale("ja-JP")).toBeNull();
  });

  it("contains every English string and preserves interpolation placeholders", () => {
    const source = strings(en);
    for (const locale of [zh, ar, ru, de, fr, es]) {
      const translated = strings(locale);
      for (const [path, value] of source) {
        expect(translated.has(path), `missing ${path}`).toBe(true);
        expect(
          placeholders(translated.get(path) ?? ""),
          `placeholders for ${path}`,
        ).toEqual(placeholders(value));
      }
    }
  });

  it("uses RTL only for Hebrew and Arabic", async () => {
    await setUiLocale("ar");
    expect(document.documentElement.dir).toBe("rtl");
    await setUiLocale("de");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("persists the selected locale and updates the translated document", async () => {
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
