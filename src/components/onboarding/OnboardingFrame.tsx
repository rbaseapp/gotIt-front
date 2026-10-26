import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Volume2, VolumeX, X } from "lucide-react";
import logoUrl from "../../assets/gotit-logo.svg";
import moochi from "../../assets/ux/dashboard-moohi.png";
import rachel from "../../assets/private-lesson/tutor-female-speaking-wide.png";
import { useAvatarVoice } from "../../lib/onboarding/avatarVoice";
import { loadOnboarding } from "../../lib/onboarding/state";
import { useApp } from "../../context/AppContext";
import { STEPS as ALL_STEPS, type Step } from "../../lib/onboarding/state";

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
  voiceText,
  voiceLang,
}: {
  step: Step;
  title: ReactNode;
  body?: ReactNode;
  children: ReactNode;
  primary?: ReactNode;
  secondary?: ReactNode;
  onBack?: () => void;
  hideMoochi?: boolean;
  /** What Rachel says aloud when it differs from the caption (e.g. an English question). */
  voiceText?: string;
  voiceLang?: string;
}) {
  const { t, i18n } = useTranslation();
  // A learner who is already signed in does not pick a language first.
  const { user } = useApp();
  const STEPS: readonly Step[] = user
    ? ALL_STEPS.filter((name) => name !== "language")
    : ALL_STEPS;
  const index = Math.max(1, STEPS.indexOf(step) + 1);
  // Signed in: Rachel asks the questions and the screen below is her board.
  const avatar = Boolean(user);
  const line =
    voiceText ??
    (typeof title === "string"
      ? typeof body === "string"
        ? `${title}. ${body}`
        : title
      : null);
  const voice = useAvatarVoice(avatar ? line : null, {
    auto: loadOnboarding()?.answerMode === "voice",
    language: voiceLang ?? i18n.resolvedLanguage ?? "en",
  });
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
        <span className="ob-trial">{t("start.trialBadge")}</span>
      </header>
      <main className="ob-main">
        <div className="ob-head">
          <div className="ob-bubble">
            <h1 tabIndex={-1} data-ob-title>
              {title}
            </h1>
            {body && <p>{body}</p>}
          </div>
          {avatar ? (
            <div className="ob-avatar-wrap">
              <div
                className="ob-avatar"
                data-speaking={voice.speaking || undefined}
              >
                <img src={rachel} alt="" draggable={false} />
              </div>
              {voice.available && (
                <span className="ob-avatar-controls">
                  <button
                    type="button"
                    className="ob-link"
                    aria-label={t("start.avatar.replay")}
                    onClick={voice.replay}
                  >
                    <Volume2 size={14} aria-hidden="true" />{" "}
                    {t("start.avatar.replay")}
                  </button>
                  <button
                    type="button"
                    className="ob-link"
                    aria-pressed={voice.muted}
                    onClick={voice.toggleMute}
                  >
                    {voice.muted ? (
                      <VolumeX size={14} aria-hidden="true" />
                    ) : null}
                    {voice.muted
                      ? t("start.avatar.unmute")
                      : t("start.avatar.mute")}
                  </button>
                </span>
              )}
            </div>
          ) : (
            !hideMoochi && (
              <img
                className="ob-moochi"
                src={moochi}
                alt=""
                draggable={false}
              />
            )
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
            <Link className="ob-link" to="/">
              <X size={14} aria-hidden="true" /> {t("start.exit")}
            </Link>
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
