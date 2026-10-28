import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CHROME_EXTENSION_URL } from "../config";
import { testimonials } from "../data/testimonials";
import { supportEmailHref } from "../lib/supportContact";
import { normalizeUiLocale, setUiLocale, type UiLocale } from "../i18n";
import template from "./body.tpl.html?raw";
import pickerCss from "./picker.css?inline";
import { initLanding } from "./init";
import "./fonts.css";

const SIGNUP_PATH = "/signup";
const RTL_LOCALES = new Set<string>(["he", "ar"]);
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  he: "עברית",
  ar: "العربية",
  ru: "Русский",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  zh: "中文",
};

type Dictionary = Record<string, string>;
const dictionaries = import.meta.glob<{ default: Dictionary }>("./i18n/*.json");
const loadDictionary = async (locale: string): Promise<Dictionary> => {
  const load = dictionaries[`./i18n/${locale}.json`];
  return load ? (await load()).default : {};
};
const loadCss = async (rtl: boolean) =>
  rtl
    ? (await import("./design.css?inline")).default
    : (await import("./design.ltr.css?inline")).default;

const ICON_TOKEN = /\[\[(\w+)\]\]/g;
const HIGHLIGHT =
  '<svg viewBox="0 0 500 26" preserveAspectRatio="none" aria-hidden="true"><path d="M8 17Q240 1 489 14M80 24Q300 10 450 21"></path></svg>';
const expandIcons = (text: string) =>
  text.replace(ICON_TOKEN, (_m, name: string) =>
    name === "hl" ? HIGHLIGHT : `<svg><use href="#${name}"></use></svg>`,
  );

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Real learner quotes only; the section is omitted while there are none. */
function testimonialsHtml(t: (key: string) => string) {
  if (!testimonials.length) return "";
  const monograms = ["", "yellow-avatar", "pink-avatar"];
  const cards = testimonials
    .slice(0, 3)
    .map(
      (item, i) =>
        `<figure class="review reveal"><span class="quote-mark">“</span><blockquote${item.lang ? ` lang="${item.lang}"` : ""}>${escapeHtml(item.quote)}</blockquote><figcaption><span class="review-monogram ${monograms[i % 3]}">★</span><span><strong>${t("x003")}</strong></span></figcaption></figure>`,
    )
    .join("");
  return `<section class="testimonials section-shell section-space"><div class="reviews-heading reveal"><div><span class="eyebrow">${t("x001")}</span><h2>${t("x002")}</h2></div></div><div class="review-grid">${cards}</div></section>`;
}

/**
 * The public landing page in the supplied design, in every interface language.
 * It lives in a shadow root so its global-looking styles (h1, button,
 * .button, .footer...) cannot touch the app and the app's styles cannot
 * touch it. Right-to-left languages use the original stylesheet, the others a
 * mirrored copy.
 */
export default function LandingDesign() {
  const hostRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = normalizeUiLocale(i18n.resolvedLanguage) ?? "en";
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let dispose = () => {};
    const rtl = RTL_LOCALES.has(lang);
    void Promise.all([
      loadDictionary("he"),
      loadDictionary("en"),
      loadDictionary(lang),
      loadCss(rtl),
    ]).then(([he, en, own, css]) => {
      if (cancelled) return;
      const t = (key: string) =>
        expandIcons(own[key] ?? en[key] ?? he[key] ?? "");
      const body = template
        .replace(/\{\{(\w+)\}\}/g, (_m, key: string) => t(key))
        .replace("<!--TESTIMONIALS-->", testimonialsHtml(t));
      const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
      const dir = rtl ? "rtl" : "ltr";
      shadow.innerHTML = `<style>${css}${pickerCss}</style><div class="gl-root js-motion" dir="${dir}" lang="${lang}">${body}</div>`;
      dispose = initLanding(shadow, {
        navigate,
        t,
        lang,
        dir,
        languageNames: LANGUAGE_NAMES,
        setLanguage: (code: string) => void setUiLocale(code as UiLocale),
        destinations: {
          signup: SIGNUP_PATH,
          login: "/login",
          extension: CHROME_EXTENSION_URL,
          contact: supportEmailHref("GotIt"),
          privacy: "/privacy",
          terms: "/terms",
        },
      });
    });
    return () => {
      cancelled = true;
      dispose();
    };
  }, [navigate, lang]);
  return <div ref={hostRef} data-testid="landing-design" />;
}
