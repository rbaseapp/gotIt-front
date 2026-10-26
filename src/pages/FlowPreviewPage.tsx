import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PocketTest } from "../components/onboarding/PocketTest";
import { TutorInvite } from "../components/onboarding/AccountFinish";
import { LockedFeature, TutorLockCard } from "../components/onboarding/Gates";
import {
  AboutStep,
  GoalStep,
  PlanStep,
  ResultStep,
  TalkStep,
} from "../components/onboarding/steps";
import {
  initialOnboarding,
  type OnboardingState,
} from "../lib/onboarding/state";
import type { PlacementBank, PlacementResult } from "../lib/placement/types";
import "../onboarding.css";

/**
 * Developer page: every screen of the first-entry flow, side by side at phone width, built
 * from the real components with sample answers. Nothing here is saved. Dev server only.
 */
const SCREENS = [
  ["about", "1 · עליך: גיל וקריאה"],
  ["about-kid", "1 · עד גיל 8 (בלי שאלת קריאה)"],
  ["goal", "2 · מטרה והערכה עצמית"],
  ["pocket-intro", "5 · הבדיקה: פתיחה"],
  ["pocket-card", "5 · הבדיקה: שאלת פירוש"],
  ["talk-intro", "6 · שיחה עם רייצ'ל: פתיחה"],
  ["talk-question", "6 · שיחה עם רייצ'ל: שאלה"],
  ["result", "7 · התוצאה"],
  ["plan", "8 · התוכנית"],
  ["tutor", "9 · הזמנה לשיחה"],
  ["locked-courses", "נעילה: קורסים (חינם)"],
  ["locked-tutor", "נעילה: מורה (חינם)"],
  ["tutor-lock", "נעילה: מורה (עוד בסיס)"],
] as const;

const SAMPLE_RESULT: PlacementResult = {
  theta: 27,
  low: 22,
  high: 32,
  startUnit: 25,
  band: "A2",
  sub: "high",
  upperBand: "B1",
  knownEstimate: 1150,
  total: 3424,
  skills: { vocabulary: "ok", reading: "ok", listening: "strong" },
  reliability: 0.9,
  uncertain: false,
  literacy: "reader",
  cards: 18,
  seconds: 150,
  knownWords: [],
  seedWords: [],
};

const sample = (patch: Partial<OnboardingState>): OnboardingState => ({
  ...initialOnboarding(),
  answerMode: "voice",
  ageBand: "18+",
  readingComfort: "easy",
  focus: "goal",
  goal: "work",
  selfLevel: 2,
  ...patch,
});

function Screen({ id }: { id: string }) {
  const [state, setState] = useState<OnboardingState>(() => {
    switch (id) {
      case "about":
        return sample({
          step: "about",
          ageBand: null,
          readingComfort: null,
        });
      case "about-kid":
        return sample({
          step: "about",
          ageBand: "under9",
          readingComfort: "hard",
        });
      case "goal":
        return sample({
          step: "goal",
          focus: "goal",
          goal: "work",
          selfLevel: null,
        });
      case "pocket-intro":
        return sample({ step: "pocket", phase: "intro" });
      case "pocket-card":
        return sample({ step: "pocket", phase: "cards" });
      case "talk-intro":
      case "talk-question":
        return sample({ step: "talk", result: SAMPLE_RESULT });
      case "result":
        return sample({ step: "result", result: SAMPLE_RESULT, selfLevel: 1 });
      case "plan":
        return sample({ step: "plan", result: SAMPLE_RESULT });
      default:
        return sample({});
    }
  });
  const update = (patch: Partial<OnboardingState>) =>
    setState((current) => ({ ...current, ...patch }));
  const [bank, setBank] = useState<PlacementBank | null>(null);
  useEffect(() => {
    if (!id.startsWith("pocket")) return;
    void import("../data/placement/bank.json").then((m) =>
      setBank(m.default as unknown as PlacementBank),
    );
  }, [id]);
  const noop = () => {};
  const common = { state, update, next: noop };
  switch (id) {
    case "about":
    case "about-kid":
      return <AboutStep {...common} back={noop} />;
    case "goal":
      return <GoalStep {...common} back={noop} />;
    case "pocket-intro":
    case "pocket-card":
      return bank ? (
        <PocketTest
          bank={bank}
          state={state}
          update={update}
          onDone={noop}
          onBack={noop}
        />
      ) : null;
    case "talk-intro":
      return <TalkStep {...common} />;
    case "talk-question":
      return <TalkStep {...common} startAtQuestion />;
    case "result":
      return <ResultStep {...common} back={noop} />;
    case "plan":
      return <PlanStep {...common} back={noop} />;
    case "tutor":
      return <TutorInvite />;
    case "locked-courses":
      return <LockedFeature kind="courses" />;
    case "locked-tutor":
      return <LockedFeature kind="tutor" />;
    case "tutor-lock":
      return <TutorLockCard done={1} required={3} />;
    default:
      return <p style={{ padding: 24 }}>Unknown screen</p>;
  }
}

export function FlowPreviewPage() {
  const { screen } = useParams();
  const title = useMemo(
    () => SCREENS.find(([id]) => id === screen)?.[1] ?? "",
    [screen],
  );
  if (screen)
    return (
      <div>
        <div style={{ padding: "8px 14px", fontSize: 13 }}>
          <Link to="/flow-preview">← כל המסכים</Link> · {title}
        </div>
        <Screen key={screen} id={screen} />
      </div>
    );
  return (
    <div
      dir="rtl"
      style={{ padding: 24, background: "#f2f1ea", minHeight: "100vh" }}
    >
      <h1 style={{ margin: "0 0 4px" }}>הזרימה בכניסה הראשונה, כל המסכים</h1>
      <p style={{ margin: "0 0 20px", color: "#566" }}>
        רכיבים אמיתיים עם תשובות לדוגמה, ברוחב טלפון. לחיצה על כותרת פותחת מסך
        בגודל מלא ואפשר ללחוץ בו. שום דבר לא נשמר. הדף קיים רק בשרת הפיתוח.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, 420px)",
          gap: 22,
        }}
      >
        {SCREENS.map(([id, label]) => (
          <figure key={id} style={{ margin: 0 }}>
            <figcaption style={{ fontWeight: 800, marginBottom: 6 }}>
              <Link to={`/flow-preview/${id}`}>{label}</Link>
            </figcaption>
            <iframe
              title={label}
              src={`/flow-preview/${id}`}
              loading="lazy"
              style={{
                width: 390,
                height: 780,
                border: "2px solid #22322c",
                borderRadius: 18,
                background: "#faf9f5",
              }}
            />
          </figure>
        ))}
      </div>
    </div>
  );
}
