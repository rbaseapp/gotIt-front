import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Mail } from "lucide-react";
import { OnboardingFrame } from "./OnboardingFrame";
import { EmailAuthForm } from "../EmailAuthForm";
import { GoogleSignIn } from "../GoogleSignIn";
import { useApp } from "../../context/AppContext";
import { LANGUAGE_CODES } from "../../lib/languages";
import {
  BAND_END,
  DEADLINES,
  GOALS,
  bandInfo,
  buildPlan,
  type Deadline,
  type Goal,
} from "../../lib/placement/plan";
import type {
  Band,
  PlacementBank,
  PlacementResult,
  Skill,
} from "../../lib/placement/types";
import {
  clearOnboarding,
  type Focus,
  type OnboardingState,
} from "../../lib/onboarding/state";

type Update = (patch: Partial<OnboardingState>) => void;

/* ---------------------------------------------------------------- 1 */
const SHOWN_LANGUAGES = ["en", "es", "fr", "de", "it", "pt"];
const HELLO: Record<string, string> = {
  en: "Hello · English",
  es: "Hola · Español",
  fr: "Bonjour · Français",
  de: "Hallo · Deutsch",
  it: "Ciao · Italiano",
  pt: "Olá · Português",
};
const NAMES: Record<string, string> = {
  en: "אנגלית",
  es: "ספרדית",
  fr: "צרפתית",
  de: "גרמנית",
  it: "איטלקית",
  pt: "פורטוגזית",
};

export function LanguageStep({
  state,
  update,
  next,
}: {
  state: OnboardingState;
  update: Update;
  next: () => void;
}) {
  const { t, i18n } = useTranslation();
  const hebrew = i18n.resolvedLanguage === "he";
  const names = new Intl.DisplayNames([i18n.resolvedLanguage ?? "en"], {
    type: "language",
  });
  const label = (code: string) =>
    hebrew ? (NAMES[code] ?? code) : (names.of(code) ?? code);
  return (
    <OnboardingFrame
      step="language"
      title={t("start.language.title")}
      body={t("start.language.body")}
      primary={
        <button className="ob-btn" onClick={next}>
          {t("start.continue")}
        </button>
      }
    >
      <div
        className="ob-grid six"
        role="group"
        aria-label={t("start.language.title")}
      >
        {SHOWN_LANGUAGES.filter(
          (code) => LANGUAGE_CODES.includes(code as never) || code,
        ).map((code) => (
          <button
            key={code}
            className="ob-card ob-lang"
            aria-pressed={state.language === code}
            onClick={() => update({ language: code })}
          >
            <span className="code">{code.toUpperCase()}</span>
            <h3>{label(code)}</h3>
            <p dir="ltr">{HELLO[code]}</p>
          </button>
        ))}
      </div>
      {state.language !== "en" && (
        <p className="ob-note" role="status">
          {t("start.language.soon")}
        </p>
      )}
    </OnboardingFrame>
  );
}

/* ---------------------------------------------------------------- 2 */
export function FocusStep({
  state,
  update,
  next,
  back,
}: {
  state: OnboardingState;
  update: Update;
  next: () => void;
  back: () => void;
}) {
  const { t } = useTranslation();
  const options: Focus[] = ["words", "goal", "scratch"];
  return (
    <OnboardingFrame
      step="focus"
      title={t("start.focus.title")}
      body={t("start.focus.body")}
      onBack={back}
      primary={
        <button className="ob-btn" disabled={!state.focus} onClick={next}>
          {t("start.continue")}
        </button>
      }
    >
      <div className="ob-grid three">
        {options.map((focus) => (
          <button
            key={focus}
            className="ob-card"
            aria-pressed={state.focus === focus}
            onClick={() => update({ focus })}
          >
            <h3>{t(`start.focus.${focus}.title`)}</h3>
            <p>{t(`start.focus.${focus}.body`)}</p>
            <span className="ob-tag">{t(`start.focus.${focus}.tag`)}</span>
          </button>
        ))}
      </div>
      <p className="ob-note">{t("start.focus.note")}</p>
    </OnboardingFrame>
  );
}

/* ---------------------------------------------------------------- 4 */
const BANDS: Band[] = ["Pre-A1", "A1", "A2", "B1", "B2", "C1"];
const SKILL_WIDTH = { strong: "92%", ok: "70%", weak: "38%", unknown: "0%" };

