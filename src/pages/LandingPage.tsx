import {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Mail, MessageCircle, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UiLanguageSelect } from "../components/UiLanguageSelect";
import { CHROME_EXTENSION_URL } from "../config";
import { testimonials } from "../data/testimonials";
import { useInView } from "../hooks/useInView";
import { LANGUAGE_CODES } from "../lib/languages";
import { supportEmailHref, supportWhatsappHref } from "../lib/supportContact";
import { ExtensionPanel, ScaledScreen } from "../components/LandingReplicas";
import logoClearUrl from "../assets/gotit-logo-clear.svg";
import tutorThinking from "../assets/private-lesson/tutor-female-thinking.png";
import {
  FinalCta,
  HowItWorks,
  LandingHeader,
  MobileBar,
  NewHero,
  PlanTeaser,
  PocketTeaser,
  PricingTeaser,
  TrustBar,
  TutorTeaser,
} from "../components/landing/LandingV2";
import "../landing.css";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** The Hebrew page follows the supplied design; other languages keep the shared layout. */
const LandingDesign = lazy(() => import("../landing-design/LandingDesign"));

export function LandingPage() {
  const { i18n } = useTranslation();
  if (i18n.resolvedLanguage === "he")
    return (
      <Suspense fallback={null}>
        <LandingDesign />
      </Suspense>
    );
  return (
    <div className="landing l2">
      <LandingHeader />
      <main>
        <NewHero />
        <TrustBar />
        <PocketTeaser />
        <HowItWorks markDemo={<MarkDemo />} />
        <PlanTeaser />
        <TutorTeaser />
        <PricingTeaser />
        <Languages />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <Closing />
      <MobileBar />
    </div>
  );
}

/**
 * A word is marked on a page and saved. Plays when `active` turns on (the
 * desktop stage) or, without it, when it scrolls into view (phones).
 */
