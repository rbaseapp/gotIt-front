import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Backpack,
  Baby,
  Bookmark,
  BookOpen,
  Briefcase,
  Coffee,
  GraduationCap,
  Headphones,
  Globe,
  type LucideIcon,
  Mail,
  MessageCircle,
  Mic,
  PencilLine,
  Plane,
  Rocket,
  Sprout,
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
  type Deadline,
  type Goal,
} from "../../lib/placement/plan";
import type { Band, PlacementResult, Skill } from "../../lib/placement/types";
import {
  SELF_LEVEL_UNITS,
  clearOnboarding,
  type AgeBand,
  type AnswerMode,
  type OnboardingState,
  type ReadingComfort,
  type SelfLevel,
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
const MODES: AnswerMode[] = ["voice", "text"];

/** First question: how the learner is comfortable answering. No microphone is asked for here. */
export function ModeStep({
  state,
  update,
  next,
  back,
}: {
  state: OnboardingState;
  update: Update;
  next: () => void;
  back?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <OnboardingFrame
      step="mode"
      title={t("start.mode.title")}
      body={t("start.mode.body")}
      onBack={back}
      primary={
        <button className="ob-btn" disabled={!state.answerMode} onClick={next}>
          {t("start.continue")}
        </button>
      }
    >
      <div className="ob-grid two">
        {MODES.map((mode) => (
          <button
            key={mode}
            className="ob-card"
            aria-pressed={state.answerMode === mode}
            onClick={() => update({ answerMode: mode })}
          >
            <span className="ob-ico big" aria-hidden="true">
              {(() => {
                const Icon = MODE_ICONS[mode];
                return <Icon size={26} strokeWidth={1.8} />;
              })()}
            </span>
            <h3>{t(`start.mode.${mode}.title`).replace(LEADING_EMOJI, "")}</h3>
            <p>{t(`start.mode.${mode}.body`)}</p>
          </button>
        ))}
      </div>
      <p className="ob-note">{t("start.mode.note")}</p>
    </OnboardingFrame>
  );
}

const AGES: AgeBand[] = ["under9", "9-12", "13-17", "18+"];
const READING: ReadingComfort[] = ["easy", "some", "hard"];
const GOAL_ICONS: Record<string, LucideIcon> = {
  words: Bookmark,
  travel: Plane,
  work: Briefcase,
  study: GraduationCap,
  abroad: Globe,
  talk: MessageCircle,
  scratch: Sprout,
};
const SELF_ICONS: LucideIcon[] = [Sprout, BookOpen, MessageCircle, Rocket];
const MODE_ICONS: Record<AnswerMode, LucideIcon> = {
  voice: Mic,
  text: PencilLine,
};
/** Titles in the language files start with an emoji; the screens use line icons instead. */
const LEADING_EMOJI = /^[\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u;
const AGE_ICONS: Record<AgeBand, LucideIcon> = {
  under9: Baby,
  "9-12": Backpack,
  "13-17": Headphones,
  "18+": Coffee,
};

/** Age band (never a birth date) and how easy reading is. Nobody is turned away. */
export function AboutStep({
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
  const young = state.ageBand === "under9" || state.ageBand === "9-12";
  const readingKnown = state.ageBand === "under9" || state.readingComfort;
  return (
    <OnboardingFrame
      step="about"
      title={t("start.about.title")}
      body={t("start.about.body")}
      onBack={back}
      primary={
        <button
          className="ob-btn"
          disabled={!state.ageBand || !readingKnown}
          onClick={next}
        >
          {t("start.continue")}
        </button>
      }
    >
      <div className="ob-section">
        <h3>{t("start.about.ageQuestion")}</h3>
        <div className="ob-grid four">
          {AGES.map((age) => (
            <button
              key={age}
              className="ob-card ob-mini"
              aria-pressed={state.ageBand === age}
              onClick={() =>
                update(
                  age === "under9"
                    ? { ageBand: age, readingComfort: "hard" }
                    : {
                        ageBand: age,
                        readingComfort:
                          state.ageBand === "under9"
                            ? null
                            : state.readingComfort,
                      },
                )
              }
            >
              <span className="ob-ico" aria-hidden="true">
                {(() => {
                  const Icon = AGE_ICONS[age];
                  return <Icon size={22} strokeWidth={1.8} />;
                })()}
              </span>
              <h3>
                <bdi>{t(`start.about.age.${age}`)}</bdi>
              </h3>
            </button>
          ))}
        </div>
        {young && <p className="ob-note">{t("start.about.minorNote")}</p>}
      </div>
      {state.ageBand && state.ageBand !== "under9" && (
        <div className="ob-section">
          <h3>{t("start.about.readingQuestion")}</h3>
          <div className="ob-chips">
            {READING.map((level) => (
              <button
                key={level}
                className="ob-chip"
                aria-pressed={state.readingComfort === level}
                onClick={() => update({ readingComfort: level })}
              >
                {t(`start.about.reading.${level}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </OnboardingFrame>
  );
}

const GOAL_CHOICES = [
  "words",
  "travel",
  "work",
  "study",
  "abroad",
  "talk",
  "scratch",
] as const;
type GoalChoice = (typeof GOAL_CHOICES)[number];

/** One question about what the learner wants; it sets the focus and the goal together. */
export function GoalStep({
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
  const chosen: GoalChoice | null =
    state.focus === "words"
      ? "words"
      : state.focus === "scratch"
        ? "scratch"
        : ((state.goal as GoalChoice | null) ?? null);
  const choose = (choice: GoalChoice) =>
    update(
      choice === "words"
        ? { focus: "words", goal: "other" }
        : choice === "scratch"
          ? { focus: "scratch", goal: "other" }
          : { focus: "goal", goal: choice },
    );
  return (
    <OnboardingFrame
      step="goal"
      title={t("start.goalStep.title")}
      body={t("start.goalStep.body")}
      onBack={back}
      primary={
        <button className="ob-btn" disabled={!chosen} onClick={next}>
          {t("start.continue")}
        </button>
      }
    >
      <div className="ob-grid three">
        {GOAL_CHOICES.map((choice) => (
          <button
            key={choice}
            className="ob-card"
            aria-pressed={chosen === choice}
            onClick={() => choose(choice)}
          >
            <span className="ob-ico" aria-hidden="true">
              {(() => {
                const Icon = GOAL_ICONS[choice]!;
                return <Icon size={22} strokeWidth={1.8} />;
              })()}
            </span>
            <h3>{t(`start.goalStep.${choice}.title`)}</h3>
            <p>{t(`start.goalStep.${choice}.body`)}</p>
          </button>
        ))}
      </div>
      <p className="ob-note">{t("start.goalStep.note")}</p>
    </OnboardingFrame>
  );
}

const SELF_LEVELS: SelfLevel[] = [0, 1, 2, 3];

/** The learner's own view of their English. It only sets where the check starts. */
export function SelfStep({
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
  return (
    <OnboardingFrame
      step="self"
      title={t("start.self.title")}
      body={t("start.self.body")}
      onBack={back}
      primary={
        <button
          className="ob-btn"
          disabled={state.selfLevel === null}
          onClick={next}
        >
          {t("start.continue")}
        </button>
      }
    >
      <div className="ob-grid two">
        {SELF_LEVELS.map((level) => (
          <button
            key={level}
            className="ob-card"
            aria-pressed={state.selfLevel === level}
            onClick={() => update({ selfLevel: level })}
          >
            <span className="ob-ico" aria-hidden="true">
              {(() => {
                const Icon = SELF_ICONS[level]!;
                return <Icon size={22} strokeWidth={1.8} />;
              })()}
            </span>
            <h3>{t(`start.self.level.${level}.title`)}</h3>
            <p>{t(`start.self.level.${level}.body`)}</p>
          </button>
        ))}
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
    if (session.done) {
      update({
        adjust: state.adjust + talkDelta(session.correct),
        talk: { correct: session.correct, total: TALK_QUESTIONS },
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
      secondary={
        <button className="ob-link" onClick={() => reply(null)}>
          {t("start.talk.notSure")}
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
