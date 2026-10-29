import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { canTalkCheck } from "../lib/onboarding/tutorIntro";
import { AccountFinish } from "../components/onboarding/AccountFinish";
import { markFirstRunSkipped } from "../lib/onboarding/firstRun";
import { OnboardingFrame } from "../components/onboarding/OnboardingFrame";
import { PocketTest } from "../components/onboarding/PocketTest";
import {
  InterestsStep,
  LanguageStep,
  LevelStep,
  PlanStep,
  ResultStep,
  SaveStep,
  TalkStep,
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
import type { PlacementBank, PlacementResult } from "../lib/placement/types";
import "../onboarding.css";

/**
 * /start: the level check. Signed in (the first time a learner enters their account)
 * it ends by saving the level and plan; signed out it ends with sign-up.
 * Everything is kept in this browser, so closing the tab loses nothing.
 */
export function StartPage() {
  const { user } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <>
      <StartFlow account={Boolean(user)} />
      {user && (
        <button
          type="button"
          className="ob-skip"
          onClick={() => {
            markFirstRunSkipped(user.id);
            navigate("/dashboard", { replace: true });
          }}
        >
          {t("start.skip")}
        </button>
      )}
    </>
  );
}

function StartFlow({ account }: { account: boolean }) {
  const { t } = useTranslation();
  // /start?fresh drops the saved answers, so a reviewer can walk the flow again.
  const saved = useMemo(() => {
    if (new URLSearchParams(window.location.search).has("fresh")) {
      clearOnboarding();
      return null;
    }
    return loadOnboarding();
  }, []);
  const [state, setState] = useState<OnboardingState>(
    () =>
      saved ??
      (account
        ? { ...initialOnboarding(), step: "level" as Step }
        : initialOnboarding()),
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
  const startCheck = () =>
    update({
      step: "pocket",
      log: [],
      phase: "intro",
      result: null,
      literacy: null,
    });
  const move = (delta: number) =>
    go(
      STEPS[
        Math.min(
          STEPS.length - 1,
          Math.max(0, STEPS.indexOf(state.step) + delta),
        )
      ]!,
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
  if (state.step === "level")
    return (
      <LevelStep
        state={state}
        update={update}
        back={account ? undefined : () => move(-1)}
        next={(words) => {
          // Languages without a program yet have words and games only.
          if (!account && state.language !== "en") go("save");
          else if (words) startCheck();
          else go("interests");
        }}
      />
    );
  if (state.step === "interests")
    return (
      <InterestsStep
        state={state}
        update={update}
        back={() => go("level")}
        next={startCheck}
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
        onBack={() => go(state.focus === "words" ? "level" : "interests")}
        onDone={(result: PlacementResult) =>
          update({
            result,
            step:
              state.focus !== "words" && canTalkCheck(result)
                ? "talk"
                : "result",
          })
        }
      />
    );
  }
  if (account && state.step === "save") return <AccountFinish state={state} />;
  if (!state.result) {
    // A resumed session that lost its result goes back to the check.
    return (
      <LanguageStep state={state} update={update} next={() => go("level")} />
    );
  }
  if (state.step === "talk")
    return <TalkStep state={state} update={update} next={() => go("result")} />;
  if (state.step === "result")
    return (
      <ResultStep
        state={state}
        update={update}
        back={() =>
          state.selfLevel === 0 && state.focus !== "words"
            ? update({ step: "interests", log: [], result: null })
            : update({ step: "pocket", phase: "intro", log: [], result: null })
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
        next={() => go("save")}
      />
    );
  return <SaveStep state={state} back={() => go("plan")} />;
}
