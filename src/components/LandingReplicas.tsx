/**
 * Static replicas of real GotIt screens for the landing page. Each one reuses
 * the real markup, class names and translation keys of the screen it copies, so
 * it inherits the app's own CSS and works in every UI language. Nothing here is
 * interactive: the replicas are illustrations wrapped in aria-hidden containers.
 */
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Check, GripVertical, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoUrl from "../assets/gotit-logo.svg";
import tutorListening from "../assets/private-lesson/tutor-female-listening.png";
import tutorBlink from "../assets/private-lesson/tutor-female-blink.png";
import "../landing-extension.css";

/**
 * Renders children at a fixed design width and scales them down to fit the
 * available space, so desktop-sized screens stay legible as thumbnails.
 */
export function ScaledScreen({
  width,
  maxHeight,
  children,
  className = "",
}: {
  width: number;
  /** Also shrink to fit this height, in CSS pixels. */
  maxHeight?: number;
  children: ReactNode;
  className?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, width: 0, height: 0 });
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || !("ResizeObserver" in window)) return;
    const update = () => {
      const scale = Math.min(
        1,
        outer.clientWidth / width,
        maxHeight ? maxHeight / inner.offsetHeight : 1,
      );
      setBox({
        scale,
        width: width * scale,
        height: inner.offsetHeight * scale,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    update();
    return () => observer.disconnect();
  }, [width, maxHeight]);
  return (
    <div
      ref={outerRef}
      className={`scaled-screen ${className}`}
      style={{
        height: box.height || undefined,
        maxWidth: box.width || undefined,
      }}
    >
      <div
        ref={innerRef}
        className="scaled-screen-inner"
        style={{ width, transform: `scale(${box.scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

/** The extension's inline translation panel (gotIt-chrome content script). */
export function ExtensionPanel({ saved }: { saved: boolean }) {
  const { t, i18n } = useTranslation();
  const target = (i18n.resolvedLanguage ?? "en").toUpperCase();
  return (
    <section className="ext-panel" dir={i18n.dir()}>
      <div className="head">
        <div className="term-wrap">
          <span className="close">
            <svg viewBox="0 0 24 24">
              <path
                d="M5 5l14 14M19 5L5 19"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div className="term" lang="en">
            thrive
          </div>
        </div>
        <div className="brand">
          <img className="logo-lockup" src={logoUrl} alt="" />
        </div>
      </div>
      <div className="method-switch">
        <span className="method google" aria-pressed="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M4 5h10M9 3v2c0 4-2 7-5 9M6 10c1.5 2 3.4 3.5 5.8 4.4M14 10l4 10M12.5 16h7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Google</span>
        </span>
        <span className="method ai">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 3l1.45 4.05L17.5 8.5l-4.05 1.45L12 14l-1.45-4.05L6.5 8.5l4.05-1.45L12 3Zm6 10 .9 2.1L21 16l-2.1.9L18 19l-.9-2.1L15 16l2.1-.9L18 13Z"
              fill="currentColor"
            />
          </svg>
          <span>{t("landing.ext.translateAi")}</span>
        </span>
      </div>
      <div className="body">
        {saved && <div className="saved">{t("landing.ext.wordSaved")}</div>}
        <div className="translation-row">
          <div className="translation-copy">
            <div className="translation">{t("landing.demo.translation")}</div>
            <div className="lexical">{t("landing.sample.partOfSpeech")}</div>
          </div>
          <div className="translation-actions">
            <span
              className={`round-action labeled-action save-action ${
                saved ? "remove-action" : "primary-action"
              }`}
            >
              <svg viewBox="0 0 24 24">
                <path
                  d="M5 4h12l2 2v14H5V4Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 4v6h8V4M8 20v-6h8v6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              <span>
                {saved
                  ? t("landing.ext.removeShort")
                  : t("landing.ext.saveShort")}
              </span>
            </span>
            <span className="round-action labeled-action">
              <svg viewBox="0 0 24 24">
                <path
                  d="m5 16.5-.8 3.3 3.3-.8L18 8.5 15.5 6 5 16.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="m13.8 7.7 2.5 2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
              <span>{t("landing.ext.edit")}</span>
            </span>
            <span className="round-action speak">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4 10v4h3.2l4.3 3.5v-11L7.2 10H4Z"
                  fill="currentColor"
                />
                <path
                  d="M15 9.2a4 4 0 010 5.6M17.7 6.7a7.5 7.5 0 010 10.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>
        </div>
        <div className="explanation">
          <div className="explanation-label">
            <span className="spark">●</span>
            <span>{t("landing.ext.shortDescription")}</span>
          </div>
          <p>{t("landing.sample.explanation")}</p>
        </div>
        <div className="meta">Google Translate · EN → {target}</div>
      </div>
      <aside className="practice-invite">
        <div>
          <strong>{t("landing.ext.practiceTitle")}</strong>
          <p>{t("landing.ext.practiceDescription")}</p>
        </div>
        <span>{t("landing.ext.practiceAction")}</span>
      </aside>
    </section>
  );
}

/**
 * The real meaning-matching board (LiveDragDropBoard) mid-game: two meanings
 * placed, the last one picked up from the bank.
 */
export function MatchingBoard() {
  const { t } = useTranslation();
  const rows = [
    { word: "subtle", meaning: t("landing.sample.subtle"), placed: true },
    { word: "wander", meaning: t("landing.sample.wander"), placed: true },
    { word: "thrive", meaning: t("landing.demo.translation"), placed: false },
  ];
  return (
    <div className="exercise-area replica-board">
      <div className="live-drag-drop">
        <div className="drag-drop-intro">
          <span className="drag-drop-symbol">
            <Sparkles size={22} />
          </span>
          <div>
            <h1>{t("game.dragDropTitle")}</h1>
            <p>{t("game.dragDropDraftHelp")}</p>
          </div>
          <strong>
            {t("game.dragDropProgress", { current: 2, total: 3 })}
          </strong>
        </div>
        <div className="drag-drop-layout">
          <div className="drag-drop-rows">
            {rows.map((row, index) => (
              <article
                className={`drag-drop-row${row.placed ? " is-filled" : ""}`}
                key={row.word}
              >
                <span className="drag-drop-number">{index + 1}</span>
                <b className="drag-drop-word" lang="en">
                  {row.word}
                </b>
                {row.placed ? (
                  <span className="drag-drop-slot has-card">
                    <GripVertical size={17} />
                    <span dir="auto">{row.meaning}</span>
                  </span>
                ) : (
                  <span className="drag-drop-slot is-ready">
                    <span className="drop-placeholder">
                      <span>+</span>
                      {t("game.dropHere")}
                    </span>
                  </span>
                )}
              </article>
            ))}
          </div>
          <section className="meaning-bank">
            <div className="meaning-bank-heading">
              <span>{t("game.meaningsBank")}</span>
              <small>{t("game.meaningsBankDraftHelp")}</small>
            </div>
            <div className="meaning-cards">
              {rows.map((row) => (
                <span
                  className={`meaning-card ${row.placed ? "is-resolved" : "is-selected"}`}
                  key={row.word}
                >
                  <GripVertical size={18} />
                  <span>{row.meaning}</span>
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** The private lesson tutor stage (TeacherAvatar) with the end-of-lesson report. */
export function LessonRoom() {
  const { t } = useTranslation();
  return (
    <div className="replica-lesson">
      <div className="private-lesson-tutor-stage">
        <div
          className="teacher-avatar female listening active"
          style={
            {
              "--tutor-ring-size": "9px",
              "--tutor-ring-alpha": 0.12,
              "--tutor-ring-scale": 1.01,
            } as CSSProperties
          }
        >
          <span className="teacher-avatar-ring" />
          <span className="teacher-avatar-portrait">
            <img src={tutorListening} alt="" loading="lazy" decoding="async" />
            <img
              className="teacher-avatar-blink"
              src={tutorBlink}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </span>
        </div>
        <div className="private-lesson-tutor-caption">
          <strong>{t("privateLesson.voiceOptions.female")}</strong>
          <span>{t("privateLesson.connected")}</span>
        </div>
      </div>
      <div className="private-lesson-report">
        <section className="private-lesson-report-summary">
          <p className="eyebrow">{t("privateLesson.report.title")}</p>
          <ul className="lesson-report-highlights">
            <li>
              <Check size={17} />
              <span>{t("landing.sample.strength1")}</span>
            </li>
            <li>
              <Check size={17} />
              <span>{t("landing.sample.strength2")}</span>
            </li>
          </ul>
          <p>
            <strong>{t("courses.oneFocus")}</strong>{" "}
            <span>{t("landing.sample.focus")}</span>
          </p>
          <p>
            <strong>{t("privateLesson.report.next")}</strong>{" "}
            <span>{t("landing.sample.next")}</span>
          </p>
        </section>
      </div>
    </div>
  );
}

/** A generated article as LiveReadingPage shows it. */
export function ReadingArticle() {
  const { t } = useTranslation();
  const word = (text: string) => <span className="reading-word">{text}</span>;
  return (
    <div className="reading-page replica-reading">
      <article className="live-panel live-reading">
        <p className="eyebrow">en · B1</p>
        <h2 lang="en" dir="ltr">
          Why some small shops thrive
        </h2>
        <div className="live-reading-body" dir="ltr" lang="en">
          On a quiet street, a tiny bakery has more {word("regulars")} than the
          chain store next door. The owner says the secret is a {word("cozy")}{" "}
          room and bread that is still warm at seven. That is how small places{" "}
          {word("thrive")}.
        </div>
        <p>{t("reading.noXp")}</p>
        <span className="button primary">{t("reading.practiceWords")}</span>
      </article>
    </div>
  );
}