function MarkDemo({ active }: { active?: boolean }) {
  const { t } = useTranslation();
  const [viewRef, inView] = useInView<HTMLElement>();
  const play = active ?? inView;
  const [stage, setStage] = useState(0);
  const browserRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLElement>(null);
  const [anchor, setAnchor] = useState({ top: 150, left: 0 });
  // Like the extension, open the panel 10px under the selected word.
  useLayoutEffect(() => {
    const browser = browserRef.current;
    const word = wordRef.current;
    if (!browser || !word || !("ResizeObserver" in window)) return;
    const update = () => {
      const box = browser.getBoundingClientRect();
      const rect = word.getBoundingClientRect();
      const panel = browser.querySelector<HTMLElement>(".demo-panel");
      const panelWidth = Math.min(panel?.offsetWidth || 300, box.width);
      setAnchor({
        top: rect.bottom - box.top + 10,
        left: Math.max(
          0,
          Math.min(rect.left - box.left - 24, box.width - panelWidth),
        ),
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(browser);
    update();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setStage(3);
      return;
    }
    if (!play) {
      setStage(0);
      return;
    }
    const timers = [400, 1300, 2800].map((delay, index) =>
      window.setTimeout(() => setStage(index + 1), delay),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [play]);
  return (
    <figure
      ref={viewRef}
      className="landing-demo"
      data-stage={stage}
      aria-label={t("landing.demo.label")}
    >
      <div className="demo-browser" aria-hidden="true" ref={browserRef}>
        <div className="demo-browser-bar">
          <span />
          <span />
          <span />
        </div>
        <div className="demo-article" dir="ltr" lang="en">
          <p className="demo-article-kicker">City life</p>
          <p className="demo-article-title">
            The corner café is back in fashion
          </p>
          <p>
            Small neighborhood cafés{" "}
            <mark className="demo-word" ref={wordRef}>
              thrive
            </mark>{" "}
            when regulars treat them like a second living room. Owners say the
            trick is simple: remember names, and keep the bread warm.
          </p>
          <p className="demo-article-faded">
            In the last two years, more than forty new places have opened on the
            east side alone.
          </p>
        </div>
        <div className="demo-panel" style={anchor}>
          <ScaledScreen width={430}>
            <ExtensionPanel saved={stage >= 3} />
          </ScaledScreen>
        </div>
      </div>
    </figure>
  );
}

/** "Hello" in each supported language, shown on the moving rows. */
const GREETINGS: Record<(typeof LANGUAGE_CODES)[number], string> = {
  en: "Hello",
  he: "שלום",
  ar: "مرحبا",
  es: "Hola",
  fr: "Bonjour",
  de: "Hallo",
  it: "Ciao",
  pt: "Olá",
  "pt-BR": "Oi",
  ru: "Привет",
  uk: "Привіт",
  pl: "Cześć",
  nl: "Hallo",
  tr: "Merhaba",
  el: "Γειά σου",
  hi: "नमस्ते",
  "zh-CN": "你好",
  "zh-TW": "哈囉",
  ja: "こんにちは",
  ko: "안녕하세요",
  vi: "Xin chào",
  th: "สวัสดี",
  id: "Halo",
  sv: "Hej",
  da: "Hej",
  no: "Hei",
  fi: "Hei",
  cs: "Ahoj",
  ro: "Bună",
  hu: "Szia",
};
const GREETING_ROWS = 3;

function Languages() {
  const { t } = useTranslation();
  const rows = useMemo(() => {
    const items = LANGUAGE_CODES.map((code) => {
      let name: string = code;
      try {
        name =
          new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
      } catch {
        // Older engines without DisplayNames show the code.
      }
      return { code, name, hello: GREETINGS[code] };
    });
    return Array.from({ length: GREETING_ROWS }, (_, row) =>
      items.filter((_, index) => index % GREETING_ROWS === row),
    );
  }, []);
  return (
    <section className="landing-languages" id="languages">
      <div className="landing-languages-head">
        <span className="languages-count" aria-hidden="true">
          {LANGUAGE_CODES.length}
        </span>
        <div className="landing-section-head">
          <h2>{t("landing.languages.title")}</h2>
          <p>{t("landing.languages.body")}</p>
        </div>
      </div>
      <div className="greeting-rows" dir="ltr">
        {rows.map((row, index) => (
          <div className="greeting-row" key={index}>
            {/* The second copy closes the loop; only the first is announced. */}
            {[false, true].map((copy) => (
              <ul
                key={String(copy)}
                className="greeting-track"
                aria-hidden={copy || undefined}
              >
                {row.map(({ code, name, hello }) => (
                  <li key={code}>
                    <b lang={code}>{hello}</b>
                    <span lang={code}>{name}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        ))}
      </div>
      <p className="landing-languages-note">
        {t("landing.languages.interface")}
      </p>
    </section>
  );
}

function Testimonials() {
  const { t } = useTranslation();
  if (!testimonials.length) return null;
  return (
    <section
      className="landing-testimonials"
      aria-labelledby="testimonials-title"
    >
      <h2 id="testimonials-title">{t("landing.testimonials.title")}</h2>
      <ul className="review-grid">
        {testimonials.map((item) => (
          <li key={item.quote} className="review-card">
            <figure>
              {item.rating && (
                <span
                  className="testimonial-stars"
                  role="img"
                  aria-label={t("landing.testimonials.rating", {
                    rating: item.rating,
                  })}
                >
                  {Array.from({ length: 5 }, (_, star) => (
                    <Star
                      key={star}
                      size={20}
                      aria-hidden="true"
                      data-on={star < item.rating! || undefined}
                    />
                  ))}
                </span>
              )}
              <blockquote lang={item.lang}>{item.quote}</blockquote>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Saved words drifting behind the closing call to action. */
function Closing() {
  const { t } = useTranslation();
  return (
    <footer className="landing-closing">
      <div className="landing-footer">
        <div className="landing-footer-brand">
          <LandingLogo src={logoClearUrl} />
          <p>{t("landing.footer.tagline")}</p>
        </div>
        <nav aria-label={t("landing.footer.product")}>
          <h2>{t("landing.footer.product")}</h2>
          <a href="#how">{t("landing.nav.howItWorks")}</a>
          <a href="#languages">{t("landing.nav.languages")}</a>
          <a
            href={CHROME_EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("landing.hero.addToChrome")}
          </a>
          <Link to="/login">{t("landing.nav.login")}</Link>
        </nav>
        <nav aria-label={t("landing.footer.legal")}>
          <h2>{t("landing.footer.legal")}</h2>
          <Link to="/terms-of-service">{t("auth.terms")}</Link>
          <Link to="/privacy-policy">{t("auth.privacy")}</Link>
          <Link to="/refund-policy">{t("auth.refunds")}</Link>
        </nav>
        <nav aria-label={t("landing.footer.contact")}>
          <h2>{t("landing.footer.contact")}</h2>
          <a href={supportEmailHref(t("help.emailSubject"))}>
            <Mail size={16} aria-hidden="true" />
            {t("help.contactEmail")}
          </a>
          <a
            href={supportWhatsappHref(t("help.whatsappMessage"))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={16} aria-hidden="true" />
            {t("help.contactWhatsapp")}
          </a>
        </nav>
        <div className="landing-footer-base">
          <p>
            {t("landing.footer.rights", { year: new Date().getFullYear() })}
          </p>
          <UiLanguageSelect />
        </div>
      </div>
    </footer>
  );
}

function LandingLogo({ src }: { src: string }) {
  return (
    <Link to="/" className="brand" aria-label="GotIt home">
      <img className="brand-logo" src={src} alt="" draggable={false} />
    </Link>
  );
}

type FaqItem = { q: string; a: string };

function Faq() {
  const { t } = useTranslation();
  const own = (["price", "level", "test"] as const).map((key) => ({
    q: t(`landingV2.faq.${key}.q`),
    a: t(`landingV2.faq.${key}.a`),
  }));
  // The new questions replace the old "how much does it cost" answer.
  const old = (
    t("landing.faq.items", { returnObjects: true }) as FaqItem[]
  ).slice(1);
  const items = [...own, ...old];
  return (
    <section className="landing-faq" id="faq">
      <div className="faq-main">
        <div className="landing-section-head">
          <h2>{t("landing.faq.title")}</h2>
        </div>
        <div className="faq-list">
          {items.map(({ q, a }) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
      <aside className="faq-ask">
        <div className="faq-ask-portrait" aria-hidden="true">
          <img src={tutorThinking} alt="" loading="lazy" draggable={false} />
        </div>
        <h3>{t("landing.faq.askTitle")}</h3>
        <p>{t("landing.faq.askBody")}</p>
        <div className="faq-ask-actions">
          <a
            className="landing-button"
            href={supportWhatsappHref(t("help.whatsappMessage"))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} aria-hidden="true" />
            {t("help.contactWhatsapp")}
          </a>
          <a
            className="landing-button outline"
            href={supportEmailHref(t("help.emailSubject"))}
          >
            <Mail size={18} aria-hidden="true" />
            {t("help.contactEmail")}
          </a>
        </div>
      </aside>
    </section>
  );
}
