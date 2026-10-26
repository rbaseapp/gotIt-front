import { useMemo, useRef, useState } from "react";
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
  DEADLINES,
  bandInfo,
  buildPlan,
  suggestedTarget,
  targetChoices,
  type Deadline,
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

/** Rachel asks four short English questions; the learner taps the best reply. */
export function TalkStep({
  state,
  update,
  next,
  startAtQuestion = false,
}: {
  state: OnboardingState;
  update: Update;
  next: () => void;
  /** Skips the intro screen (the flow preview uses it). */
  startAtQuestion?: boolean;
}) {
  const { t } = useTranslation();
  const theta = Math.min(84, Math.max(1, state.result!.theta + state.adjust));
  const check = useRef<TalkCheck | null>(
    startAtQuestion ? new TalkCheck(theta, topicForGoal(state.goal)) : null,
  );
  const [started, setStarted] = useState(startAtQuestion);
  const [unknown, setUnknown] = useState(0);
  const [question, setQuestion] = useState<ReturnType<TalkCheck["next"]>>(() =>
    startAtQuestion ? (check.current?.next() ?? null) : null,
  );
  const begin = () => {
    check.current = new TalkCheck(theta, topicForGoal(state.goal));
    setQuestion(check.current.next());
    setStarted(true);
  };
  const reply = (index: number | null) => {
    const session = check.current;
    if (!session || !question) return;
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
  if (!started || !question)
    return (
      <OnboardingFrame
        step="talk"
        title={t("start.talk.title")}
        body={t("start.talk.body")}
        primary={
          <button className="ob-btn" onClick={begin}>
            {t("start.talk.begin")}
          </button>
        }
        secondary={
          <button className="ob-link" onClick={next}>
            {t("start.talk.skip")}
          </button>
        }
      >
        <span />
      </OnboardingFrame>
    );
  const done = check.current?.answers.length ?? 0;
  return (
    <OnboardingFrame
      step="talk"
      title={
        <span dir="ltr" lang="en">
          {question.item.prompt}
        </span>
      }
      body={t("start.talk.pick", { current: done + 1, total: TALK_QUESTIONS })}
      voiceText={question.item.prompt}
      voiceLang="en"
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
        {gap && <p className="ob-note">{t(`start.result.gap.${gap}`)}</p>}
        <div>
          <p className="ob-big" style={{ margin: 0 }}>
            <Backpack
              size={20}
              aria-hidden="true"
              style={{ verticalAlign: "-3px" }}
            />{" "}
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
        deadlineMonths: state.deadline,
      }),
    [startUnit, goal, target, state.minutes, state.deadline],
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
        <h3>{t("start.plan.cardTitle")}</h3>
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
