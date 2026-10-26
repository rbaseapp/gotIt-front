import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle } from "lucide-react";
import { OnboardingFrame } from "../components/onboarding/OnboardingFrame";
import { PocketTest } from "../components/onboarding/PocketTest";
import {
  FirstWordsStep,
  FocusStep,
  LanguageStep,
  PlanStep,
  ResultStep,
  SaveStep,
} from "../components/onboarding/steps";
import {
  STEPS,
  clearOnboarding,
  initialOnboarding,
  loadOnboarding,
  saveOnboarding,
  type OnboardingState,
  type Step,
} from "../lib/onboarding/state";
import { firstWordsFor } from "../lib/onboarding/firstWords";
import type { PlacementBank, PlacementResult } from "../lib/placement/types";
import "../onboarding.css";

/**
 * /start: the signed-out onboarding. Seven short screens, no account until the last one.
 * Everything is kept in this browser, so closing the tab loses nothing.
 */
export function StartPage() {
  const { t, i18n } = useTranslation();
  const saved = useMemo(() => loadOnboarding(), []);
  const [state, setState] = useState<OnboardingState>(
    () => saved ?? initialOnboarding(),
  );
  const [resume, setResume] = useState(
    Boolean(saved && saved.step !== "language"),
  );
  const [bank, setBank] = useState<PlacementBank | null>(null);

  useEffect(() => {
    let alive = true;
    void import("../data/placement/bank.json").then((module) => {
      if (alive) setBank(module.default as unknown as PlacementBank);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      saveOnboarding(next);
      return next;
    });
  }, []);

  useEffect(() => {
    document
      .querySelector<HTMLElement>("[data-ob-title]")
      ?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [state.step]);

  const go = (step: Step) => update({ step });
  const move = (delta: number) =>
    go(
      STEPS[
        Math.min(
          STEPS.length - 1,
          Math.max(0, STEPS.indexOf(state.step) + delta),
        )
      ]!,
    );

  const hebrew = (i18n.resolvedLanguage ?? "en") === "he";
  const firstWords = useMemo(
    () => (bank && state.result ? firstWordsFor(state, bank) : []),
    [bank, state],
  );

  if (resume)
    return (
      <OnboardingFrame
        step={state.step}
        title={t("start.resume.title")}
        body={t("start.resume.body")}
        primary={
          <button className="ob-btn" onClick={() => setResume(false)}>
            {t("start.resume.continue")}
          </button>
        }
        secondary={
          <button
            className="ob-btn ghost"
            onClick={() => {
              clearOnboarding();
              setState(initialOnboarding());
              setResume(false);
            }}
          >
            {t("start.resume.restart")}
          </button>
        }
      >
        <span />
      </OnboardingFrame>
    );

  if (state.step === "language")
    return <LanguageStep state={state} update={update} next={() => move(1)} />;
  if (state.step === "focus")
    return (
      <FocusStep
        state={state}
        update={update}
        back={() => move(-1)}
        next={() => {
          // Languages without a program yet have words and games only.
          if (state.language !== "en") go("save");
          else {
            update({
              goal: state.focus === "words" ? "other" : state.goal,
              step: "pocket",
              log: [],
              phase: "intro",
              result: null,
              literacy: null,
            });
          }
        }}
      />
    );
  if (state.step === "pocket") {
    if (!bank)
      return (
        <div className="ob" role="status">
          <div className="ob-saving">
            <LoaderCircle className="spin" size={30} />
          </div>
        </div>
      );
    return (
      <PocketTest
        bank={bank}
        state={state}
        update={update}
        onBack={() => move(-1)}
        onDone={(result: PlacementResult) => update({ result, step: "result" })}
      />
    );
  }
  if (!state.result) {
    // A resumed session that lost its result goes back to the check.
    return (
      <LanguageStep state={state} update={update} next={() => go("focus")} />
    );
  }
  if (state.step === "result")
    return (
      <ResultStep
        state={state}
        update={update}
        back={() =>
          update({ step: "pocket", phase: "intro", log: [], result: null })
        }
        next={() => go("plan")}
      />
    );
  if (state.step === "plan")
    return (
      <PlanStep
        state={state}
        update={update}
        back={() => move(-1)}
        next={() => go(hebrew && firstWords.length ? "firstWords" : "save")}
      />
    );
  if (state.step === "firstWords")
    return (
      <FirstWordsStep
        state={state}
        update={update}
        words={firstWords}
        back={() => move(-1)}
        next={() => {
          update({ firstWords: firstWords.map((w) => `${w.en}|${w.he}`) });
          go("save");
        }}
      />
    );
  return (
    <SaveStep
      state={state}
      back={() => go(hebrew && firstWords.length ? "firstWords" : "plan")}
    />
  );
}
