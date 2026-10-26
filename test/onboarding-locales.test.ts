import { describe, expect, it } from "vitest";
import ar from "../src/locales/start-ar.json";
import de from "../src/locales/start-de.json";
import en from "../src/locales/start-en.json";
import es from "../src/locales/start-es.json";
import fr from "../src/locales/start-fr.json";
import he from "../src/locales/start-he.json";
import ru from "../src/locales/start-ru.json";
import zh from "../src/locales/start-zh.json";

type Tree = { [key: string]: string | Tree };
const flat = (tree: Tree, prefix = ""): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((out, [key, value]) => {
    if (typeof value === "string") out[prefix + key] = value;
    else Object.assign(out, flat(value, `${prefix}${key}.`));
    return out;
  }, {});
const plural = /_(zero|one|two|few|many|other)$/;
const base = (key: string) => key.replace(plural, "");
const placeholders = (text: string) =>
  (text.match(/\{\{\w+\}\}/g) ?? []).sort().join(",");
// Meaning questions exist only in Hebrew, where the word bank has glosses.
const HEBREW_ONLY = new Set([
  "pocket.introBodyMeaning",
  "pocket.pickMeaning",
  "pocket.sampleRight",
  "pocket.sampleOther",
]);

describe("onboarding translations", () => {
  const english = flat(en.start as Tree);
  const required = new Set(
    Object.keys(english)
      .filter((key) => !HEBREW_ONLY.has(key))
      .map(base),
  );
  const locales: Record<string, { start: unknown }> = {
    ar,
    de,
    es,
    fr,
    he,
    ru,
    zh,
  };
  for (const [locale, file] of Object.entries(locales)) {
    it(`${locale} covers every screen and keeps the placeholders`, () => {
      const own = flat(file.start as Tree);
      const have = new Set(Object.keys(own).map(base));
      expect([...required].filter((key) => !have.has(key))).toEqual([]);
      const broken = Object.keys(own).filter(
        (key) =>
          !plural.test(key) &&
          english[key] !== undefined &&
          placeholders(english[key]) !== placeholders(own[key]!),
      );
      expect(broken).toEqual([]);
    });
  }
});
