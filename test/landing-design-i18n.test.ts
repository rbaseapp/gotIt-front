import { describe, expect, it } from "vitest";
import he from "../src/landing-design/i18n/he.json";
import ar from "../src/landing-design/i18n/ar.json";
import de from "../src/landing-design/i18n/de.json";
import en from "../src/landing-design/i18n/en.json";
import es from "../src/landing-design/i18n/es.json";
import fr from "../src/landing-design/i18n/fr.json";
import ru from "../src/landing-design/i18n/ru.json";
import zh from "../src/landing-design/i18n/zh.json";

const shapes = (text: string) =>
  (text.match(/\[\[\w+\]\]|<[^>]+>/g) ?? []).sort().join("|");

describe("landing design translations", () => {
  const locales: Record<string, Record<string, string>> = {
    ar,
    de,
    en,
    es,
    fr,
    ru,
    zh,
  };
  for (const [locale, dictionary] of Object.entries(locales)) {
    it(`${locale} covers every key and keeps markup and icons`, () => {
      const missing = Object.keys(he).filter((key) => !(key in dictionary));
      expect(missing).toEqual([]);
      const broken = Object.keys(he).filter(
        (key) =>
          shapes((he as Record<string, string>)[key]!) !==
          shapes(dictionary[key]!),
      );
      expect(broken).toEqual([]);
    });
  }
});
