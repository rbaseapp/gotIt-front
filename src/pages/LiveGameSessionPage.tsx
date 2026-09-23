import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Mic, Volume2 } from "lucide-react";
import { Logo } from "../components/Logo";
import { LetterBoxesInput } from "../components/LetterBoxesInput";
import { api } from "../lib/api";
import {
  attemptReceipt,
  errorMessage,
  exerciseSchema,
  intent,
  masteryRequirementText,
  product,
  sessionSchema,
  studyCardsSchema,
  studyImageSchema,
  uuid,
  type AttemptReceipt,
  type Exercise,
  type Intent,
  type Session,
  type StudyCard,
  type StudyImage,
} from "../lib/product";
import { recordVoice } from "../lib/voice";
import { useApp } from "../context/AppContext";
import { useFeedback } from "../components/Feedback";
import { speak } from "../lib/utils";
import { useTranslation } from "react-i18next";

const modes: Record<string, string> = {
  smart: "smart_review",
  flashcards: "flashcards",
  recall: "recall",
  listening: "listening_spelling",
  matching: "matching",
  pronunciation: "pronunciation",
  article_quiz: "article_quiz",
};
type Submission = Intent & { path: string };
export function LiveGameSessionPage() {
  const { t, i18n } = useTranslation();
  const { type = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { profile, updateProfile } = useApp();
  const { confirm, toast } = useFeedback();
  const [session, setSession] = useState<Session>();
  const [studyCards, setStudyCards] = useState<StudyCard[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studyImage, setStudyImage] = useState<StudyImage | undefined>();
  const [studyImageFailed, setStudyImageFailed] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [receipt, setReceipt] = useState<AttemptReceipt>();
  const [direction, setDirection] = useState("translation_to_source");
  const [kind, setKind] = useState("typed");
  const [count, setCount] = useState(10);
  const [pending, setPending] = useState<Submission>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const creation = useRef<Intent | undefined>(undefined);
  const lock = useRef(false);
  const mounted = useRef(true);
  const recordingController = useRef<AbortController | undefined>(undefined);
  const recordingRelease = useRef<AbortController | undefined>(undefined);
  const audio = useRef<HTMLAudioElement | undefined>(undefined);
  const audioUrl = useRef<string | undefined>(undefined);
  const shownAt = useRef(performance.now());
  const exercise = exercises[index];
  const studyCard = studyCards[studyIndex];
  const masteryRequirements = receipt?.progress.masteryRequirements;
  const playStudyCard = useCallback(
    async (card: StudyCard, reportError = true) => {
      try {
        audio.current?.pause();
        if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
        if (!card.audioUrl) {
          if (!speak(card.sourceText, card.sourceLanguageCode) && reportError)
            setError(t("game.speechUnavailable"));
          return;
        }
        const blob = await api.audio(card.learningItemId);
        if (!mounted.current) return;
        audioUrl.current = URL.createObjectURL(blob);
        audio.current = new Audio(audioUrl.current);
        await audio.current.play();
      } catch {
        if (
          !speak(card.sourceText, card.sourceLanguageCode) &&
          reportError &&
          mounted.current
        )
          setError(t("game.playFailed"));
      }
    },
    [t],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      recordingController.current?.abort();
      audio.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);
  useEffect(() => {
    audio.current?.pause();
    shownAt.current = performance.now();
  }, [exercise?.id]);
  useEffect(() => {
    if (!studyCard || !session) return;
    let current = true;
    setStudyImage(undefined);
    setStudyImageFailed(false);
    void product(
      studyImageSchema,
      `practice/sessions/${session.id}/study/${studyCard.learningItemId}/image`,
    )
      .then((result) => {
        if (current) setStudyImage(result.image);
      })
      .catch(() => {
        if (current) setStudyImage(null);
      });
    const playback = window.setTimeout(() => {
      if (current) void playStudyCard(studyCard, false);
    }, 250);
    return () => {
      current = false;
      window.clearTimeout(playback);
    };
  }, [playStudyCard, session, studyCard]);
  const issue = async (value: Session) => {
    const requestedCount =
      value.scope?.type === "pack" ? value.itemCount : count;
    const result = await product(
      z.object({
        exercises: z.array(exerciseSchema).min(1),
        algorithmVersion: z.string(),
      }),
      `practice/sessions/${value.id}/exercises`,
      "POST",
      {
        count: Math.max(1, Math.min(requestedCount, value.itemCount, 100)),
        ...(type === "smart"
          ? {}
          : {
              kind: modes[type] === "matching" ? "multiple_choice" : kind,
              direction,
            }),
      },
    );
    if (mounted.current) {
      setExercises(result.exercises);
      setIndex(0);
    }
  };
  const loadStudy = async (value: Session) => {
    const result = await product(
      studyCardsSchema,
      `practice/sessions/${value.id}/study`,
    );
    if (mounted.current) {
      setStudyCards(result.cards);
      setStudyIndex(0);
    }
  };
  const start = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const requiredSkills =
        type === "listening"
          ? (["listening", "spelling"] as const)
          : type === "pronunciation"
            ? (["pronunciation"] as const)
            : [];
      const enabledSkills = profile.learningPreferences?.enabledSkills || [
        "recognition",
        "recall",
        "listening",
        "spelling",
        "pronunciation",
      ];
      const missingSkills = requiredSkills.filter(
        (skill) => !enabledSkills.includes(skill),
      );
      if (missingSkills.length)
        await updateProfile({
          learningPreferences: {
            enabledSkills: [...enabledSkills, ...missingSkills],
          },
        });
      let value = session;
      if (!value) {
        const resume = params.get("resume");
        if (resume && uuid.safeParse(resume).success)
          value = (
            await product(
              z.object({ session: sessionSchema }),
              `practice/sessions/${resume}`,
            )
          ).session;
        else {
          const ids = params.get("items")?.split(",");
          if (
            ids &&
            (ids.length > 100 || ids.some((id) => !uuid.safeParse(id).success))
          )
            throw new Error(t("game.invalidItems"));
          const readingId = params.get("reading");
          const packId = params.get("pack");
          if (packId && !uuid.safeParse(packId).success)
            throw new Error(t("game.invalidPack"));
          if (type === "article_quiz" && !uuid.safeParse(readingId).success)
            throw new Error(t("game.openReadingFirst"));
          creation.current ??= intent({
            sessionType: modes[type],
            count: packId ? 100 : count,
            ...(ids ? { learningItemIds: ids } : {}),
            ...(readingId && type === "article_quiz" ? { readingId } : {}),
            ...(packId ? { scope: { type: "pack", id: packId } } : {}),
          });
          value = (
            await product(
              z.object({ session: sessionSchema }),
              "practice/sessions",
              "POST",
              creation.current.body,
              creation.current.eventId,
            )
          ).session;
        }
        if (mounted.current) setSession(value);
      }
      if (value.status === "active") {
        if (type === "smart" && value.attemptCount === 0)
          await loadStudy(value);
        else await issue(value);
      }
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const beginReview = async () => {
    if (!session || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    audio.current?.pause();
    window.speechSynthesis?.cancel();
    try {
      await issue(session);
      if (mounted.current) setStudyCards([]);
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const submit = async (
    fields: Record<string, unknown>,
    path = "practice/attempts",
  ) => {
    if (!exercise || receipt || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const submission = pending || {
      ...intent({
        exerciseId: exercise.id,
        ...fields,
        ...(path === "practice/attempts"
          ? {
              hintsUsed: 0,
              responseTimeMs: Math.min(
                3600000,
                Math.round(performance.now() - shownAt.current),
              ),
            }
          : {}),
      }),
      path,
    };
    setPending(submission);
    try {
      const result = await product(
        attemptReceipt,
        submission.path,
        "POST",
        submission.body,
        submission.eventId,
      );
      if (mounted.current) {
        setReceipt(result);
        setPending(undefined);
      }
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const close = async (status: "completed" | "abandoned") => {
    if (!session || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    recordingController.current?.abort();
    try {
      const result = await product(
        z.object({ session: sessionSchema }),
        `practice/sessions/${session.id}`,
        "PATCH",
        { status },
      );
      if (mounted.current) setSession(result.session);
      if (status === "abandoned") {
        toast(t("game.stoppedToast"), {
          tone: "info",
        });
        navigate("/learn");
      }
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const requestExit = async () => {
    if (!session || session.status !== "active") {
      navigate("/learn");
      return;
    }
    const approved = await confirm({
      title: t("game.exitTitle"),
      message: t("game.exitDescription"),
      confirmLabel: t("game.exitConfirm"),
      cancelLabel: t("game.keepLearning"),
      tone: "warning",
    });
    if (approved) void close("abandoned");
  };
  const play = async () => {
    if (!exercise || busy) return;
    setError("");
    try {
      audio.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      const blob = await api.audio(exercise.learningItemId);
      if (!mounted.current) return;
      audioUrl.current = URL.createObjectURL(blob);
      audio.current = new Audio(audioUrl.current);
      await audio.current.play();
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason));
    }
  };
  const record = async () => {
    if (recording || pending || busy) return;
    const controller = new AbortController();
    const release = new AbortController();
    recordingController.current = controller;
    recordingRelease.current = release;
    setRecording(true);
    setError("");
    try {
      const audioBase64 = await recordVoice(controller.signal, release.signal);
      if (mounted.current)
        await submit(
          { audioBase64, languageCode: exercise.prompt.languageCode },
          "pronunciation/assessments",
        );
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason));
    } finally {
      if (recordingController.current === controller) {
        recordingController.current = undefined;
        recordingRelease.current = undefined;
      }
      if (mounted.current) setRecording(false);
    }
  };
  const releaseRecording = () => recordingRelease.current?.abort();
  const cancelRecording = () => recordingController.current?.abort();
  if (!modes[type])
    return (
      <div className="empty-session">
        <h1>{t("game.unknownType")}</h1>
        <Link to="/learn">{t("game.backToLearn")}</Link>
      </div>
    );
  return (
    <div className="session-page live-session">
      <header className="session-topbar">
        <button
          className="button ghost"
          disabled={busy}
          onClick={() => void requestExit()}
        >
          <ArrowRight size={18} />
          {t("game.exit")}
        </button>
        <Logo />
        <span>{t(`labels.${modes[type]}`)}</span>
      </header>
      <main className="live-session-main">
        {error && (
          <div role="alert" className="form-error">
            {error}
          </div>
        )}
        {!exercise && !studyCard && session?.status !== "completed" && (
          <section className="live-panel form-stack">
            <p className="eyebrow">{t("game.serverPractice")}</p>
            <h1>{t(`labels.${modes[type]}`)}</h1>
            <p>{t("game.serverPracticeDescription")}</p>
            <fieldset
              className="plain-fieldset form-stack"
              disabled={busy || !!creation.current || !!session}
            >
              <label className="field">
                <span>{t("game.maxWords")}</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) =>
                    setCount(Math.max(1, Math.min(20, Number(e.target.value))))
                  }
                />
              </label>
              {!["listening", "pronunciation", "smart"].includes(type) && (
                <label className="field">
                  <span>{t("game.direction")}</span>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                  >
                    <option value="translation_to_source">{t("game.meaningToSource")}</option>
                    <option value="source_to_translation">{t("game.sourceToMeaning")}</option>
                  </select>
                </label>
              )}
              {["recall", "article_quiz"].includes(type) && (
                <label className="field">
                  <span>{t("game.answerType")}</span>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="typed">{t("game.typed")}</option>
                    <option value="multiple_choice">
                      {t("game.multipleChoice")}
                    </option>
                  </select>
                </label>
              )}
            </fieldset>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void start()}
            >
              {busy
                ? t("game.preparing")
                : session
                  ? t("game.issueQuestions")
                  : creation.current
                    ? t("game.retryCreation")
                    : t("game.start")}
            </button>
            {creation.current && !session && (
              <p>{t("game.retryCreationHelp")}</p>
            )}
          </section>
        )}
        {session?.status === "completed" ? (
          <section className="live-panel live-empty">
            <p className="eyebrow">{t("game.resultsSaved")}</p>
            <h1>{t("game.completed")}</h1>
            <div className="live-stats-grid">
              <div>
                <b>{session.attemptCount}</b>
                <span>{t("game.attempts")}</span>
              </div>
              <div>
                <b>{session.correctCount}</b>
                <span>{t("game.correctAnswers")}</span>
              </div>
              <div>
                <b>{session.xpEarned}</b>
                <span>{t("game.totalXp")}</span>
              </div>
            </div>
            <Link className="button primary" to="/dashboard">
              {t("game.myProgress")}
            </Link>
          </section>
        ) : studyCard ? (
          <>
            <div className="live-toolbar study-toolbar">
              <span>
                {t("game.studyProgress", { current: studyIndex + 1, total: studyCards.length })}
              </span>
              <span>{t("game.familiarize")}</span>
              <button
                className="button primary study-skip"
                disabled={busy}
                onClick={() => void beginReview()}
              >
                {t("game.skipToReview")}
                <ArrowLeft size={17} />
              </button>
            </div>
            <progress
              className="live-session-progress"
              value={studyIndex + 1}
              max={studyCards.length}
              aria-label={t("game.studyProgressAria")}
            />
            <section className="memorization-card live-panel">
              {(studyImage === undefined ||
                (studyImage && !studyImageFailed)) && (
                <div className="memorization-visual">
                  {studyImage ? (
                    <img
                      src={studyImage.url}
                      alt={
                        studyImage.alt || t("game.imageFor", { word: studyCard.sourceText })
                      }
                      onError={() => setStudyImageFailed(true)}
                    />
                  ) : (
                    <div
                      className="memorization-image-loading"
                      aria-label={t("game.loadingImage")}
                    />
                  )}
                  {studyImage && (
                    <small className="image-credit">
                      {studyImage.generated ? (
                        t("game.generatedImage")
                      ) : studyImage.sourceUrl ? (
                        <a
                          href={studyImage.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {studyImage.creator
                            ? t("game.imageBy", { creator: studyImage.creator, provider: studyImage.provider || "Pixabay" })
                            : t("game.imageVia", { provider: studyImage.provider || "Pixabay" })}
                        </a>
                      ) : (
                        t("game.imageVia", { provider: studyImage.provider || t("game.externalSource") })
                      )}
                    </small>
                  )}
                </div>
              )}
              <div className="memorization-copy">
                <p className="eyebrow">{t("game.prepareMemory")}</p>
                <h1 dir="auto">{studyCard.sourceText}</h1>
                <p className="memorization-translation" dir="auto">
                  {studyCard.translationText}
                </p>
                <button
                  className="button secondary memorization-audio"
                  disabled={busy}
                  onClick={() => void playStudyCard(studyCard)}
                >
                  <Volume2 size={19} />
                  {t("game.playAgain")}
                </button>
                {studyCard.context && (
                  <blockquote dir="auto">{studyCard.context}</blockquote>
                )}
              </div>
              <div className="memorization-actions">
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => {
                    if (studyIndex + 1 === studyCards.length)
                      void beginReview();
                    else setStudyIndex((current) => current + 1);
                  }}
                >
                  {busy
                    ? t("game.preparingReview")
                    : studyIndex + 1 === studyCards.length
                      ? t("game.startReview")
                      : t("game.nextWord")}
                  <ArrowLeft size={18} />
                </button>
              </div>
            </section>
          </>
        ) : (
          exercise && (
            <>
              <div className="live-toolbar">
                <span>
                  {t("game.exerciseProgress", { current: index + 1, total: exercises.length })}
                </span>
                <span>{t(`labels.${exercise.exerciseType}`)}</span>
              </div>
              <progress
                className="live-session-progress"
                value={index}
                max={exercises.length}
                aria-label={t("game.exerciseProgressAria")}
              />
              <section className="live-exercise live-panel">
                <p className="eyebrow">
                  {exercise.direction === "translation_to_source"
                    ? t("game.sayInSource")
                    : t("game.whatMeaning")}
                </p>
                <h1 dir="auto">
                  {exercise.prompt.text || t("game.listenAndType")}
                </h1>
                {exercise.prompt.context && (
                  <blockquote dir="auto">{exercise.prompt.context}</blockquote>
                )}
                {exercise.prompt.audioUrl && (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void play()}
                  >
                    <Volume2 size={19} />
                    {t("game.playSource")}
                  </button>
                )}
                {!receipt && (
                  <>
                    {exercise.kind === "self_rating" ? (
                      <>
                        {!flipped ? (
                          <button
                            className="button primary"
                            disabled={busy || !!pending}
                            onClick={() => setFlipped(true)}
                          >
                            {t("game.revealAnswer")}
                          </button>
                        ) : (
                          <>
                            <p className="live-revealed" dir="auto">
                              {exercise.prompt.answer}
                            </p>
                            <div className="live-options">
                              {["again", "hard", "good", "easy"].map((selfRating) => (
                                <button
                                  className="button secondary"
                                  key={selfRating}
                                  disabled={busy || !!pending}
                                  onClick={() => void submit({ selfRating })}
                                >
                                  {t(`game.ratings.${selfRating}`)}
                                </button>
                              ))}
                            </div>
                            <p className="muted-note">
                              {t("game.selfRatingHelp")}
                            </p>
                          </>
                        )}
                      </>
                    ) : exercise.kind === "multiple_choice" ? (
                      <div className="live-choice-grid">
                        {exercise.prompt.choices?.map((choice) => (
                          <button
                            className="button secondary"
                            dir="auto"
                            key={choice.id}
                            disabled={busy || !!pending}
                            onClick={() => void submit({ choiceId: choice.id })}
                          >
                            {choice.text}
                          </button>
                        ))}
                      </div>
                    ) : exercise.kind === "provider" ? (
                      <>
                        <p>{t("game.recordingHelp")}</p>
                        <button
                          className={`button primary hold-to-talk${recording ? " recording" : ""}`}
                          disabled={busy || !!pending}
                          aria-pressed={recording}
                          onPointerDown={(event) => {
                            if (event.button !== 0) return;
                            event.preventDefault();
                            event.currentTarget.setPointerCapture(
                              event.pointerId,
                            );
                            void record();
                          }}
                          onPointerUp={(event) => {
                            event.preventDefault();
                            releaseRecording();
                          }}
                          onPointerCancel={cancelRecording}
                          onKeyDown={(event) => {
                            if (
                              (event.key === " " || event.key === "Enter") &&
                              !event.repeat
                            ) {
                              event.preventDefault();
                              void record();
                            }
                          }}
                          onKeyUp={(event) => {
                            if (event.key === " " || event.key === "Enter") {
                              event.preventDefault();
                              releaseRecording();
                            }
                          }}
                          onContextMenu={(event) => event.preventDefault()}
                        >
                          <Mic size={19} />
                          {recording
                            ? t("game.releaseToSend")
                            : t("game.holdToTalk")}
                        </button>
                        {recording && (
                          <button
                            className="button ghost"
                            onClick={cancelRecording}
                          >
                            {t("game.cancelRecording")}
                          </button>
                        )}
                      </>
                    ) : (
                      <form
                        className="form-stack"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void submit({ answerText: answer });
                        }}
                      >
                        <div className="field">
                          <span>{t("game.yourAnswer")}</span>
                          {exercise.prompt.letterCount ? (
                            <LetterBoxesInput
                              autoFocus
                              label={t("game.yourAnswer")}
                              value={answer}
                              length={exercise.prompt.letterCount}
                              disabled={busy || !!pending}
                              onChange={setAnswer}
                            />
                          ) : (
                            <input
                              autoFocus
                              aria-label={t("game.yourAnswer")}
                              dir="auto"
                              maxLength={2000}
                              autoComplete="off"
                              spellCheck={false}
                              value={answer}
                              disabled={busy || !!pending}
                              onChange={(e) => setAnswer(e.target.value)}
                            />
                          )}
                        </div>
                        <button
                          className="button primary"
                          disabled={!answer.trim() || busy || !!pending}
                        >
                          {t("game.checkAnswer")}
                        </button>
                      </form>
                    )}
                    {pending ? (
                      <>
                        <p>{t("game.answerLocked")}</p>
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() => void submit({})}
                        >
                          {t("game.retryAnswer")}
                        </button>
                      </>
                    ) : (
                      <button
                        className="button ghost"
                        disabled={busy || recording}
                        onClick={() => void submit({ skipped: true })}
                      >
                        {t("game.skip")}
                      </button>
                    )}
                  </>
                )}
                {receipt && (
                  <div
                    className={`live-feedback ${receipt.attempt.result}`}
                    role="status"
                  >
                    <h2>{t(`labels.${receipt.attempt.result}`)}</h2>
                    {receipt.attempt.expectedAnswer && (
                      <p dir="auto">{t("game.expectedAnswer", { answer: receipt.attempt.expectedAnswer })}</p>
                    )}
                    {receipt.attempt.pronunciationFeedback && (
                      <p>{receipt.attempt.pronunciationFeedback}</p>
                    )}
                    <p>
                      {t("game.serverScore", { score: receipt.attempt.score ?? t("game.noScore"), xp: receipt.attempt.xpEarned, status: t(`labels.${receipt.progress.status}`) })}
                    </p>
                    {receipt.attempt.xpStatus?.dailyXpCapReached && (
                      <p>{t("game.xpCap", { cap: receipt.attempt.xpStatus.dailyXpCap, percent: receipt.attempt.xpStatus.postDailyCapPercent ?? 25 })}</p>
                    )}
                    <p>
                      {t("game.masteryNext", { mastery: Math.round(receipt.progress.masteryScore), next: receipt.progress.nextReviewAt ? new Date(receipt.progress.nextReviewAt).toLocaleDateString(i18n.resolvedLanguage) : t("game.notScheduled") })}
                    </p>
                    {masteryRequirements?.needsTypedRecall && (
                      <p>
                        {t("game.toMastered", { requirement: masteryRequirementText(masteryRequirements) })}
                      </p>
                    )}
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() => {
                        if (index + 1 === exercises.length)
                          void close("completed");
                        else {
                          setIndex(index + 1);
                          setAnswer("");
                          setFlipped(false);
                          setReceipt(undefined);
                        }
                      }}
                    >
                      {index + 1 === exercises.length
                        ? t("game.finish")
                        : t("game.nextWord")}
                    </button>
                  </div>
                )}
              </section>
            </>
          )
        )}
      </main>
    </div>
  );
}