export function ResultStep({
  state,
  update,
  next,
  back,
}: {
  state: OnboardingState;
  update: Update;
  next: () => void;
  back: () => void;
}) {
  const { t, i18n } = useTranslation();
  const result = state.result!;
  const theta = Math.min(84, Math.max(1, result.theta + state.adjust));
  const { band, sub } = bandInfo(theta);
  const fake = state.log.filter(
    (o) => o.t === "card" && !o.real && o.yes,
  ).length;
  const skills: Array<
    [Skill | "vocabulary", PlacementResult["skills"][Skill | "vocabulary"]]
  > = [
    ["vocabulary", result.skills.vocabulary],
    ["reading", result.skills.reading],
    ["listening", result.skills.listening],
  ];
  const range =
    result.upperBand && result.upperBand !== band
      ? t("start.result.between", {
          low: t(`start.result.band.${band}`),
          high: t(`start.result.band.${result.upperBand}`),
        })
      : null;
  return (
    <OnboardingFrame
      step="result"
      title={t("start.result.title")}
      onBack={back}
      primary={
        <button className="ob-btn yellow" onClick={next}>
          {t("start.result.next")}
        </button>
      }
    >
      <section className="ob-result" aria-live="polite">
        <div>
          <small>{t("start.result.level")}</small>
          <p className="ob-level">
            {band} · {t(`start.result.band.${band}`)}
            <span>{t(`start.result.sub.${sub}`)}</span>
          </p>
        </div>
        <div className="ob-scale" aria-hidden="true">
          {BANDS.map((b) => (
            <span key={b} data-here={b === band || undefined}>
              {b}
            </span>
          ))}
        </div>
        <p style={{ margin: 0, fontWeight: 700 }}>
          {t(`start.result.summary.${band}`)}
        </p>
        {(range || result.uncertain) && (
          <small>{range ?? t("start.result.uncertain")}</small>
        )}
        <div>
          <p className="ob-big" style={{ margin: 0 }}>
            🎒{" "}
            {t("start.result.inPocket", {
              count: result.knownEstimate.toLocaleString(i18n.resolvedLanguage),
            })}
          </p>
          <small>
            {t("start.result.outOf", {
              total: result.total.toLocaleString(i18n.resolvedLanguage),
            })}
          </small>
        </div>
        <div className="ob-section">
          <small>{t("start.result.skills")}</small>
          {skills.map(([name, status]) => (
            <div
              key={name}
              className="ob-skill-row"
              style={{ ["--w" as string]: SKILL_WIDTH[status] }}
            >
              <span>{t(`start.result.skill.${name}`)}</span>
              <span>{t(`start.result.status.${status}`)}</span>
              <i />
            </div>
          ))}
          <small>{t("start.result.speaking")}</small>
        </div>
        <small>{t("start.result.note")}</small>
        {fake > 0 && (
          <small>{t("start.pocket.fakeFound", { count: fake })}</small>
        )}
      </section>
      <p className="ob-note">
        {t("start.result.wrong")}{" "}
        <button
          className="ob-link"
          disabled={state.adjust <= -9}
          onClick={() => update({ adjust: state.adjust - 3 })}
        >
          {t("start.result.tooHigh")}
        </button>{" "}
        <button
          className="ob-link"
          disabled={state.adjust >= 9}
          onClick={() => update({ adjust: state.adjust + 3 })}
        >
          {t("start.result.tooLow")}
        </button>
        {state.adjust !== 0 && <span> · {t("start.result.adjusted")}</span>}
      </p>
    </OnboardingFrame>
  );
}

/* ---------------------------------------------------------------- 5 */
const MINUTES = [5, 10, 15, 20];

