import { useLayoutEffect, useRef, useState } from "react";
import { LoaderCircle, MicOff } from "lucide-react";
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
import bookIcon from "../assets/lesson-v3/book.svg";
import bookSmallIcon from "../assets/lesson-v3/book-small.svg";
import micIcon from "../assets/lesson-v3/mic.svg";
import micStageIcon from "../assets/lesson-v3/mic-stage.svg";
import micStatusIcon from "../assets/lesson-v3/mic-status.svg";
import keyboardIcon from "../assets/lesson-v3/keyboard.svg";
import pauseIcon from "../assets/lesson-v3/pause.svg";
import replayIcon from "../assets/lesson-v3/replay.svg";
import globeIcon from "../assets/lesson-v3/globe.svg";
import globeSmallIcon from "../assets/lesson-v3/globe-small.svg";
import checkIcon from "../assets/lesson-v3/check.svg";
import sendIcon from "../assets/lesson-v3/send.svg";
import "../lesson-room.css";

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
  onInputMode: (mode: "voice" | "text") => void;
  onMicrophone: () => void;
  onReplay: (rate: number) => void;
  onTranslate: () => void;
  onPause: (paused: boolean) => void;
  onFinish: () => void;
};

export function LessonWorkspace(p: Props) {
  const { t, i18n } = useTranslation();
  const [panel, setPanel] = useState<
    "help" | "pause" | "exit" | "review" | "edit" | "reviewed" | null
  >(null);
  const [draft, setDraft] = useState("");
  const [correction, setCorrection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submission = useRef(false);
  const history = useRef<HTMLDivElement>(null);
  const followHistory = useRef(true);
  const answerField = useRef<HTMLTextAreaElement>(null);
  const conversation = p.activity.interactionMode === "conversation";
  const stage = ["learn", "try", "chat"].indexOf(p.activity.stage) + 1;
  const teacherName = t(`privateLesson.voiceOptions.${p.lesson.teacherVoice}`);
  const voiceActive = p.inputMode === "voice" && !p.microphoneMuted;
  const unavailable = p.busy || !p.ready || submitting || panel !== null;
  const lastTurn = p.activity.turns.at(-1);
  const messages =
    lastTurn?.role === "tutor" && lastTurn.text === p.activity.tutorText
      ? p.activity.turns
      : [
          ...p.activity.turns,
          { role: "tutor" as const, text: p.activity.tutorText },
        ];
  const lastMessage = messages.at(-1)?.text;
  const locale = i18n.resolvedLanguage ?? "en";
  const targetLanguage =
    new Intl.DisplayNames([locale], { type: "language" }).of(
      p.lesson.targetLanguageCode,
    ) ?? p.lesson.targetLanguageCode;
  const teacherState = !p.ready
    ? "connecting"
    : p.audioLevel > 0.025
      ? "speaking"
      : p.busy
        ? "thinking"
        : "listening";

  useLayoutEffect(() => {
    if (history.current && followHistory.current)
      history.current.scrollTop = history.current.scrollHeight;
  }, [lastMessage, messages.length, p.translatedTurn]);

  const submit = async () => {
    if (unavailable || submission.current || !draft.trim()) return;
    submission.current = true;
    setSubmitting(true);
    try {
      if (await p.onAnswer(draft)) {
        setDraft("");
        followHistory.current = true;
        answerField.current?.focus();
      }
    } finally {
      submission.current = false;
      setSubmitting(false);
    }
  };

  return (
    <section
      className="lesson-session lesson-room"
      role="dialog"
      aria-label={t("privateLesson.title")}
      data-figma-desktop={p.inputMode === "text" ? "129:1240" : "129:1241"}
      data-figma-mobile="129:1242"
    >
      <header className="lesson-room-header">
        <div className="lesson-room-tools">
          <time
            className="lesson-room-timer"
            aria-label={t("privateLesson.timerLabel")}
            dir="ltr"
          >
            {Math.floor(Math.max(0, p.remaining) / 60)}:
            {String(Math.max(0, p.remaining) % 60).padStart(2, "0")}
          </time>
          <button
            type="button"
            className="lesson-room-action lesson-room-exit"
            onClick={() => setPanel("exit")}
          >
            {t("lessonUi.finish")}
          </button>
          <button
            type="button"
            className="lesson-room-action outlined lesson-room-pause"
            aria-label={t("lessonUi.pause")}
            onClick={() => {
              p.onPause(true);
              setPanel("pause");
            }}
          >
            <img src={pauseIcon} alt="" />
            <span>{t("lessonUi.pause")}</span>
          </button>
        </div>
        <div className="lesson-room-topic">
          <h1 dir="auto">{p.lesson.topic}</h1>
          <p>
            {t("privateLesson.title")}
            {p.lesson.wordPack
              ? ` · ${t("englishPath.unit", { number: p.lesson.wordPack.moduleNumber })}`
              : ""}
            {conversation
              ? ` · ${t("ux.freeChat")}`
              : ` · ${t("lessonUi.stageCaption", { stage, title: t(`lessonUi.stage${stage}`) })}`}
          </p>
        </div>
        <Logo
          onClick={(event) => {
            event.preventDefault();
            setPanel("exit");
          }}
        />
      </header>

      <div className="lesson-room-context">
        <div className="lesson-room-chips">
          <span className="lesson-room-chip" title={t("privateLesson.level")}>
            {p.lesson.level}
          </span>
          <span className="lesson-room-chip">
            <img src={globeSmallIcon} alt="" />
            {targetLanguage}
          </span>
          <span className="lesson-room-chip">
            {t(
              `privateLesson.correctionMode.options.${p.lesson.correctionMode}.title`,
            )}
          </span>
          <span className="lesson-room-chip">
            <img src={bookSmallIcon} alt="" />
            {t(conversation ? "ux.freeChat" : "lessonRoom.guided")}
          </span>
        </div>
        {!conversation && (
          <nav className="lesson-room-stages" aria-label={t("lessonUi.stages")}>
            {[1, 2, 3].map((number) => (
              <span
                key={number}
                className={`lesson-room-chip ${number === stage ? "current" : number < stage ? "complete" : "upcoming"}`}
                aria-current={number === stage ? "step" : undefined}
              >
                {number < stage ? (
                  <img src={checkIcon} alt="" />
                ) : number === stage ? (
                  <img src={micStageIcon} alt="" />
                ) : null}
                {t(`lessonUi.stage${number}`)}
              </span>
            ))}
          </nav>
        )}
      </div>

      <main className="lesson-room-workspace">
        <section
          className="lesson-room-conversation"
          aria-label={t("lessonRoom.conversation")}
        >
          <header className="lesson-room-conversation-header">
            <div className="lesson-room-conversation-tools">
              <button
                type="button"
                className="lesson-room-action"
                disabled={unavailable}
                onClick={() => p.onAction("hint")}
              >
                {t("lessonUi.hint")}
              </button>
              {p.lesson.supportLanguageCode && (
                <button
                  type="button"
                  className="lesson-room-action"
                  disabled={unavailable}
                  onClick={p.onTranslate}
                  aria-label={t("privateLesson.translateLast")}
                >
                  <img src={globeIcon} alt="" />
                  <span>{t("lessonRoom.translate")}</span>
                </button>
              )}
              <button
                type="button"
                className="lesson-room-action"
                disabled={unavailable}
                onClick={() => p.onReplay(1)}
                aria-label={t("ux.replay")}
              >
                <img src={replayIcon} alt="" />
                <span>{t("ux.replay")}</span>
              </button>
              <button
                type="button"
                className="lesson-room-action lesson-room-more"
                onClick={() => setPanel("help")}
              >
                {t("lessonUi.helpWhenNeeded")}
              </button>
            </div>
            <h2>
              {t("lessonRoom.conversation")}
              <img src={bookIcon} alt="" />
            </h2>
          </header>

          <div
            className="lesson-room-history"
            ref={history}
            role="log"
            aria-label={t("ux.fullConversation")}
            aria-live="polite"
            aria-relevant="additions text"
            tabIndex={0}
            onScroll={(event) => {
              const element = event.currentTarget;
              followHistory.current =
                element.scrollHeight -
                  element.scrollTop -
                  element.clientHeight <
                72;
            }}
          >
            <p className="lesson-room-history-caption">
              {t("lessonRoom.historyCaption")}
            </p>
            {messages.map((turn, index) => (
              <article className={`lesson-room-turn ${turn.role}`} key={index}>
                <strong>
                  {turn.role === "tutor"
                    ? `${teacherName} · ${t("privateLesson.roles.tutor")}`
                    : t("privateLesson.roles.learner")}
                </strong>
                <p dir="auto">{turn.text}</p>
                {index === messages.length - 1 &&
                  !turn.text.includes(p.activity.question) && (
                    <p className="lesson-room-question" dir="auto">
                      {p.activity.question}
                    </p>
                  )}
              </article>
            ))}
            {p.activity.feedback &&
              !messages.some((turn) =>
                turn.text.includes(p.activity.feedback!),
              ) && (
                <p className="lesson-room-feedback" dir="auto">
                  {p.activity.feedback}
                </p>
              )}
            {p.translatedTurn && (
              <details className="lesson-room-translation" open>
                <summary>{t("privateLesson.translateLast")}</summary>
                <p dir="auto" lang={p.lesson.supportLanguageCode ?? undefined}>
                  {p.translatedTurn}
                </p>
              </details>
            )}
            {p.activity.example && (
              <details
                className="lesson-room-example"
                open={p.activity.stage === "learn" || undefined}
              >
                <summary>{t("lessonUi.example")}</summary>
                <p dir="auto" lang={p.lesson.targetLanguageCode}>
                  {p.activity.example.targetText}
                </p>
                <small dir="auto">{p.activity.example.meaningAndReason}</small>
              </details>
            )}
            {p.busy && (
              <p className="lesson-room-processing" role="status">
                <LoaderCircle className="spin" size={16} />
                {t("lessonRoom.thinking")}
              </p>
            )}
          </div>

          <div className="lesson-room-composer">
            <div
              className="lesson-room-modes"
              role="group"
              aria-label={t("lessonUi.answerMode")}
            >
              <button
                type="button"
                aria-pressed={p.inputMode === "voice"}
                disabled={!p.ready || submitting || panel !== null}
                aria-label={t("lessonRoom.voice")}
                onClick={() => {
                  if (p.inputMode !== "voice") p.onInputMode("voice");
                }}
              >
                <img src={micIcon} alt="" />
                {t("lessonRoom.voice")}
              </button>
              <button
                type="button"
                aria-pressed={p.inputMode === "text"}
                disabled={!p.ready || submitting || panel !== null}
                aria-label={t("lessonUi.answerText")}
                onClick={() => {
                  p.onInputMode("text");
                  answerField.current?.focus();
                }}
              >
                <img src={keyboardIcon} alt="" />
                {t("lessonRoom.text")}
              </button>
              <span className="lesson-room-mic-status">
                {t(
                  voiceActive ? "lessonRoom.micActive" : "lessonRoom.micMuted",
                )}
              </span>
            </div>

            {p.inputMode === "text" ? (
              <form
                className="lesson-room-answer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <button
                  type="submit"
                  className="lesson-room-action primary"
                  aria-label={t("lessonUi.send")}
                  disabled={unavailable || !draft.trim()}
                >
                  {submitting ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : (
                    <img src={sendIcon} alt="" />
                  )}
                  <span>{t("lessonRoom.send")}</span>
                </button>
                <textarea
                  ref={answerField}
                  aria-label={t("lessonUi.yourAnswer")}
                  placeholder={t("lessonRoom.placeholder")}
                  rows={2}
                  maxLength={1500}
                  dir="auto"
                  value={draft}
                  disabled={submitting || panel !== null}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      void submit();
                    }
                  }}
                />
              </form>
            ) : (
              <div
                className={`lesson-room-voice${voiceActive ? " recording" : ""}`}
              >
                <button
                  type="button"
                  className="lesson-room-action outlined"
                  disabled={unavailable}
                  aria-pressed={voiceActive}
                  aria-label={t(
                    voiceActive ? "lessonUi.stopSpeaking" : "lessonUi.speak",
                  )}
                  onClick={p.onMicrophone}
                >
                  {voiceActive ? (
                    <MicOff size={20} />
                  ) : (
                    <img src={micStatusIcon} alt="" />
                  )}
                  {t(voiceActive ? "lessonRoom.mute" : "lessonRoom.unmute")}
                </button>
                <span className="lesson-room-wave" aria-hidden="true">
                  {[8, 16, 28, 38, 22, 14, 30, 18, 8].map((height, index) => (
                    <i key={index} style={{ height }} />
                  ))}
                </span>
                <div>
                  <strong>
                    {t(
                      voiceActive
                        ? "lessonRoom.speakNow"
                        : "lessonRoom.micMuted",
                    )}
                  </strong>
                  <small>
                    {t(
                      voiceActive
                        ? "lessonRoom.voiceTranscript"
                        : "lessonRoom.unmuteHelp",
                    )}
                  </small>
                </div>
              </div>
            )}
            <div className="lesson-room-composer-help">
              <span>
                {t(
                  p.inputMode === "text"
                    ? "lessonRoom.keyboardHelp"
                    : "lessonRoom.switchAnytime",
                )}
              </span>
              <span>{t("lessonRoom.ownPace")}</span>
            </div>
            {p.error && (
              <p className="form-error" role="alert">
                {p.error}
              </p>
            )}
          </div>
        </section>

        <aside
          className="lesson-room-teacher"
          aria-label={t("privateLesson.teacherVoice")}
        >
          <header>
            <span className="lesson-room-chip">
              {p.ready && <img src={checkIcon} alt="" />}
              {t(p.ready ? "lessonRoom.connected" : "lessonRoom.connecting")}
            </span>
            <div>
              <h2>{teacherName}</h2>
              <p>{t("lessonUi.aiTeacher")}</p>
            </div>
          </header>
          <div className="lesson-room-teacher-portrait">
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
            <span className="lesson-room-chip" role="status">
              <img src={micStatusIcon} alt="" />
              {t(`lessonRoom.${teacherState}`, { teacher: teacherName })}
            </span>
          </div>
          <div className="lesson-room-encouragement">
            <h2>{t("lessonRoom.yourTurn")}</h2>
            <p>
              {t("lessonUi.voiceOrText")}
              <br />
              {t("lessonUi.takeYourTime")}
            </p>
          </div>
          <section className="lesson-room-goal">
            <h3>{t("lessonRoom.goal")}</h3>
            <p dir="auto">
              {p.lesson.roadmap?.communicationObjective ||
                p.lesson.grammarFocus ||
                p.lesson.topic}
            </p>
            {p.lesson.targetWords.length > 0 && (
              <div className="lesson-room-words">
                {p.lesson.targetWords.slice(0, 5).map((word) => (
                  <span
                    className="lesson-room-chip"
                    key={word.learningItemId}
                    title={word.translationText}
                    lang={p.lesson.targetLanguageCode}
                    dir="auto"
                  >
                    {word.sourceText}
                  </span>
                ))}
              </div>
            )}
          </section>
          <p className="lesson-room-mobile-status" role="status">
            {t(`lessonRoom.${teacherState}`, { teacher: teacherName })}
          </p>
        </aside>
      </main>

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
