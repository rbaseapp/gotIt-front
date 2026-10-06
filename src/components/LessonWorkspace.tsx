import { useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  LoaderCircle,
  MicOff,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";
import { Modal } from "./Modal";
import { TeacherAvatar } from "./TeacherAvatar";
import type {
  LessonActivity,
  PrivateLessonSession,
} from "../lib/privateLesson";
import teacherFemale from "../assets/ux/lesson-teacher-female.png";
import teacherMale from "../assets/ux/lesson-teacher-male.png";
import bookIcon from "../assets/ux/lesson-book.svg";
import chatIcon from "../assets/ux/lesson-chat.svg";
import micIcon from "../assets/ux/lesson-mic.svg";
import smallMicIcon from "../assets/ux/lesson-mic-small.svg";
import keyboardIcon from "../assets/ux/lesson-keyboard.svg";
import helpIcon from "../assets/ux/lesson-help.svg";
import pauseIcon from "../assets/ux/lesson-pause.svg";
import replayIcon from "../assets/ux/lesson-replay.svg";
import bubbleTail from "../assets/ux/lesson-bubble-tail.svg";

type Props = {
  lesson: PrivateLessonSession["lesson"];
  activity: LessonActivity;
  remaining: number;
  status: string;
  audioLevel: number;
  busy: boolean;
  ready: boolean;
  microphoneMuted: boolean;
  inputMode: "voice" | "text";
  error: string;
  translatedTurn?: string;
  onAnswer: (answer: string) => Promise<boolean>;
  onReview?: (answer: string) => Promise<boolean>;
  onAction: (action: "hint" | "continue") => void;
  onMicrophone: () => void;
  onReplay: (rate: number) => void;
  onTranslate: () => void;
  onPause: (paused: boolean) => void;
  onFinish: () => void;
};

export function LessonWorkspace(p: Props) {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<
    "text" | "help" | "pause" | "exit" | "review" | "edit" | "reviewed" | null
  >(null);
  const [draft, setDraft] = useState("");
  const [correction, setCorrection] = useState("");
  const conversation = p.activity.interactionMode === "conversation";
  const transcript = useRef<HTMLDetailsElement>(null);
  const learnerTurn = p.activity.turns
    .slice()
    .reverse()
    .find((turn) => turn.role === "learner");
  const stage = ["learn", "try", "chat"].indexOf(p.activity.stage) + 1;
  return (
    <section
      className={`lesson-session${conversation ? " conversation-session" : ""}`}
      role="dialog"
      aria-label={t("privateLesson.title")}
      data-figma-desktop={conversation ? "43:6367" : "43:6258"}
      data-figma-mobile={conversation ? "44:8582" : "44:8518"}
    >
      <header className="lesson-session-header">
        <Logo />
        {!conversation && (
          <nav className="lesson-stages" aria-label={t("lessonUi.stages")}>
            {([bookIcon, smallMicIcon, chatIcon] as const).map(
              (icon, index) => (
                <div
                  className={
                    index + 1 === stage
                      ? "current"
                      : index + 1 < stage
                        ? "complete"
                        : ""
                  }
                  aria-current={index + 1 === stage ? "step" : undefined}
                  key={index}
                >
                  <span>
                    <img src={icon} alt="" width={32} height={32} />
                  </span>
                  <strong>{t(`lessonUi.stage${index + 1}`)}</strong>
                </div>
              ),
            )}
          </nav>
        )}
        {conversation && (
          <strong className="lesson-chat-heading">{t("ux.freeChat")}</strong>
        )}
        <div className="lesson-session-tools">
          <button
            type="button"
            className="lesson-pause"
            aria-label={t("lessonUi.pause")}
            onClick={() => {
              p.onPause(true);
              setPanel("pause");
            }}
          >
            <img src={pauseIcon} alt="" width={24} height={24} />
          </button>
          <button
            type="button"
            className="lesson-exit"
            onClick={() => setPanel("exit")}
          >
            <ChevronLeft size={24} />
            {t("lessonUi.finish")}
          </button>
          <time aria-label={t("privateLesson.timerLabel")}>
            {Math.floor(p.remaining / 60)}:
            {String(p.remaining % 60).padStart(2, "0")}
          </time>
        </div>
        <p className="lesson-header-context" dir="auto">
          {p.lesson.wordPack
            ? `${t("englishPath.unit", { number: p.lesson.wordPack.moduleNumber })} · `
            : ""}
          {p.lesson.topic}
        </p>
      </header>
      <main className="lesson-session-content">
        <div className="lesson-teacher-profile">
          <TeacherAvatar
            variant={p.lesson.teacherVoice}
            referencePortrait={
              p.lesson.teacherVoice === "female" ? teacherFemale : teacherMale
            }
            activity={p.busy ? "thinking" : "listening"}
            active={p.ready}
            audioLevel={p.audioLevel}
            label={p.status}
          />
          <span>
            {t(`privateLesson.voiceOptions.${p.lesson.teacherVoice}`)} ·{" "}
            {t("lessonUi.aiTeacher")}
          </span>
        </div>
        {!conversation && (
          <p className="lesson-stage-caption">
            {t("lessonUi.stageCaption", {
              stage,
              title: t(`lessonUi.stage${stage}`),
            })}
          </p>
        )}
        <section
          className="lesson-tutor-turn"
          aria-live="polite"
          aria-busy={p.busy}
        >
          <img
            className="lesson-bubble-tail"
            src={bubbleTail}
            alt=""
            aria-hidden="true"
          />
          <div>
            <h1 dir="auto">
              {p.activity.title || t(`lessonUi.heading${stage}`)}
            </h1>
            <p dir="auto">
              {p.activity.tutorText.length > 400
                ? p.activity.question
                : p.activity.tutorText}
            </p>
            {p.activity.tutorText.length > 400 && (
              <details className="lesson-full-instruction">
                <summary>{t("lessonUi.fullInstruction")}</summary>
                <p dir="auto">{p.activity.tutorText}</p>
              </details>
            )}
          </div>
          <button
            type="button"
            className="lesson-desktop-replay"
            disabled={p.busy || !p.ready}
            onClick={() => p.onReplay(1)}
          >
            <span>
              <img src={replayIcon} alt="" width={32} height={32} />
            </span>
            {t("ux.replay")}
          </button>
          {p.busy && (
            <LoaderCircle
              className="spin lesson-thinking"
              size={24}
              aria-label={p.status}
            />
          )}
        </section>
        <div className="lesson-mobile-replays">
          <button
            className="button secondary"
            disabled={p.busy || !p.ready}
            onClick={() => p.onReplay(1)}
          >
            {t("lessonUi.replay")}
          </button>
          <button
            className="button secondary"
            disabled={p.busy || !p.ready}
            onClick={() => p.onReplay(0.65)}
          >
            {t("lessonUi.slow")}
          </button>
          <button className="button secondary" onClick={() => setPanel("help")}>
            {t("lessonUi.help")}
          </button>
        </div>
        {p.translatedTurn && (
          <details className="lesson-translation" open>
            <summary>{t("privateLesson.translateLast")}</summary>
            <p dir="auto" lang={p.lesson.supportLanguageCode ?? undefined}>
              {p.translatedTurn}
            </p>
          </details>
        )}
        {p.activity.example && (
          <section className="lesson-example">
            <h2>
              <BookOpen size={29} />
              {t("lessonUi.example")}
            </h2>
            <button
              className="lesson-example-history"
              type="button"
              onClick={() => {
                if (transcript.current) {
                  transcript.current.open = true;
                  transcript.current.scrollIntoView({ block: "center" });
                  transcript.current.querySelector("summary")?.focus();
                }
              }}
            >
              <ChevronDown size={18} />
              {t("lessonUi.previousExample")}
            </button>
            <p lang={p.lesson.targetLanguageCode} dir="auto">
              {p.activity.example.targetText}
            </p>
            <small dir="auto">{p.activity.example.meaningAndReason}</small>
          </section>
        )}
        {!conversation && p.lesson.targetWords.length > 0 && (
          <div className="lesson-word-pill" dir="auto">
            {p.lesson.targetWords[0].sourceText} ·{" "}
            {p.lesson.targetWords[0].translationText}
          </div>
        )}
        <p className="lesson-response-caption">{t("lessonUi.voiceOrText")}</p>
        {conversation && learnerTurn && (
          <p className="lesson-last-answer" dir="auto">
            <strong>{t("privateLesson.roles.learner")}</strong>
            {learnerTurn.text}
          </p>
        )}
        <div className="lesson-input-actions">
          <button
            className="lesson-text-action"
            type="button"
            disabled={!p.ready || p.busy}
            onClick={() => setPanel("text")}
          >
            <span>
              <img src={keyboardIcon} alt="" width={40} height={40} />
            </span>
            {t("lessonUi.answerText")}
          </button>
          <div className="lesson-microphone-action">
            <button
              className={`lesson-microphone${!p.microphoneMuted && p.inputMode === "voice" ? " recording" : ""}`}
              type="button"
              disabled={!p.ready || p.busy}
              aria-pressed={!p.microphoneMuted && p.inputMode === "voice"}
              aria-label={t(
                !p.microphoneMuted && p.inputMode === "voice"
                  ? "lessonUi.stopSpeaking"
                  : "lessonUi.speak",
              )}
              onClick={p.onMicrophone}
            >
              {p.busy ? (
                <LoaderCircle className="spin" size={40} />
              ) : !p.microphoneMuted && p.inputMode === "voice" ? (
                <MicOff size={44} />
              ) : (
                <img src={micIcon} alt="" width={60} height={60} />
              )}
            </button>
            <strong>
              {t(
                !p.microphoneMuted && p.inputMode === "voice"
                  ? "lessonUi.stopSpeaking"
                  : "lessonUi.speak",
              )}
            </strong>
          </div>
          <button
            className="lesson-help-action"
            type="button"
            onClick={() => setPanel("help")}
          >
            <span>
              <img src={helpIcon} alt="" width={44} height={44} />
            </span>
            {t("lessonUi.helpWhenNeeded")}
          </button>
        </div>
        <button
          type="button"
          className="button secondary lesson-mobile-text"
          disabled={!p.ready || p.busy}
          onClick={() => setPanel("text")}
        >
          {t("lessonUi.answerText")}
        </button>
        {p.error && (
          <p className="form-error" role="alert">
            {p.error}
          </p>
        )}
        <div className="lesson-secondary-controls">
          <button
            className="button secondary"
            onClick={() => {
              p.onPause(true);
              setPanel("pause");
            }}
          >
            {t("lessonUi.pause")}
          </button>
          <button className="button ghost" onClick={() => setPanel("exit")}>
            {t("lessonUi.finish")}
          </button>
        </div>
        <p className="lesson-reassurance">{t("lessonUi.takeYourTime")}</p>
        <details className="lesson-conversation" ref={transcript}>
          <summary>{t("ux.fullConversation")}</summary>
          {p.activity.turns.map((turn, index) => (
            <p dir="auto" className={turn.role} key={index}>
              <strong>{t(`privateLesson.roles.${turn.role}`)}: </strong>
              {turn.text}
            </p>
          ))}
        </details>
      </main>
      <Modal
        open={panel === "text"}
        onClose={() => setPanel(null)}
        title={t("lessonUi.answerText")}
      >
        <form
          className="modal-body form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            void p.onAnswer(draft).then((saved) => {
              if (saved) {
                setDraft("");
                setPanel(null);
              }
            });
          }}
        >
          <p dir="auto">{p.activity.question}</p>
          <label className="field">
            <span>{t("lessonUi.yourAnswer")}</span>
            <textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              maxLength={1500}
              dir="auto"
            />
          </label>
          {p.error && (
            <p role="alert" className="form-error">
              {p.error}
            </p>
          )}
          <button
            className="button primary"
            disabled={!draft.trim() || p.busy || !p.ready}
          >
            {p.busy ? <LoaderCircle size={18} className="spin" /> : null}
            {t("lessonUi.send")}
          </button>
        </form>
      </Modal>
      <Modal
        open={panel === "help"}
        onClose={() => setPanel(null)}
        title={t("lessonUi.help")}
      >
        <div className="modal-body form-stack">
          <button
            className="button secondary"
            disabled={p.busy || !p.ready}
            onClick={() => {
              p.onAction("hint");
              setPanel(null);
            }}
          >
            {t("lessonUi.hint")}
          </button>
          {p.lesson.supportLanguageCode && (
            <button
              className="button secondary"
              disabled={p.busy || !p.ready}
              onClick={() => {
                p.onTranslate();
                setPanel(null);
              }}
            >
              {t("privateLesson.translateLast")}
            </button>
          )}
          <button
            className="button secondary"
            disabled={p.busy || !p.ready}
            onClick={() => {
              p.onReplay(0.65);
              setPanel(null);
            }}
          >
            {t("ux.replaySlow")}
          </button>
          {p.activity.lastAnswer && p.onReview && (
            <button
              type="button"
              className="button secondary"
              disabled={p.busy}
              onClick={() => {
                setCorrection(p.activity.lastAnswer!.answer);
                setPanel("review");
              }}
            >
              {t("lessonReview.title")}
            </button>
          )}
          {p.activity.stage !== "chat" && (
            <button
              className="button ghost"
              disabled={p.busy || !p.ready}
              onClick={() => {
                p.onAction("continue");
                setPanel(null);
              }}
            >
              {t("lessonUi.moveOn")}
            </button>
          )}
        </div>
      </Modal>
      <Modal
        className="lesson-review-modal"
        size="lg"
        open={panel === "review" || panel === "edit" || panel === "reviewed"}
        onClose={() => setPanel(null)}
        title={t(
          panel === "edit"
            ? "lessonReview.editTitle"
            : panel === "reviewed"
              ? "lessonReview.received"
              : "lessonReview.title",
        )}
      >
        <div
          className="modal-body canonical-page"
          data-figma-desktop={
            panel === "edit"
              ? "43:7449"
              : panel === "reviewed"
                ? "43:7482"
                : "43:7412"
          }
        >
          <p>{t("lessonReview.sameAttempt")}</p>
          {panel === "review" && (
            <section className="ux-card">
              <h2>{t("lessonReview.captured")}</h2>
              <p dir="auto">{p.activity.lastAnswer?.answer}</p>
              <p dir="auto">{p.activity.lastAnswer?.question}</p>
              <button
                className="button primary"
                onClick={() => setPanel("edit")}
              >
                {t("lessonReview.edit")}
              </button>
              <button
                className="button secondary"
                disabled={p.busy}
                onClick={() =>
                  void p.onReview?.(correction).then((saved) => {
                    if (saved) setPanel("reviewed");
                  })
                }
              >
                {t("lessonReview.check")}
              </button>
            </section>
          )}
          {panel === "edit" && (
            <form
              className="ux-card"
              onSubmit={(event) => {
                event.preventDefault();
                void p.onReview?.(correction).then((saved) => {
                  if (saved) setPanel("reviewed");
                });
              }}
            >
              <label className="field">
                <span>{t("lessonReview.corrected")}</span>
                <textarea
                  dir="auto"
                  rows={3}
                  value={correction}
                  maxLength={1500}
                  onChange={(event) => setCorrection(event.target.value)}
                />
              </label>
              <button
                className="button primary"
                disabled={p.busy || !correction.trim()}
              >
                {t("lessonReview.submit")}
              </button>
            </form>
          )}
          {panel === "reviewed" && (
            <section className="ux-card mint">
              <h2>{t("lessonReview.canContinue")}</h2>
              <p dir="auto">{p.activity.review?.feedback}</p>
              <p>{t("lessonReview.originalPreserved")}</p>
              <button className="button primary" onClick={() => setPanel(null)}>
                {t("lessonUi.resume")}
              </button>
              <details>
                <summary>{t("lessonReview.details")}</summary>
                <p dir="auto">{p.activity.review?.originalAnswer}</p>
                <p dir="auto">{p.activity.review?.correctedAnswer}</p>
              </details>
            </section>
          )}
          <p>{t("lessonReview.noAchievement")}</p>
          {p.error && (
            <p role="alert" className="form-error">
              {p.error}
            </p>
          )}
        </div>
      </Modal>
      <Modal
        open={panel === "pause"}
        onClose={() => {
          p.onPause(false);
          setPanel(null);
        }}
        title={t("lessonUi.paused")}
      >
        <div className="modal-body form-stack">
          <p>{t("lessonUi.pausePolicy")}</p>
          <button
            className="button primary"
            onClick={() => {
              p.onPause(false);
              setPanel(null);
            }}
          >
            {t("lessonUi.resume")}
          </button>
          <button
            className="button ghost"
            onClick={() => {
              setPanel(null);
              p.onFinish();
            }}
          >
            {t("lessonUi.finish")}
          </button>
        </div>
      </Modal>
      <Modal
        open={panel === "exit"}
        onClose={() => setPanel(null)}
        title={t("lessonUi.exitTitle")}
      >
        <div className="modal-body form-stack">
          <p>{t("lessonUi.exitDescription")}</p>
          <button
            className="button primary"
            disabled={p.busy}
            onClick={() => {
              setPanel(null);
              p.onFinish();
            }}
          >
            {t("lessonUi.finishAndSave")}
          </button>
          <button className="button secondary" onClick={() => setPanel(null)}>
            {t("lessonUi.stay")}
          </button>
        </div>
      </Modal>
    </section>
  );
}