export function PlanStep({
  state,
  update,
  next,
  back,
}: {
  state: OnboardingState;
  update: Update;
  next: () => void;
  back: () => void;
}) {
  const { t } = useTranslation();
  const theta = Math.min(84, Math.max(1, state.result!.theta + state.adjust));
  const startUnit = Math.min(84, Math.max(1, Math.round(theta - 2)));
  const goal: Goal = state.goal ?? "other";
  const plan = useMemo(
    () =>
      buildPlan({
        startUnit,
        goal,
        minutesPerDay: state.minutes,
        deadlineMonths: state.deadline,
      }),
    [startUnit, goal, state.minutes, state.deadline],
  );
  // Daily time that reaches the deadline, rounded up to a clean number of minutes.
  const suggested = Math.min(
    60,
    Math.ceil((plan.minutesForDeadline ?? 0) / 5) * 5,
  );
  const months = (n: number) => Math.max(1, Math.round(n));
  const low = months(plan.monthsLow);
  const high = Math.max(low, months(plan.monthsHigh));
  return (
    <OnboardingFrame
      step="plan"
      title={t("start.plan.title")}
      body={t("start.plan.body")}
      onBack={back}
      primary={
        <button className="ob-btn" disabled={!state.goal} onClick={next}>
          {t("start.plan.next")}
        </button>
      }
    >
      <div className="ob-section">
        <h3>{t("start.plan.goalQuestion")}</h3>
        <div className="ob-chips">
          {GOALS.map((g) => (
            <button
              key={g}
              className="ob-chip"
              aria-pressed={state.goal === g}
              onClick={() => update({ goal: g })}
            >
              {t(`start.plan.goal.${g}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="ob-section">
        <h3>{t("start.plan.deadlineQuestion")}</h3>
        <div className="ob-chips">
          {DEADLINES.map((d) => (
            <button
              key={d}
              className="ob-chip"
              aria-pressed={state.deadline === d}
              onClick={() => update({ deadline: d as Deadline })}
            >
              {t(`start.plan.deadline.${d}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="ob-section">
        <h3>{t("start.plan.minutesQuestion")}</h3>
        <div className="ob-chips">
          {(MINUTES.includes(state.minutes)
            ? MINUTES
            : [...MINUTES, state.minutes].sort((a, b) => a - b)
          ).map((m) => (
            <button
              key={m}
              className="ob-chip"
              aria-pressed={state.minutes === m}
              onClick={() => update({ minutes: m })}
            >
              {t("start.plan.minutes", { count: m })}
              {m === 10 && ` · ${t("start.plan.recommended")}`}
            </button>
          ))}
        </div>
      </div>
      <section className="ob-plan-card" aria-live="polite">
        <h3>
          {t("start.plan.cardTitle", { goal: t(`start.plan.goal.${goal}`) })}
        </h3>
        <span className="ob-tag">
          {t("start.plan.cardTarget", {
            band: `${plan.targetBand} · ${t(`start.result.band.${plan.targetBand}`)}`,
          })}
        </span>
        <p className="ob-note" style={{ textAlign: "start" }}>
          {t("start.plan.cardRange", {
            from: plan.startUnit,
            to: Math.min(plan.targetUnit, BAND_END[plan.targetBand]),
            units: plan.units,
          })}
        </p>
        <div className="ob-sim">
          {t("start.plan.sim", { minutes: state.minutes, low, high })}
          {plan.minutesForDeadline !== null && state.deadline > 0 && (
            <p style={{ margin: "6px 0 0" }}>
              {plan.feasibility === "ok"
                ? t("start.plan.feasible")
                : t("start.plan.needed", {
                    deadline: t(`start.plan.deadlineName.${state.deadline}`),
                    minutes: plan.minutesForDeadline,
                  })}
              {plan.feasibility !== "ok" && (
                <button
                  className="ob-link"
                  onClick={() => update({ minutes: suggested })}
                >
                  {t("start.plan.useNeeded", { minutes: suggested })}
                </button>
              )}
            </p>
          )}
        </div>
        <small className="ob-note" style={{ textAlign: "start" }}>
          {t("start.plan.dailyNote")}
        </small>
      </section>
    </OnboardingFrame>
  );
}

/* ---------------------------------------------------------------- 6 */
export function firstWordsFor(state: OnboardingState, bank: PlacementBank) {
  const gloss = new Map(
    bank.words.filter((w) => w[2]).map((w) => [w[0].toLowerCase(), w]),
  );
  const picked: Array<{ en: string; he: string }> = [];
  for (const word of state.result?.seedWords ?? []) {
    const entry = gloss.get(word.toLowerCase());
    if (entry && picked.length < 3)
      picked.push({ en: entry[0], he: entry[2]! });
  }
  if (picked.length < 3) {
    const theta = (state.result?.theta ?? 20) + state.adjust;
    const known = new Set(
      (state.result?.knownWords ?? []).map((w) => w.toLowerCase()),
    );
    for (const entry of bank.words
      .filter(
        (w) =>
          w[2] &&
          w[1] >= theta &&
          w[1] <= theta + 10 &&
          !known.has(w[0].toLowerCase()),
      )
      .sort((a, b) => a[1] - b[1])) {
      if (picked.length >= 3) break;
      if (!picked.some((p) => p.en === entry[0]))
        picked.push({ en: entry[0], he: entry[2]! });
    }
  }
  return picked;
}

export function FirstWordsStep({
  state,
  update,
  words,
  next,
  back,
}: {
  state: OnboardingState;
  update: Update;
  words: Array<{ en: string; he: string }>;
  next: () => void;
  back: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<string | null>(null);
  const done = state.firstWordsDone;
  const mark = (en: string) => {
    setOpen(en);
    if (!done.includes(en)) update({ firstWordsDone: [...done, en] });
  };
  return (
    <OnboardingFrame
      step="firstWords"
      title={t("start.firstWords.title", { count: words.length })}
      body={t("start.firstWords.body")}
      onBack={back}
      primary={
        <button className="ob-btn" onClick={next}>
          {t("start.firstWords.next")}
        </button>
      }
    >
      <div className="ob-grid three">
        {words.map((word) => (
          <button
            key={word.en}
            className="ob-card ob-word"
            data-done={done.includes(word.en) || undefined}
            onClick={() => mark(word.en)}
          >
            <strong lang="en">{word.en}</strong>
            {open === word.en || done.includes(word.en) ? (
              <span>
                <Check size={16} aria-hidden="true" /> {word.he}
              </span>
            ) : (
              <small>{t("start.firstWords.flip")}</small>
            )}
          </button>
        ))}
      </div>
      <p className="ob-note" aria-live="polite">
        🎒{" "}
        {t("start.firstWords.counter", {
          done: done.length,
          total: words.length,
        })}
      </p>
      <p className="ob-note">{t("start.firstWords.tomorrow")}</p>
    </OnboardingFrame>
  );
}

/* ---------------------------------------------------------------- 7 */
export function SaveStep({
  state,
  back,
}: {
  state: OnboardingState;
  back: () => void;
}) {
  const { t } = useTranslation();
  const { authenticate, authenticateGoogle } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState(false);
  const result = state.result!;
  const theta = Math.min(84, Math.max(1, result.theta + state.adjust));
  const { band } = bandInfo(theta);
  return (
    <OnboardingFrame
      step="save"
      title={t("start.save.title")}
      body={t("start.save.body")}
      onBack={back}
    >
      <section className="ob-plan-card">
        <h3>{t("start.save.built")}</h3>
        <div className="ob-chips">
          <span className="ob-tag">{t("start.save.chips.language")}</span>
          <span className="ob-tag">
            {t("start.save.chips.level", {
              level: `${band} · ${t(`start.result.band.${band}`)}`,
            })}
          </span>
          <span className="ob-tag">
            {t("start.save.chips.minutes", { count: state.minutes })}
          </span>
          {state.goal && (
            <span className="ob-tag">
              {t("start.save.chips.goal", {
                goal: t(`start.plan.goal.${state.goal}`),
              })}
            </span>
          )}
        </div>
        <div className="ob-trial-box">
          <strong>{t("start.save.trialTitle")}</strong>
          {t("start.save.trialBody")}
        </div>
      </section>
      <div className="ob-auth">
        {error && (
          <div className="ob-error" role="alert">
            {error}
          </div>
        )}
        <GoogleSignIn
          disabled={busy}
          onCredential={(token) => {
            setBusy(true);
            setError("");
            void authenticateGoogle(token)
              .catch((reason) =>
                setError(
                  reason instanceof Error
                    ? reason.message
                    : t("auth.googleError"),
                ),
              )
              .finally(() => setBusy(false));
          }}
        />
        {email ? (
          <EmailAuthForm
            authenticate={authenticate}
            onBusy={setBusy}
            startingMode="register"
          />
        ) : (
          <button
            className="ob-btn ghost"
            disabled={busy}
            onClick={() => setEmail(true)}
          >
            <Mail size={18} aria-hidden="true" />
            {t("start.save.email")}
          </button>
        )}
        <p className="ob-note">{t("start.save.terms")}</p>
        <a
          className="ob-link"
          style={{ textAlign: "center" }}
          href="/login"
          onClick={() => clearOnboarding()}
        >
          {t("start.save.haveAccount")}
        </a>
      </div>
    </OnboardingFrame>
  );
}
