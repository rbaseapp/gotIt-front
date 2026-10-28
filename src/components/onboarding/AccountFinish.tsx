import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useSubscription } from "../../context/SubscriptionContext";
import rachel from "../../assets/private-lesson/tutor-female-speaking-wide.png";
import { canMeetTutor } from "../../lib/onboarding/tutorIntro";
import { useFeedback } from "../Feedback";
import { claimOnboarding, saveFirstWords } from "../../lib/onboarding/claim";
import { markFirstRunSkipped } from "../../lib/onboarding/firstRun";
import {
  clearOnboarding,
  type OnboardingState,
} from "../../lib/onboarding/state";
import "../../onboarding.css";

/**
 * Last screen of the check for a learner who already has an account: nothing to
 * sign up for, so the level and plan are saved and the dashboard opens ready.
 */
export function AccountFinish({ state }: { state: OnboardingState }) {
  const { t } = useTranslation();
  const { toast } = useFeedback();
  const { user } = useApp();
  const navigate = useNavigate();
  const { status, hasEntitlement } = useSubscription();
  const tutorOpen = useRef(false);
  tutorOpen.current = Boolean(status) && hasEntitlement("tutor.session");
  const [phase, setPhase] = useState<"saving" | "tutor">("saving");
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      let saved = true;
      try {
        if (state.result) {
          const result = await claimOnboarding(state);
          if (result && !result.applied)
            toast(t("start.save.existing"), { tone: "info" });
          else await saveFirstWords(state);
        }
      } catch {
        saved = false;
        toast(t("start.save.failed"), { tone: "error" });
      } finally {
        // Kept on failure so the next visit retries the save instead of asking again.
        if (saved) clearOnboarding();
        if (user) markFirstRunSkipped(user.id);
        // Someone who can already hold a short conversation meets the teacher now.
        if (saved && canMeetTutor(state.result) && tutorOpen.current)
          setPhase("tutor");
        else navigate("/dashboard", { replace: true });
      }
    })();
  }, [state, t, toast, navigate, user]);
  if (phase === "tutor") return <TutorInvite />;
  return (
    <div className="ob-saving" role="status">
      <div>
        <LoaderCircle className="spin" size={34} />
        <p>{t("start.save.saving")}</p>
      </div>
    </div>
  );
}

/** The invitation to a first short conversation with the teacher, shown to learners who can hold one. */
export function TutorInvite() {
  const { t } = useTranslation();
  return (
    <div className="ob ob-lock" style={{ minHeight: 0 }}>
      <img className="ob-moochi" src={rachel} alt="" draggable={false} />
      <div className="ob-bubble">
        <h1 tabIndex={-1} data-ob-title>
          {t("start.tutorIntro.title")}
        </h1>
        <p>{t("start.tutorIntro.body")}</p>
      </div>
      <Link className="ob-btn" to="/private-lesson?practice=free&intro=1">
        {t("start.tutorIntro.go")}
      </Link>
      <Link className="ob-link" to="/dashboard" replace>
        {t("start.tutorIntro.later")}
      </Link>
    </div>
  );
}
