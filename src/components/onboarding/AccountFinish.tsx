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
import moochi from "../../assets/ux/dashboard-moohi.webp";
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
      // Everyone meets Moochi now; a beginner's first chat teaches their first words.
      if (saved && tutorOpen.current) setPhase("tutor");
      else navigate("/dashboard", { replace: true });
    },
    [navigate, user],
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
    return (
      <TutorInvite
        band={bandInfo(theta).band}
        minutes={state.minutes}
        beginner={!canMeetTutor(state.result)}
      />
    );
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

/**
 * The invitation to a first short chat with Moochi. A learner who can already hold a short
 * conversation chats about familiar things; a beginner learns their first English words in their
 * own language.
 */
export function TutorInvite({
  band,
  minutes,
  beginner = false,
}: {
  band: string;
  minutes: number;
  beginner?: boolean;
}) {
  const { t } = useTranslation();
  const copy = beginner ? "start.tutorIntro.beginner" : "start.tutorIntro";
  const steps = beginner
    ? ([
        { icon: MessageCircle, key: "learn" },
        { icon: Mic, key: "repeat" },
        { icon: PencilLine, key: "use" },
      ] as const)
    : ([
        { icon: MessageCircle, key: "ask" },
        { icon: Mic, key: "answer" },
        { icon: PencilLine, key: "fix" },
      ] as const);
  return (
    <OnboardingFrame
      step="save"
      title={t(`${copy}.title`)}
      body={t(`${copy}.body`)}
      primary={
        <Link
          className="ob-btn"
          to={`/private-lesson?practice=free&intro=1${beginner ? "&beginner=1" : ""}`}
        >
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
            <b>{t(`${copy}.${key}Title`)}</b>
            <small>{t(`${copy}.${key}Body`)}</small>
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
