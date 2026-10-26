import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
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
        navigate("/dashboard", { replace: true });
      }
    })();
  }, [state, t, toast, navigate, user]);
  return (
    <div className="ob-saving" role="status">
      <div>
        <LoaderCircle className="spin" size={34} />
        <p>{t("start.save.saving")}</p>
      </div>
    </div>
  );
}
