import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Backpack,
  Briefcase,
  Clapperboard,
  Cpu,
  Dumbbell,
  GraduationCap,
  type LucideIcon,
  Mail,
  Music,
  Newspaper,
  Plane,
  Utensils,
} from "lucide-react";
import {
  TALK_QUESTIONS,
  TalkCheck,
  talkDelta,
  topicForGoal,
} from "../../lib/placement/conversationCheck";
import { OnboardingFrame } from "./OnboardingFrame";
import { EmailAuthForm } from "../EmailAuthForm";
import { GoogleSignIn } from "../GoogleSignIn";
import { useApp } from "../../context/AppContext";
import { LANGUAGE_CODES } from "../../lib/languages";
import {
  BAND_END,
  bandInfo,
  buildPlan,
  wordsPerMonth,
  suggestedTarget,
  targetChoices,
  type Goal,
} from "../../lib/placement/plan";
import type { Band, PlacementResult, Skill } from "../../lib/placement/types";
import {
  INTERESTS,
  MAX_INTERESTS,
  MAX_PRIORITIES,
  PRIORITIES,
  SELF_LEVELS,
  SELF_LEVEL_UNITS,
  goalFromInterests,
  type Interest,
  type OnboardingState,
  type Priority,
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
const LEVEL_BANDS = ["Pre-A1", "A1 · A2", "B1", "B2", "C1"];

/** Five levels, each with a meter that fills as the level rises. */
export function LevelStep({
  state,
  update,
  next,
  back,
}: {
  state: OnboardingState;
  update: Update;
  /** `words` is true when the learner only wants to save words. */
  next: (words: boolean) => void;
  back?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <OnboardingFrame
      step="level"
      title={t("start.self.title")}
      body={t("start.self.body")}
      onBack={back}
      secondary={
        <button
          className="ob-link"
          onClick={() => {
            update({ focus: "words", goal: "other", selfLevel: null });
            next(true);
          }}
        >
          {t("start.self.justWords")}
        </button>
      }
    >
      <div
        className="ob-levels"
        role="group"
        aria-label={t("start.self.title")}
      >
        {SELF_LEVELS.map((level) => (
          <button
            key={level}
            className="ob-card ob-level-card"
            aria-pressed={state.focus !== "words" && state.selfLevel === level}
            onClick={() => {
              update({ selfLevel: level, focus: "goal" });
              next(false);
            }}
          >
            <span className="ob-meter" aria-hidden="true">
              {SELF_LEVELS.slice(1).map((bar) => (
                <i key={bar} data-on={bar <= level || undefined} />
              ))}
            </span>
            <span className="ob-level-text">
              <h3>{t(`start.self.level.${level}.title`)}</h3>
              <p>{t(`start.self.level.${level}.body`)}</p>
            </span>
            <span className="ob-tag" dir="ltr">
              {LEVEL_BANDS[level]}
            </span>
          </button>
        ))}
      </div>
    </OnboardingFrame>
  );
}

const INTEREST_ICONS: Record<Interest, LucideIcon> = {
  travel: Plane,
  business: Briefcase,
  tech: Cpu,
  series: Clapperboard,
  food: Utensils,
  sport: Dumbbell,
  studies: GraduationCap,
  news: Newspaper,
  music: Music,
};

/** Toggles a value in a list, keeping at most `max`; the oldest pick makes room for a new one. */
function toggle<T>(list: T[], value: T, max: number): T[] {
  if (list.includes(value)) return list.filter((item) => item !== value);
  return [...list, value].slice(-max);
}

/** What the learner likes to read about, and what to improve first. Both feed the teacher. */
export function InterestsStep({
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
  const pickPriority = (value: Priority) =>
    update({
      priorities:
        value === "teacher"
          ? state.priorities.includes("teacher")
            ? []
            : ["teacher"]
          : toggle(
              state.priorities.filter((item) => item !== "teacher"),
              value,
              MAX_PRIORITIES,
            ),
    });
  return (
    <OnboardingFrame
      step="interests"
      title={t("start.interests.title")}
      body={t("start.interests.body", { count: MAX_INTERESTS })}
      onBack={back}
      primary={
        <button
          className="ob-btn"
          onClick={() => {
            update({ goal: goalFromInterests(state.interests) });
            next();
          }}
        >
          {t("start.continue")}
        </button>
      }
    >
      <div
        className="ob-grid three ob-interests"
        role="group"
        aria-label={t("start.interests.title")}
      >
        {INTERESTS.map((interest) => {
          const Icon = INTEREST_ICONS[interest];
          return (
            <button
              key={interest}
              className="ob-card ob-row"
              aria-pressed={state.interests.includes(interest)}
              onClick={() =>
                update({
                  interests: toggle(state.interests, interest, MAX_INTERESTS),
                })
              }
            >
              <span className="ob-ico" aria-hidden="true">
                <Icon size={22} strokeWidth={1.8} />
              </span>
              <h3>{t(`start.interests.item.${interest}`)}</h3>
            </button>
          );
        })}
      </div>
      <div className="ob-section">
        <h3>{t("start.priorities.title", { count: MAX_PRIORITIES })}</h3>
        <div className="ob-chips" role="group">
          {PRIORITIES.map((priority) => (
            <button
              key={priority}
              className="ob-chip"
              aria-pressed={state.priorities.includes(priority)}
              onClick={() => pickPriority(priority)}
            >
              {t(`start.priorities.item.${priority}`)}
            </button>
          ))}
        </div>
      </div>
    </OnboardingFrame>
  );
}

/**
 * Short written sentences: the learner reads an English question and taps the best reply.
 * Everything is on screen in writing, with no voice and no separate intro screen.
 */
export function TalkStep({
  state,
  update,
  next,
}: {
  state: OnboardingState;
  update: Update;
  next: () => void;
}) {
  const { t } = useTranslation();
  const theta = Math.min(84, Math.max(1, state.result!.theta + state.adjust));
  const [check] = useState(
    () => new TalkCheck(theta, topicForGoal(state.goal)),
  );
  const [unknown, setUnknown] = useState(0);
  const [question, setQuestion] = useState(() => check.next());
  const reply = (index: number | null) => {
    const session = check;
    if (!question) return;
    session.answer(index === question.answer);
    if (index === null) setUnknown((n) => n + 1);
    if (session.done) {
      update({
        adjust: state.adjust + talkDelta(session.correct),
        talk: {
          correct: session.correct,
          total: TALK_QUESTIONS,
          unknown: unknown + (index === null ? 1 : 0),
        },
      });
      next();
      return;
    }
    setQuestion(session.next());
  };
  if (!question) return null;
  const done = check.answers.length;
  return (
    <OnboardingFrame
      step="talk"
      title={
        <span dir="ltr" lang="en">
          {question.item.prompt}
        </span>
      }
      body={t("start.talk.pick", { current: done + 1, total: TALK_QUESTIONS })}
      secondary={
        <button className="ob-link" onClick={next}>
          {t("start.talk.skip")}
        </button>
      }
    >
      <div className="ob-replies" role="group">
        {question.replies.map((text, index) => (
          <button
            key={text}
            className="ob-btn ghost"
            dir="ltr"
            lang="en"
            onClick={() => reply(index)}
          >
            {text}
          </button>
        ))}
        <button className="ob-btn ghost dk" onClick={() => reply(null)}>
          {t("start.talk.dontKnow")}
        </button>
      </div>
    </OnboardingFrame>
  );
}

/** A number range kept left-to-right inside any sentence, so "6–9" never flips in Hebrew or Arabic. */
const LRI = String.fromCharCode(0x2066);
const PDI = String.fromCharCode(0x2069);
/** Word joiner: the range never wraps at its dash. */
const WJ = String.fromCharCode(0x2060);
const span = (low: number | string, high: number | string) =>
  `${LRI}${low === high ? low : `${low}${WJ}–${WJ}${high}`}${PDI}`;

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
  const gapUnits =
    state.selfLevel === null ? 0 : theta - SELF_LEVEL_UNITS[state.selfLevel];
  const gap =
    state.selfLevel === null
      ? null
      : gapUnits >= 12
        ? "more"
        : gapUnits <= -12
          ? "less"
          : "same";
  const fake = state.log.filter(
    (o) => o.t === "card" && !o.real && o.yes,
  ).length;
  // Ten answers support a range, not an exact count.
  const words = (n: number) => n.toLocaleString(i18n.resolvedLanguage);
  const roundTo50 = (n: number) => Math.max(0, Math.round(n / 50) * 50);
  const knownLow = roundTo50(result.knownEstimate * 0.75);
  const knownHigh = roundTo50(
    Math.min(result.total, result.knownEstimate * 1.25),
  );
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
          low: band,
          high: result.upperBand,
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
        {gap && state.selfLevel !== null && (
          <div className="ob-gap">
            <p>
              {t("start.result.gapCompare", {
                self: t(`start.self.level.${state.selfLevel}.title`),
                found: `${band} · ${t(`start.result.band.${band}`)}`,
              })}
            </p>
            <small>{t(`start.result.gap.${gap}`, { band })}</small>
          </div>
        )}
        {result.cards > 0 && (
          <div>
            <p className="ob-big" style={{ margin: 0 }}>
              <Backpack
                size={20}
                aria-hidden="true"
                style={{ verticalAlign: "-3px" }}
              />{" "}
              {t("start.result.inPocketRange", {
                range: span(words(knownLow), words(knownHigh)),
              })}
            </p>
            <details className="ob-why">
              <summary>{t("start.result.wordsHow")}</summary>
              <small>
                {t("start.result.wordsExplain", {
                  cards: result.cards,
                  total: words(result.total),
                })}
              </small>
            </details>
          </div>
        )}
        {result.cards > 0 && (
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
        )}
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
/** The daily-time meter: five minutes to an hour, in steps of five. */
const MINUTES_MIN = 5;
const MINUTES_MAX = 60;

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
  const { t, i18n } = useTranslation();
  const theta = Math.min(84, Math.max(1, state.result!.theta + state.adjust));
  const startUnit = Math.min(84, Math.max(1, Math.round(theta - 2)));
  const goal: Goal = state.goal ?? "other";
  const choices = targetChoices(startUnit);
  const target =
    state.targetBand && choices.includes(state.targetBand)
      ? state.targetBand
      : suggestedTarget(startUnit);
  const plan = useMemo(
    () =>
      buildPlan({
        startUnit,
        goal,
        targetBand: target,
        minutesPerDay: state.minutes,
        deadlineMonths: 0,
      }),
    [startUnit, goal, target, state.minutes],
  );
  const months = (n: number) => Math.max(1, Math.round(n));
  const low = months(plan.monthsLow);
  const high = Math.max(low, months(plan.monthsHigh));
  const arrival = new Date();
  arrival.setMonth(arrival.getMonth() + Math.round(plan.months));
  return (
    <OnboardingFrame
      step="plan"
      title={t("start.plan.title")}
      body={t("start.plan.body")}
      onBack={back}
      primary={
        <button
          className="ob-btn"
          onClick={() => {
            update({ targetBand: target });
            next();
          }}
        >
          {t("start.plan.next")}
        </button>
      }
    >
      <div className="ob-section">
        <h3>{t("start.plan.targetQuestion")}</h3>
        <div className="ob-chips">
          {choices.map((band) => (
            <button
              key={band}
              className="ob-chip"
              aria-pressed={target === band}
              onClick={() => update({ targetBand: band })}
            >
              <span dir="ltr">{band}</span> · {t(`start.result.band.${band}`)}
              {band === suggestedTarget(startUnit) &&
                ` · ${t("start.plan.recommended")}`}
            </button>
          ))}
        </div>
      </div>
      <section className="ob-plan-card" aria-live="polite">
        <h3>{t("start.plan.minutesQuestion")}</h3>
        <label className="ob-meter-input">
          <span className="ob-meter-value">
            {t("start.plan.perDay", { count: state.minutes })}
          </span>
          <input
            type="range"
            min={MINUTES_MIN}
            max={MINUTES_MAX}
            step={5}
            value={state.minutes}
            aria-valuetext={t("start.plan.perDay", { count: state.minutes })}
            onChange={(event) =>
              update({ minutes: Number(event.target.value), deadline: 0 })
            }
          />
          <span className="ob-meter-ends" aria-hidden="true">
            <small>{t("start.plan.perDay", { count: MINUTES_MIN })}</small>
            <small>{t("start.plan.perDay", { count: MINUTES_MAX })}</small>
          </span>
        </label>
        <p className="ob-words">
          {t("start.plan.wordsPerMonth", {
            count: wordsPerMonth(state.minutes),
          })}
        </p>
        <p className="ob-sim">
          {t("start.plan.reach", {
            band: `${plan.targetBand} · ${t(`start.result.band.${plan.targetBand}`)}`,
            range: span(low, high),
          })}
          <small>
            {t("start.plan.around", {
              date: arrival.toLocaleDateString(i18n.resolvedLanguage, {
                month: "long",
                year: "numeric",
              }),
            })}
          </small>
        </p>
        <p className="ob-note" style={{ textAlign: "start", margin: 0 }}>
          {t("start.plan.cardRange", {
            from: plan.startUnit,
            to: Math.min(plan.targetUnit, BAND_END[plan.targetBand]),
            units: plan.units,
          })}
        </p>
        <small className="ob-note" style={{ textAlign: "start" }}>
          {t("start.plan.dailyNote")}
        </small>
      </section>
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
          {state.targetBand && (
            <span className="ob-tag">
              {t("start.plan.cardTarget", {
                band: `${state.targetBand} · ${t(`start.result.band.${state.targetBand}`)}`,
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
        <a className="ob-link" style={{ textAlign: "center" }} href="/login">
          {t("start.save.haveAccount")}
        </a>
      </div>
    </OnboardingFrame>
  );
}
