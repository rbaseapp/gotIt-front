import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock3,
  Gift,
  Keyboard,
  LoaderCircle,
  Mic,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import moochi from "../assets/ux/dashboard-moohi.png";
import "../first-chat.css";

type Mode = "voice" | "text";

/**
 * The start screen of the first chat, reached from the level check: Moochi is the host,
 * the answer mode is a plain choice, and the warm-up says what it is.
 */
export function FirstChatIntro({
  level,
  minutes,
  mode,
  onMode,
  busy,
  disabled,
  error,
  onStart,
  onWarmup,
}: {
  level: string;
  minutes: number;
  mode: Mode;
  onMode: (mode: Mode) => void;
  busy: boolean;
  disabled: boolean;
  error: string;
  onStart: (event: FormEvent) => void;
  onWarmup: () => void;
}) {
  const { t } = useTranslation();
  const band = level
    ? t(`start.result.band.${level}`, { defaultValue: "" })
    : "";
  return (
    <section className="fci" aria-label={t("start.tutorIntro.lessonTitle")}>
      <div className="fci-hero">
        <form className="fci-ctl" onSubmit={onStart}>
          {band && (
            <span className="fci-level">
              <span dir="ltr">{level}</span> · {band}
              <small>{t("start.tutorIntro.level")}</small>
            </span>
          )}
          <div className="fci-chips">
            <span>
              <Clock3 size={18} aria-hidden="true" />
              {t("privateLesson.durationMinutes", { count: minutes })}
            </span>
            <span>
              <Gift size={18} aria-hidden="true" />
              {t("start.tutorIntro.pocket")}
            </span>
          </div>
          <div className="fci-how" role="group" aria-labelledby="fci-how">
            <b id="fci-how">{t("start.tutorIntro.howLabel")}</b>
            <div className="fci-seg">
              <button
                type="button"
                aria-pressed={mode === "voice"}
                onClick={() => onMode("voice")}
              >
                <Mic size={18} aria-hidden="true" />
                {t("start.tutorIntro.voice")}
              </button>
              <button
                type="button"
                aria-pressed={mode === "text"}
                onClick={() => onMode("text")}
              >
                <Keyboard size={18} aria-hidden="true" />
                {t("start.tutorIntro.text")}
              </button>
            </div>
            <small>{t("start.tutorIntro.howHint")}</small>
          </div>
          <button className="fci-go" type="submit" disabled={disabled || busy}>
            {busy ? (
              <LoaderCircle className="spin" size={20} aria-hidden="true" />
            ) : (
              <Sparkles size={20} aria-hidden="true" />
            )}
            {busy
              ? t("privateLesson.preparing")
              : t("start.tutorIntro.start", { count: minutes })}
          </button>
          {busy && (
            <p className="fci-wait" role="status">
              {t("start.tutorIntro.waitHint")}
            </p>
          )}
          {error && (
            <p className="fci-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="fci-warm"
            type="button"
            disabled={disabled || busy}
            onClick={onWarmup}
          >
            <span>
              <b>{t("start.tutorIntro.warmTitle")}</b>
              <small>{t("start.tutorIntro.warmBody")}</small>
            </span>
          </button>
        </form>
        <aside className="fci-teacher">
          <span className="fci-pic">
            <img src={moochi} alt="" draggable={false} />
          </span>
          <b>{t("start.tutorIntro.teacherName")}</b>
          <span className="fci-ready">
            <i aria-hidden="true" />
            {t("start.tutorIntro.teacherReady")}
          </span>
        </aside>
      </div>
      <article className="fci-end">
        <h2>{t("start.tutorIntro.endTitle")}</h2>
        <ul>
          <li>{t("start.tutorIntro.end1")}</li>
          <li>{t("start.tutorIntro.end2")}</li>
        </ul>
      </article>
      <p className="fci-note">
        <ShieldCheck size={16} aria-hidden="true" />
        {t("start.tutorIntro.noScoreNote")}
      </p>
    </section>
  );
}
