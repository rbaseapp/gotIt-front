import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Flame, Mail, MessageCircle, Star, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "../components/Logo";
import { UiLanguageSelect } from "../components/UiLanguageSelect";
import { CHROME_EXTENSION_URL } from "../config";
import { testimonials } from "../data/testimonials";
import { useInView } from "../hooks/useInView";
import { useScrolled } from "../hooks/useScrolled";
import { LANGUAGE_CODES } from "../lib/languages";
import { supportEmailHref, supportWhatsappHref } from "../lib/supportContact";
import {
  ExtensionPanel,
  LessonRoom,
  MatchingBoard,
  ReadingArticle,
  ScaledScreen,
} from "../components/LandingReplicas";
import iconUrl from "../assets/gotit-icon.svg";
import tutorPortrait from "../assets/private-lesson/tutor-female-speaking-wide.png";
import "../landing.css";

const REGISTER_PATH = "/login?auth=register";
const STEPS = ["mark", "practice", "speak", "read"] as const;
type Step = (typeof STEPS)[number];

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function LandingPage() {
  const { t } = useTranslation();
  const scrolled = useScrolled();
  return (
    <div className="landing">
      <header className="landing-header" data-scrolled={scrolled || undefined}>
        <div className="landing-header-inner">
          <Logo />
          <nav className="landing-nav" aria-label={t("landing.nav.primary")}>
            <a href="#how">{t("landing.nav.howItWorks")}</a>
            <a href="#languages">{t("landing.nav.languages")}</a>
          </nav>
          <div className="landing-header-actions">
            <UiLanguageSelect compact />
            <Link className="landing-login" to="/login">
              {t("landing.nav.login")}
            </Link>
            <Link className="landing-button" to={REGISTER_PATH}>
              {t("landing.nav.createAccount")}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <Hero />
        <Journey />
        <ExtensionBand />
        <Languages />
        <Testimonials />
      </main>

      <Closing />
    </div>
  );
}

function Hero() {
  const { t } = useTranslation();
  return (
    <section className="landing-hero">
      <div className="landing-hero-copy">
        <h1>{t("landing.hero.title")}</h1>
        <p>{t("landing.hero.body")}</p>
        <div className="landing-hero-actions">
          <Link className="landing-button on-dark" to={REGISTER_PATH}>
            {t("landing.hero.createAccount")}
          </Link>
          <a
            className="landing-button ghost"
            href={CHROME_EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("landing.hero.addToChrome")}
          </a>
        </div>
        <Link className="landing-hero-login" to="/login">
          {t("landing.hero.haveAccount")}
        </Link>
      </div>
      <HeroArt />
    </section>
  );
}

/**
 * The hero's picture: the tutor in an arch, with the moments a learner meets
 * around her (a saved word, her question, the streak). Decorative; the copy
 * beside it says the same thing in words.
 */
