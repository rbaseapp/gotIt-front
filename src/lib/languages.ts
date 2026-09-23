const LANGUAGE_CODES = [
  "en", "he", "ar", "es", "fr", "de", "it", "pt", "pt-BR", "ru",
  "uk", "pl", "nl", "tr", "el", "hi", "zh-CN", "zh-TW", "ja", "ko",
  "vi", "th", "id", "sv", "da", "no", "fi", "cs", "ro", "hu",
] as const;

export function getLanguageOptions(uiLocale: string): ReadonlyArray<readonly [string, string]> {
  let names: Intl.DisplayNames;
  try {
    names = new Intl.DisplayNames([uiLocale], { type: "language" });
  } catch {
    names = new Intl.DisplayNames(["en"], { type: "language" });
  }
  return LANGUAGE_CODES.map((code) => [code, names.of(code) || code] as const);
}
