import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  LoaderCircle,
  MessageCircle,
  Mic,
  PencilLine,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useSubscription } from "../../context/SubscriptionContext";
import { OnboardingFrame } from "./OnboardingFrame";
import moochi from "../../assets/ux/dashboard-moohi.png";
import { canMeetTutor } from "../../lib/onboarding/tutorIntro";
import { claimOnboarding, saveFirstWords } from "../../lib/onboarding/claim";
import { bandInfo, wordsPerMonth } from "../../lib/placement/plan";
import { markFirstRunSkipped } from "../../lib/onboarding/firstRun";
import {
  clearOnboarding,
  type OnboardingState,
} from "../../lib/onboarding/state";
import "../../onboarding.css";

type Phase = "saving" | "choose" | "failed" | "tutor";

/**
 * Last screen of the check for a learner who already has an account: nothing to
 * sign up for, so the level and plan are saved and the dashboard opens ready.
 * A learner who already has a running program decides whether the new result replaces it,
 * and a save that fails says so instead of opening a dashboard without the plan.
 */
export function AccountFinish({ state }: { state: OnboardingState }) {
  const { t } = useTranslation();
  const { user } = useApp();
  const navigate = useNavigate();
  const { status, hasEntitlement } = useSubscription();
  const tutorOpen = useRef(false);
  tutorOpen.current = Boolean(status) && hasEntitlement("tutor.session");
  const [phase, setPhase] = useState<Phase>("saving");

  const leave = useCallback(
    (saved: boolean) => {
      // Kept on failure so the next visit retries the save instead of asking again.
      if (saved) clearOnboarding();
      if (user) markFirstRunSkipped(user.id);
      // Someone who can already hold a short conversation meets the teacher now.
      if (saved && canMeetTutor(state.result) && tutorOpen.current)
        setPhase("tutor");
      else navigate("/dashboard", { replace: true });
    },
    [navigate, state.result, user],
  );

  const save = useCallback(
    async (replace: boolean) => {
      setPhase("saving");
      try {
        if (state.result) {
          const result = await claimOnboarding(state, { replace });
          if (result && !result.applied) {
            setPhase("choose");
            return;
          }
          await saveFirstWords(state);
        }
        leave(true);
      } catch {
        setPhase("failed");
      }
    },
    [leave, state],
  );

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void save(false);
  }, [save]);

  if (phase === "tutor") {
    const theta = Math.min(
      84,
      Math.max(1, (state.result?.theta ?? 1) + state.adjust),
    );
    return <TutorInvite band={bandInfo(theta).band} minutes={state.minutes} />;
  }
  if (phase === "choose" || phase === "failed")
    return (
      <div className="ob ob-lock" style={{ minHeight: 0 }}>
        <img className="ob-moochi" src={moochi} alt="" draggable={false} />
        <div className="ob-bubble">
          <h1 tabIndex={-1} data-ob-title>
            {t(`start.finish.${phase}.title`)}
          </h1>
          <p>{t(`start.finish.${phase}.body`)}</p>
        </div>
        <button
          className="ob-btn"
          onClick={() => void save(phase === "choose")}
        >
          {t(`start.finish.${phase}.primary`)}
        </button>
        <button className="ob-link" onClick={() => leave(phase === "choose")}>
          {t(`start.finish.${phase}.secondary`)}
        </button>
      </div>
    );
  return (
    <div className="ob-saving" role="status">
      <div>
        <LoaderCircle className="spin" size={34} />
        <p>{t("start.save.saving")}</p>
      </div>
    </div>
  );
}

/** The invitation to a first short chat with Moochi, shown to learners who can hold one. */
export function TutorInvite({
  band,
  minutes,
}: {
  band: string;
  minutes: number;
}) {
  const { t } = useTranslation();
  const steps = [
    { icon: MessageCircle, key: "ask" },
    { icon: Mic, key: "answer" },
    { icon: PencilLine, key: "fix" },
  ] as const;
  return (
    <OnboardingFrame
      step="save"
      title={t("start.tutorIntro.title")}
      body={t("start.tutorIntro.body")}
      primary={
        <Link className="ob-btn" to="/private-lesson?practice=free&intro=1">
          {t("start.tutorIntro.go")}
        </Link>
      }
      secondary={
        <Link className="ob-link" to="/dashboard" replace>
          {t("start.tutorIntro.later")}
        </Link>
      }
    >
      <section className="ob-saved" aria-label={t("start.tutorIntro.saved")}>
        <span className="ob-saved-ok" aria-hidden="true">
          <Check size={18} />
        </span>
        <b>{t("start.tutorIntro.saved")}</b>
        <span className="ob-saved-chips">
          <span>
            <span dir="ltr">{band}</span> · {t(`start.result.band.${band}`)}
          </span>
          <span>{t("start.plan.perDay", { count: minutes })}</span>
          <span>
            {t("start.plan.wordsPerMonth", { count: wordsPerMonth(minutes) })}
          </span>
        </span>
      </section>
      <section className="ob-steps">
        {steps.map(({ icon: Icon, key }) => (
          <article key={key}>
            <span aria-hidden="true">
              <Icon size={22} />
            </span>
            <b>{t(`start.tutorIntro.${key}Title`)}</b>
            <small>{t(`start.tutorIntro.${key}Body`)}</small>
          </article>
        ))}
      </section>
      <ul className="ob-promise">
        <li>{t("start.tutorIntro.promiseTime")}</li>
        <li>{t("start.tutorIntro.promiseStop")}</li>
        <li>{t("start.tutorIntro.promiseNoScore")}</li>
      </ul>
    </OnboardingFrame>
  );
}
