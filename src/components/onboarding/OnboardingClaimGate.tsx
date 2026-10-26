import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFeedback } from "../Feedback";
import { claimOnboarding, saveFirstWords } from "../../lib/onboarding/claim";
import { clearOnboarding, loadOnboarding } from "../../lib/onboarding/state";
import "../../onboarding.css";

/**
 * Right after sign-up: saves what the learner built before they had an account
 * (level, plan, known words, first words) and sends them to a dashboard that
 * already knows where they are. Renders nothing special when there is nothing to save.
 */
export function OnboardingClaimGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { toast } = useFeedback();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"claiming" | "done">(() =>
    loadOnboarding()?.result ? "claiming" : "done",
  );
  const started = useRef(false);
  useEffect(() => {
    if (phase !== "claiming" || started.current) return;
    started.current = true;
    const state = loadOnboarding();
    if (!state?.result) {
      setPhase("done");
      return;
    }
    void (async () => {
      try {
        const result = await claimOnboarding(state);
        if (result && !result.applied)
          toast(t("start.save.existing"), { tone: "info" });
        else await saveFirstWords(state);
      } catch {
        toast(t("start.save.failed"), { tone: "error" });
      } finally {
        clearOnboarding();
        setPhase("done");
        navigate("/dashboard", { replace: true });
      }
    })();
  }, [phase, navigate, t, toast]);
  if (phase === "claiming")
    return (
      <div className="ob-saving" role="status">
        <div>
          <LoaderCircle className="spin" size={34} />
          <p>{t("start.save.saving")}</p>
        </div>
      </div>
    );
  return <>{children}</>;
}
