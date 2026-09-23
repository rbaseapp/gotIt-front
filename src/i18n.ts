import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/translation.json";
import he from "./locales/he/translation.json";

export const UI_LOCALE_STORAGE_KEY = "gotit.uiLocale.v1";
export const SUPPORTED_UI_LOCALES = ["en", "he"] as const;
export type UiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

export function normalizeUiLocale(value: string | null | undefined): UiLocale | null {
  if (!value) return null;
  try {
    const canonical = Intl.getCanonicalLocales(value)[0]?.split("-")[0];
    return canonical === "en" || canonical === "he" ? canonical : null;
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
  document.documentElement.dir = locale === "he" ? "rtl" : "ltr";
  document.title = i18n.t("meta.title");
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", i18n.t("meta.description"));
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: detectUiLocale(),
  fallbackLng: "en",
  supportedLngs: [...SUPPORTED_UI_LOCALES],
  interpolation: { escapeValue: false },
  initAsync: false,
});

applyDocumentLocale(normalizeUiLocale(i18n.resolvedLanguage) ?? "en");
i18n.on("languageChanged", (language) => {
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
