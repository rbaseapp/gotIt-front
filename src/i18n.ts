import i18n, { type BackendModule, type ResourceKey } from "i18next";
import { initReactI18next } from "react-i18next";

export const UI_LOCALE_STORAGE_KEY = "gotit.uiLocale.v1";
export const SUPPORTED_UI_LOCALES = [
  "en",
  "he",
  "zh",
  "ar",
  "ru",
  "de",
  "fr",
  "es",
] as const;
export type UiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

export function normalizeUiLocale(
  value: string | null | undefined,
): UiLocale | null {
  if (!value) return null;
  try {
    const canonical = Intl.getCanonicalLocales(value)[0]?.split("-")[0];
    return SUPPORTED_UI_LOCALES.find((locale) => locale === canonical) ?? null;
  } catch {
    return null;
  }
}

function detectUiLocale(): UiLocale {
  let storedValue: string | null = null;
  try {
    storedValue = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
  const stored = normalizeUiLocale(storedValue);
  if (stored) return stored;
  for (const language of navigator.languages) {
    const supported = normalizeUiLocale(language);
    if (supported) return supported;
  }
  return "en";
}

function applyDocumentLocale(locale: UiLocale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir =
    locale === "he" || locale === "ar" ? "rtl" : "ltr";
  document.title = i18n.t("meta.title");
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", i18n.t("meta.description"));
}

/**
 * Each language's strings are a separate download: a learner loads only their own language
 * (and English, the fallback), not all eight.
 */
const locales: Record<UiLocale, () => Promise<ResourceKey>> = {
  en: () =>
    Promise.all([
      import("./locales/en/translation.json"),
      import("./locales/start-en.json"),
      import("./locales/pricing-en.json"),
    ]).then(([base, start, pricing]) => ({
      ...base.default,
      pricing: pricing.default,
      ...start.default,
    })),
  he: () =>
    Promise.all([
      import("./locales/he/translation.json"),
      import("./locales/start-he.json"),
      import("./locales/pricing-he.json"),
    ]).then(([base, start, pricing]) => ({
      ...base.default,
      pricing: pricing.default,
      ...start.default,
    })),
  ar: () =>
    Promise.all([
      import("./locales/ar/translation.json"),
      import("./locales/start-ar.json"),
    ]).then(([base, start]) => ({
      ...base.default,
      ...start.default,
    })),
  de: () =>
    Promise.all([
      import("./locales/de/translation.json"),
      import("./locales/start-de.json"),
    ]).then(([base, start]) => ({
      ...base.default,
      ...start.default,
    })),
  es: () =>
    Promise.all([
      import("./locales/es/translation.json"),
      import("./locales/start-es.json"),
    ]).then(([base, start]) => ({
      ...base.default,
      ...start.default,
    })),
  fr: () =>
    Promise.all([
      import("./locales/fr/translation.json"),
      import("./locales/start-fr.json"),
    ]).then(([base, start]) => ({
      ...base.default,
      ...start.default,
    })),
  ru: () =>
    Promise.all([
      import("./locales/ru/translation.json"),
      import("./locales/start-ru.json"),
    ]).then(([base, start]) => ({
      ...base.default,
      ...start.default,
    })),
  zh: () =>
    Promise.all([
      import("./locales/zh/translation.json"),
      import("./locales/start-zh.json"),
    ]).then(([base, start]) => ({
      ...base.default,
      ...start.default,
    })),
};
const lazyLocales: BackendModule = {
  type: "backend",
  init() {},
  read(language, _namespace, callback) {
    const load = locales[language as UiLocale];
    if (!load) {
      callback(null, {});
      return;
    }
    load().then(
      (strings) => callback(null, strings),
      (error: unknown) => callback(error as Error, false),
    );
  },
};

/** Resolves once the learner's language is loaded; render the app after it. */
export const i18nReady = i18n
  .use(lazyLocales)
  .use(initReactI18next)
  .init({
    lng: detectUiLocale(),
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_UI_LOCALES],
    load: "languageOnly",
    interpolation: { escapeValue: false },
  })
  .then(() => {
    applyDocumentLocale(normalizeUiLocale(i18n.resolvedLanguage) ?? "en");
  });
i18n.on("languageChanged", (language) => {
  if (i18n.isInitialized)
    applyDocumentLocale(normalizeUiLocale(language) ?? "en");
});

export async function setUiLocale(locale: UiLocale): Promise<void> {
  try {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  } catch {
    // The active session still changes language when persistence is blocked.
  }
  await i18n.changeLanguage(locale);
}

export default i18n;