function HeroArt() {
  const { t } = useTranslation();
  return (
    <div className="hero-art" aria-hidden="true">
      <span className="hero-art-sun" />
      <span className="hero-art-blob" />
      <div className="hero-art-arch">
        <img src={tutorPortrait} alt="" draggable={false} />
      </div>
      <div className="hero-chip hero-chip-word" dir="ltr" lang="en">
        <span className="hero-chip-check">
          <Check size={14} strokeWidth={3} />
        </span>
        <span>
          <mark>thrive</mark>
          <small dir="auto">{t("landing.demo.translation")}</small>
        </span>
      </div>
      <p className="hero-chip hero-chip-bubble" dir="ltr" lang="en">
        How do small cafés <mark>thrive</mark>?
      </p>
      <div className="hero-chip hero-chip-stats" dir="ltr">
        <span className="hero-stat-streak">
          <Flame size={16} fill="currentColor" />7
        </span>
        <span className="hero-stat-xp">
          <Zap size={16} fill="currentColor" />
          +15 XP
        </span>
      </div>
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

function Journey() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Step>("mark");
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const items = listRef.current?.querySelectorAll<HTMLElement>("[data-step]");
    if (!items?.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setActive((entry.target as HTMLElement).dataset.step as Step);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  return (
    <section className="landing-journey" id="how">
      <div className="landing-section-head">
        <h2>{t("landing.journey.title")}</h2>
        <p>{t("landing.journey.intro")}</p>
      </div>
      <div className="journey-grid">
        <ol className="journey-steps" ref={listRef}>
          {STEPS.map((step, index) => (
            <li
              key={step}
              data-step={step}
              data-active={active === step || undefined}
            >
              <span className="journey-number" aria-hidden="true">
                {index + 1}
              </span>
              <h3>{t(`landing.journey.${step}.title`)}</h3>
              <p>{t(`landing.journey.${step}.body`)}</p>
              <ul className="journey-points">
                {(
                  t(`landing.journey.${step}.points`, {
                    returnObjects: true,
                  }) as string[]
                ).map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <div className="journey-inline-visual" aria-hidden="true">
                {step === "mark" ? (
                  <MarkDemo />
                ) : (
                  <StepVisual step={step} compact />
                )}
              </div>
            </li>
          ))}
        </ol>
        <div className="journey-stage" aria-hidden="true">
          {STEPS.map((step) => (
            <div
              key={step}
              className="journey-stage-item"
              data-active={active === step || undefined}
            >
              <StageWords step={step} />
              {step === "mark" ? (
                <MarkDemo active={active === step} />
              ) : (
                <StepVisual step={step} maxHeight={STAGE_FIT_HEIGHT} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Room for a screen inside the 480px desktop stage. */
const STAGE_FIT_HEIGHT = 420;

const STAGE_WORDS: Record<Step, string[]> = {
  mark: ["regulars", "living room", "warm"],
  practice: ["regulars", "cozy", "remember"],
  speak: ["owner", "neighborhood", "thrive"],
  read: ["bakery", "secret", "quiet"],
};

/** Saved words drifting behind the active visual on the desktop stage. */
function StageWords({ step }: { step: Step }) {
  return (
    <ul className="stage-words" dir="ltr" lang="en">
      {STAGE_WORDS[step].map((word) => (
        <li key={word}>{word}</li>
      ))}
    </ul>
  );
}

function StepVisual({
  step,
  maxHeight,
  compact = false,
}: {
  step: Step;
  maxHeight?: number;
  /** Phone-width rendering for the inline (mobile) visuals. */
  compact?: boolean;
}) {
  if (step === "mark")
    return (
      <ScaledScreen
        width={430}
        maxHeight={maxHeight}
        className="visual-screen visual-mark"
      >
        <ExtensionPanel saved />
      </ScaledScreen>
    );
  if (step === "practice")
    return (
      <ScaledScreen
        width={compact ? 380 : 640}
        maxHeight={maxHeight}
        className="visual-screen"
      >
        <MatchingBoard />
      </ScaledScreen>
    );
  if (step === "speak")
    return (
      <ScaledScreen
        width={compact ? 380 : 560}
        maxHeight={maxHeight}
        className="visual-screen"
      >
        <LessonRoom />
      </ScaledScreen>
    );
  return (
    <ScaledScreen
      width={compact ? 380 : 640}
      maxHeight={maxHeight}
      className="visual-screen"
    >
      <ReadingArticle />
    </ScaledScreen>
  );
}

function ExtensionBand() {
  const { t } = useTranslation();
  return (
    <section className="landing-extension">
      <div className="landing-extension-copy">
        <h2>{t("landing.extension.title")}</h2>
        <p>{t("landing.extension.body")}</p>
        <a
          className="landing-button"
          href={CHROME_EXTENSION_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("landing.extension.button")}
        </a>
      </div>
      <div className="extension-mock" aria-hidden="true">
        <p dir="ltr" lang="en">
          Owners say the trick is simple: remember names, and keep the bread
          warm. <span className="extension-selection">Regulars</span> notice the
          small things.
        </p>
        <div className="extension-menu">
          <span>{t("landing.extension.menuCopy")}</span>
          <span>{t("landing.extension.menuSearch")}</span>
          {/* The extension registers this item in English only. */}
          <span className="extension-menu-save" dir="ltr" lang="en">
            <img src={iconUrl} alt="" />
            Save “Regulars” to GotIt
          </span>
        </div>
      </div>
    </section>
  );
}

function Languages() {
  const { t } = useTranslation();
  const names = useMemo(
    () =>
      LANGUAGE_CODES.map((code) => {
        let name: string = code;
        try {
          name =
            new Intl.DisplayNames([code], { type: "language" }).of(code) ??
            code;
        } catch {
          // Older engines without DisplayNames show the code.
        }
        return { code, name };
      }),
    [],
  );
  return (
    <section className="landing-languages" id="languages">
      <div className="landing-section-head">
        <h2>{t("landing.languages.title")}</h2>
        <p>{t("landing.languages.body")}</p>
      </div>
      <ul className="language-cloud">
        {names.map(({ code, name }) => (
          <li key={code} lang={code}>
            {name}
          </li>
        ))}
      </ul>
      <p className="landing-languages-note">
        {t("landing.languages.interface")}
      </p>
    </section>
  );
}

/** How long each review stays before the next one, in ms (matches the CSS bar). */
const REVIEW_MS = 7000;
const AVATAR_TONES = ["green", "mark", "purple", "blue"] as const;

function Testimonials() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [ref, inView] = useInView<HTMLElement>();
  if (!testimonials.length) return null;
  const current = testimonials[index];
  const next = () => setIndex((value) => (value + 1) % testimonials.length);
  // Auto-advance is driven by the progress bar's CSS animation, so hovering,
  // focusing or scrolling away pauses both together; reduced motion stops it.
  const running = inView && !held && testimonials.length > 1;
  return (
    <section
      ref={ref}
      className="landing-testimonials"
      aria-labelledby="testimonials-title"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <div className="reviews-side">
        <h2 id="testimonials-title">{t("landing.testimonials.title")}</h2>
        <ul className="reviews-people">
          {testimonials.map((item, itemIndex) => (
            <li key={item.name + item.quote.slice(0, 16)}>
              <button
                type="button"
                aria-pressed={itemIndex === index}
                onClick={() => setIndex(itemIndex)}
              >
                <span
                  className="review-avatar"
                  data-tone={AVATAR_TONES[itemIndex % AVATAR_TONES.length]}
                  aria-hidden="true"
                >
                  {Array.from(item.name)[0]}
                </span>
                <span className="review-person">
                  <b>{item.name}</b>
                  {item.detail && <small>{item.detail}</small>}
                </span>
                {itemIndex === index && (
                  <span
                    key={index}
                    className="review-progress"
                    data-running={running || undefined}
                    onAnimationEnd={next}
                    style={{ animationDuration: `${REVIEW_MS}ms` }}
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <figure className="review-stage" key={index}>
        {current.rating && (
          <span
            className="testimonial-stars"
            role="img"
            aria-label={t("landing.testimonials.rating", {
              rating: current.rating,
            })}
          >
            {Array.from({ length: 5 }, (_, star) => (
              <Star
                key={star}
                size={22}
                aria-hidden="true"
                data-on={star < current.rating! || undefined}
              />
            ))}
          </span>
        )}
        <blockquote lang={current.lang}>{current.quote}</blockquote>
        <figcaption>
          <b>{current.name}</b>
          {current.detail && <span>{current.detail}</span>}
        </figcaption>
      </figure>
    </section>
  );
}

/** Saved words drifting behind the closing call to action. */
const CLOSING_WORDS = [
  "thrive",
  "regulars",
  "cozy",
  "wander",
  "subtle",
  "neighborhood",
  "remember",
  "bakery",
];

function Closing() {
  const { t } = useTranslation();
  const [ref, inView] = useInView<HTMLDivElement>({ once: true });
  return (
    <footer className="landing-closing">
      <div ref={ref} className="closing-cta" data-inview={inView || undefined}>
        <ul className="closing-words" dir="ltr" lang="en" aria-hidden="true">
          {CLOSING_WORDS.map((word) => (
            <li key={word}>{word}</li>
          ))}
        </ul>
        <h2>{t("landing.cta.title")}</h2>
        <p>{t("landing.cta.body")}</p>
        <div className="closing-actions">
          <Link className="landing-button on-dark" to={REGISTER_PATH}>
            {t("landing.cta.button")}
          </Link>
          <a
            className="landing-button ghost"
            href={CHROME_EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("landing.hero.addToChrome")}
          </a>
        </div>
      </div>
      <div className="landing-footer">
        <div className="landing-footer-brand">
          <Logo />
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
