import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Flame, Zap } from "lucide-react";
import { UiLanguageSelect } from "../UiLanguageSelect";
import { CHROME_EXTENSION_URL } from "../../config";
import { useInView } from "../../hooks/useInView";
import { useScrolled } from "../../hooks/useScrolled";
import { buildPlan } from "../../lib/placement/plan";
import { initialOnboarding, saveOnboarding } from "../../lib/onboarding/state";
import type { Observation, PlacementBank } from "../../lib/placement/types";
import logoUrl from "../../assets/gotit-logo.svg";
import moochi from "../../assets/ux/dashboard-moohi.png";
import tutorPortrait from "../../assets/private-lesson/tutor-female-speaking-wide.png";
import "../../landing2.css";

export const START_PATH = "/start";

/** Fades and lifts into place when it scrolls into view (static under reduced motion). */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>({ once: true });
  return (
    <div
      ref={ref}
      className={`l2-reveal ${className}`}
      data-inview={inView || undefined}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function LandingHeader() {
  const { t } = useTranslation();
  const scrolled = useScrolled();
  return (
    <header className="l2-header" data-scrolled={scrolled || undefined}>
      <div className="l2-header-inner">
        <Link to="/" className="l2-logo" aria-label="GotIt">
          <img src={logoUrl} alt="" draggable={false} />
        </Link>
        <nav className="l2-nav" aria-label={t("landing.nav.primary")}>
          <a href="#how">{t("landingV2.nav.howItWorks")}</a>
          <a href="#extension">{t("landingV2.nav.extension")}</a>
          <a href="#pricing">{t("landingV2.nav.pricing")}</a>
        </nav>
        <div className="l2-header-actions">
          <UiLanguageSelect compact />
          <Link className="l2-link" to="/login">
            {t("landingV2.nav.login")}
          </Link>
          <Link className="l2-btn" to={START_PATH}>
            {t("landingV2.nav.startFree")}
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ hero */
export function NewHero() {
  const { t } = useTranslation();
  return (
    <section className="l2-hero">
      <div className="l2-hero-copy">
        <h1>{t("landing.hero.title")}</h1>
        <p>{t("landing.hero.body")}</p>
        <div className="l2-hero-actions">
          <Link className="l2-btn big" to={START_PATH}>
            {t("landingV2.hero.ctaPrimary")}
          </Link>
          <a
            className="l2-btn ghost big"
            href={CHROME_EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("landingV2.hero.ctaExtension")}
          </a>
        </div>
        <small className="l2-promise">{t("landingV2.hero.promise")}</small>
        <TryWords />
      </div>
      <div className="l2-hero-art" aria-hidden="true">
        <span className="l2-sun" />
        <img
          className="l2-moochi"
          src={moochi}
          alt=""
          draggable={false}
          fetchPriority="high"
        />
        <div className="l2-chip l2-chip-word" dir="ltr" lang="en">
          <span className="l2-chip-check">
            <Check size={14} strokeWidth={3} />
          </span>
          <span>
            <mark>thrive</mark>
            <small dir="auto">{t("landing.demo.translation")}</small>
          </span>
        </div>
        <div className="l2-chip l2-chip-stats" dir="ltr">
          <span>
            <Flame size={16} fill="currentColor" />7
          </span>
          <span>
            <Zap size={16} fill="currentColor" />
            +15 XP
          </span>
        </div>
      </div>
    </section>
  );
}

/** Three real cards from the placement check, right in the hero. */
function TryWords() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bank, setBank] = useState<PlacementBank | null>(null);
  const [answers, setAnswers] = useState<Observation[]>([]);
  const shown = useRef(0);
  useEffect(() => {
    const load = () =>
      void import("../../data/placement/bank.json").then((m) =>
        setBank(m.default as unknown as PlacementBank),
      );
    // After the page has painted; the bank is about 100KB.
    if ("requestIdleCallback" in window)
      (
        window as unknown as { requestIdleCallback: (f: () => void) => void }
      ).requestIdleCallback(load);
    else setTimeout(load, 800);
  }, []);
  const words = useMemo(() => {
    if (!bank) return [];
    return [8, 24, 44].map((target) =>
      bank.words
        .filter((w) => w[2])
        .reduce((best, w) =>
          Math.abs(w[1] - target) < Math.abs(best[1] - target) ? w : best,
        ),
    );
  }, [bank]);
  if (!words.length) return <div className="l2-try" aria-hidden="true" />;
  const index = answers.length;
  const done = index >= 3;
  const known = answers.filter((a) => a.t === "card" && a.yes).length;
  const answer = (yes: boolean) => {
    const w = words[index]!;
    shown.current = Date.now();
    setAnswers([
      ...answers,
      { t: "card", text: w[0], real: true, d: w[1], yes, ms: 1500 },
    ]);
  };
  return (
    <div className="l2-try" role="group" aria-label={t("landingV2.try.title")}>
      <b>{t("landingV2.try.title")}</b>
      {!done ? (
        <>
          <span className="l2-try-word" dir="ltr" lang="en">
            {words[index]![0]}
          </span>
          <span className="l2-try-buttons">
            <button className="l2-btn small" onClick={() => answer(true)}>
              {t("landingV2.try.know")}
            </button>
            <button
              className="l2-btn small ghost"
              onClick={() => answer(false)}
            >
              {t("landingV2.try.unknown")}
            </button>
          </span>
          <small>
            {index + 1}/3 · {t("landingV2.try.hint")}
          </small>
        </>
      ) : (
        <>
          <span className="l2-try-word">
            {t("landingV2.try.doneTitle", { count: known })}
          </span>
          <small>{t("landingV2.try.doneBody")}</small>
          <button
            className="l2-btn small"
            onClick={() => {
              saveOnboarding({ ...initialOnboarding(), landing: answers });
              navigate(START_PATH);
            }}
          >
            {t("landingV2.try.doneCta")}
          </button>
        </>
      )}
    </div>
  );
}

export function TrustBar() {
  const { t } = useTranslation();
  return (
    <ul className="l2-trust">
      {(["free", "trial", "hebrew"] as const).map((key, i) => (
        <li key={key}>
          <Reveal delay={i * 80}>
            <Check size={16} aria-hidden="true" /> {t(`landingV2.trust.${key}`)}
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- pocket */
const POCKET_WORDS = [
  "window",
  "bread",
  "borrow",
  "friendly",
  "schedule",
  "thorough",
  "neighbor",
  "choice",
];

export function PocketTeaser() {
  const { t, i18n } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setProgress(1);
      return;
    }
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const span = rect.height + window.innerHeight * 0.4;
      const value = (window.innerHeight * 0.8 - rect.top) / span;
      setProgress(Math.min(1, Math.max(0, value * 1.6)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const count = Math.round(1300 * progress);
  return (
    <section
      className="l2-section l2-pocket"
      ref={ref}
      aria-labelledby="l2-pocket-title"
    >
      <div>
        <h2 id="l2-pocket-title">{t("landingV2.pocket.title")}</h2>
        <p>{t("landingV2.pocket.body")}</p>
        <Link className="l2-btn" to={START_PATH}>
          {t("landingV2.pocket.cta")}
        </Link>
      </div>
      <div className="l2-pocket-art" aria-hidden="true">
        <ul dir="ltr" lang="en">
          {POCKET_WORDS.map((word, i) => (
            <li
              key={word}
              style={{
                opacity: progress > i / POCKET_WORDS.length ? 1 : 0,
                transform: `translateY(${progress > i / POCKET_WORDS.length ? 0 : -24}px)`,
              }}
            >
              {word}
            </li>
          ))}
        </ul>
        <div className="l2-pocket-bag">
          <span>🎒</span>
          <b>{count.toLocaleString(i18n.resolvedLanguage)}</b>
          <small>{t("landingV2.pocket.counter")}</small>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ plan */
export function PlanTeaser() {
  const { t, i18n } = useTranslation();
  const [minutes, setMinutes] = useState(10);
  const plan = buildPlan({
    startUnit: 25,
    goal: "work",
    minutesPerDay: minutes,
    deadlineMonths: 0,
  });
  return (
    <section className="l2-section l2-plan" aria-labelledby="l2-plan-title">
      <Reveal className="l2-card l2-plan-card">
        <small>{t("landingV2.plan.level")}</small>
        <p className="l2-level">
          A2 · {t("landingV2.plan.unit", { count: 25 })}
        </p>
        <label>
          {t("landingV2.plan.minutes")}: <b>{minutes}</b>
          <input
            type="range"
            min={5}
            max={30}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </label>
        <p className="l2-sim">
          {t("landingV2.plan.months", {
            count: Number(plan.months.toFixed(1)).toLocaleString(
              i18n.resolvedLanguage,
            ),
          })}
        </p>
      </Reveal>
      <div>
        <h2 id="l2-plan-title">{t("landingV2.plan.title")}</h2>
        <p>{t("landingV2.plan.body")}</p>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- tutor */
export function TutorTeaser() {
  const { t } = useTranslation();
  const [ref, inView] = useInView<HTMLDivElement>({ once: true });
  return (
    <section
      className="l2-section l2-tutor"
      id="extension-tutor"
      aria-labelledby="l2-tutor-title"
    >
      <div>
        <span className="l2-badge">{t("landingV2.tutor.badge")}</span>
        <h2 id="l2-tutor-title">{t("landingV2.tutor.title")}</h2>
        <p>{t("landingV2.tutor.body")}</p>
        <small>{t("landingV2.tutor.opens")}</small>
      </div>
      <div
        className="l2-card l2-chat"
        ref={ref}
        data-inview={inView || undefined}
      >
        <img src={tutorPortrait} alt="" loading="lazy" draggable={false} />
        <p className="l2-chat-task">{t("landingV2.tutor.task")}</p>
        <p className="l2-bubble teacher" dir="ltr" lang="en">
          {t("landingV2.tutor.teacher")}
        </p>
        <p className="l2-bubble you" dir="ltr" lang="en">
          {t("landingV2.tutor.you")}
        </p>
        <p className="l2-chat-done">{t("landingV2.tutor.done")}</p>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- pricing */
export function PricingTeaser() {
  const { t } = useTranslation();
  const cards = ["free", "pro", "tutor"] as const;
  return (
    <section
      className="l2-section l2-pricing"
      id="pricing"
      aria-labelledby="l2-pricing-title"
    >
      <div className="l2-center">
        <h2 id="l2-pricing-title">{t("landingV2.pricing.title")}</h2>
        <p>{t("landingV2.pricing.body")}</p>
      </div>
      <div className="l2-pricing-grid">
        {cards.map((key, i) => (
          <Reveal
            key={key}
            delay={i * 90}
            className={`l2-card l2-price ${key === "pro" ? "featured" : ""}`}
          >
            <h3>{t(`landingV2.pricing.${key}.name`)}</h3>
            <small>{t(`landingV2.pricing.${key}.line`)}</small>
            <ul>
              {(
                t(`landingV2.pricing.${key}.items`, {
                  returnObjects: true,
                }) as string[]
              ).map((item) => (
                <li key={item}>
                  <Check size={15} aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
      <div className="l2-center">
        <Link className="l2-btn big" to={START_PATH}>
          {t("landingV2.pricing.cta")}
        </Link>
        <small>{t("landingV2.pricing.note")}</small>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- closing */
export function FinalCta() {
  const { t } = useTranslation();
  return (
    <section className="l2-section l2-final">
      <img src={moochi} alt="" draggable={false} loading="lazy" />
      <h2>{t("landingV2.cta.title")}</h2>
      <p>{t("landingV2.cta.body")}</p>
      <Link className="l2-btn big" to={START_PATH}>
        {t("landingV2.cta.button")}
      </Link>
    </section>
  );
}

/** Pinned to the bottom on phones, once the hero button has scrolled away. */
export function MobileBar() {
  const { t } = useTranslation();
  const scrolled = useScrolled();
  return (
    <div className="l2-mobile-bar" data-show={scrolled || undefined}>
      <Link className="l2-btn big" to={START_PATH}>
        {t("landingV2.mobileBar")}
      </Link>
    </div>
  );
}
