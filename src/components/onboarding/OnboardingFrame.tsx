import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import logoUrl from "../../assets/gotit-logo.svg";
import moochi from "../../assets/ux/dashboard-moohi.png";
import { useApp } from "../../context/AppContext";
import { progressSteps, type Step } from "../../lib/onboarding/state";
import { markFirstRunSkipped } from "../../lib/onboarding/firstRun";

/**
 * The page every onboarding screen sits in: brand, progress, the trial badge and
 * Moochi's speech bubble with the question. Actions are pinned to the bottom so the
 * main button is always where the thumb is on a phone.
 */
export function OnboardingFrame({
  step,
  title,
  body,
  children,
  primary,
  secondary,
  onBack,
  hideMoochi,
}: {
  step: Step;
  title: ReactNode;
  body?: ReactNode;
  children: ReactNode;
  primary?: ReactNode;
  secondary?: ReactNode;
  onBack?: () => void;
  hideMoochi?: boolean;
}) {
  const { t } = useTranslation();
  const { user } = useApp();
  const STEPS = progressSteps(Boolean(user));
  const index = Math.max(
    1,
    STEPS.indexOf(step === "talk" ? "pocket" : step) + 1,
  );
  return (
    <div className="ob" data-step={step}>
      <header className="ob-top">
        <Link to="/" className="ob-brand" aria-label="GotIt">
          <img src={logoUrl} alt="" draggable={false} />
        </Link>
        <div
          className="ob-progress"
          role="group"
          aria-label={t("start.stepOf", {
            current: index,
            total: STEPS.length,
          })}
        >
          <small>
            {t("start.stepOf", { current: index, total: STEPS.length })}
          </small>
          <div className="ob-bars" aria-hidden="true">
            {STEPS.map((name, i) => (
              <span
                key={name}
                data-done={i + 1 < index || undefined}
                data-now={i + 1 === index || undefined}
              />
            ))}
          </div>
        </div>
        {/* A signed-in learner already has an account and its plan. */}
        {!user && <span className="ob-trial">{t("start.trialBadge")}</span>}
      </header>
      <main className="ob-main">
        <div className="ob-head">
          <div className="ob-bubble">
            <h1 tabIndex={-1} data-ob-title>
              {title}
            </h1>
            {body && <p>{body}</p>}
          </div>
          {!hideMoochi && (
            <img className="ob-moochi" src={moochi} alt="" draggable={false} />
          )}
        </div>
        {children}
      </main>
      <div className="ob-actions">
        <div>
          {onBack ? (
            <button type="button" className="ob-btn ghost" onClick={onBack}>
              <ArrowRight size={18} aria-hidden="true" />
              {t("start.back")}
            </button>
          ) : (
            <ExitLink />
          )}
          <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {secondary}
            {primary}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Signed in, "exit" means "not now": back to the dashboard, without being sent here again. */
function ExitLink() {
  const { t } = useTranslation();
  const { user } = useApp();
  const navigate = useNavigate();
  if (!user)
    return (
      <Link className="ob-link" to="/">
        <X size={14} aria-hidden="true" /> {t("start.exit")}
      </Link>
    );
  return (
    <button
      type="button"
      className="ob-link"
      onClick={() => {
        markFirstRunSkipped(user.id);
        navigate("/dashboard", { replace: true });
      }}
    >
      <X size={14} aria-hidden="true" /> {t("start.exit")}
    </button>
  );
}
