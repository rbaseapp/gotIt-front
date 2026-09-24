import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flame,
  Gauge,
  Mic,
  RotateCcw,
  Settings2,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
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
import { LiveMatchingBoard } from "../components/LiveMatchingBoard";

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
type SessionOutcome = {
  attemptId: string;
  itemId: string;
  result: AttemptReceipt["attempt"]["result"];
  score: number | null;
  xp: number;
  expectedAnswer: string | null;
};

const confettiPieces = Array.from({ length: 34 }, (_, index) => ({
  x: ((index * 47) % 340) - 170,
  drift: ((index * 71) % 150) - 75,
  delay: (index % 7) * 22,
  duration: 850 + ((index * 37) % 420),
  rotation: 280 + ((index * 53) % 520),
}));

function StreakCelebration({ combo }: { combo: number }) {
  return (
    <div
      className="streak-celebration"
      data-testid="streak-celebration"
      aria-hidden="true"
    >
      {confettiPieces.map((piece, index) => (
        <i
          key={index}
          className={`confetti-piece confetti-${index % 6}`}
          style={
            {
              "--confetti-x": `${piece.x}px`,
              "--confetti-drift": `${piece.drift}px`,
              "--confetti-delay": `${piece.delay}ms`,
              "--confetti-duration": `${piece.duration}ms`,
              "--confetti-rotation": `${piece.rotation}deg`,
            } as CSSProperties
          }
        />
      ))}
      <span className="streak-burst">
        <Flame size={22} />×{combo}
      </span>
    </div>
  );
}

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
  const [outcomes, setOutcomes] = useState<SessionOutcome[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [remedialRound, setRemedialRound] = useState(false);
  const [moment, setMoment] = useState<"success" | "miss" | undefined>();
  const [celebration, setCelebration] = useState<{
    attemptId: string;
    combo: number;
  }>();
  const [cardLeaving, setCardLeaving] = useState(false);
  const [effectsEnabled, setEffectsEnabled] = useState(() => {
    try {
      return localStorage.getItem("gotit.practiceEffects.v1") !== "off";
    } catch {
      return true;
    }
  });
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
  const countedAttempts = useRef(new Set<string>());
  const mistakeIds = useRef(new Set<string>());
  const frozenSubmissions = useRef(new Map<string, Submission>());
  const comboRef = useRef(0);
  const momentTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const cardTransitionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
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
      if (momentTimer.current) clearTimeout(momentTimer.current);
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
      if (cardTransitionTimer.current)
        clearTimeout(cardTransitionTimer.current);
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
  const issue = async (value: Session, learningItemIds?: string[]) => {
    const requestedCount =
      learningItemIds?.length ??
      (value.scope?.type === "pack" ? value.itemCount : count);
    const result = await product(
      z.object({
        exercises: z.array(exerciseSchema).min(1),
        algorithmVersion: z.string(),
      }),
      `practice/sessions/${value.id}/exercises`,
      "POST",
      {
        count: Math.max(1, Math.min(requestedCount, value.itemCount, 100)),
        ...(learningItemIds ? { learningItemIds } : {}),
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
      setReceipt(undefined);
      setAnswer("");
      setFlipped(false);
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
  const playFeedbackCue = (success: boolean, milestone = false) => {
    if (!effectsEnabled) return;
    navigator.vibrate?.(
      success ? (milestone ? [20, 30, 28] : 20) : [18, 30, 18],
    );
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;
    try {
      const context = new AudioContextConstructor();
      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(0.72, now);
      master.connect(context.destination);
      const tone = (
        frequency: number,
        offset: number,
        duration: number,
        volume: number,
        wave: OscillatorType,
      ) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = now + offset;
        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain).connect(master);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
      };
      if (success) {
        tone(523.25, 0, 0.24, 0.052, "triangle");
        tone(659.25, 0.065, 0.27, 0.044, "sine");
        tone(783.99, 0.13, 0.32, 0.04, "triangle");
        if (milestone) {
          tone(1046.5, 0.21, 0.42, 0.036, "sine");
          tone(1318.51, 0.3, 0.38, 0.02, "sine");
        }
      } else {
        tone(261.63, 0, 0.2, 0.038, "triangle");
        tone(196, 0.09, 0.26, 0.03, "sine");
      }
      window.setTimeout(() => void context.close(), milestone ? 850 : 620);
    } catch {
      // Feedback audio is decorative; practice must continue without it.
    }
  };
  const registerOutcome = (result: AttemptReceipt) => {
    if (countedAttempts.current.has(result.attempt.id)) return;
    countedAttempts.current.add(result.attempt.id);
    const success =
      result.attempt.result === "correct" ||
      (result.attempt.result === "self_rated" &&
        (result.attempt.score ?? 0) >= 60);
    const nextCombo = success ? comboRef.current + 1 : 0;
    const milestone = success && nextCombo > 0 && nextCombo % 3 === 0;
    comboRef.current = nextCombo;
    playFeedbackCue(success, milestone);
    if (milestone) {
      setCelebration({
        attemptId: result.attempt.id,
        combo: nextCombo,
      });
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
      celebrationTimer.current = setTimeout(
        () => setCelebration(undefined),
        1500,
      );
    } else if (!success) {
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
      setCelebration(undefined);
    }
    if (success && remedialRound)
      mistakeIds.current.delete(result.attempt.learningItemId);
    else if (!success) mistakeIds.current.add(result.attempt.learningItemId);
    setOutcomes((current) => [
      ...current,
      {
        attemptId: result.attempt.id,
        itemId: result.attempt.learningItemId,
        result: result.attempt.result,
        score: result.attempt.score,
        xp: result.attempt.xpEarned,
        expectedAnswer: result.attempt.expectedAnswer,
      },
    ]);
    setSessionXp((current) => current + result.attempt.xpEarned);
    setCombo(nextCombo);
    setBestCombo((best) => Math.max(best, nextCombo));
    setMoment(success ? "success" : "miss");
    if (momentTimer.current) clearTimeout(momentTimer.current);
    momentTimer.current = setTimeout(() => setMoment(undefined), 900);
  };
  const performSubmission = async (
    target: Exercise,
    fields: Record<string, unknown>,
    path = "practice/attempts",
    exposePending = false,
  ) => {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    setError("");
    const submissionKey = `${path}:${target.id}`;
    const submission = frozenSubmissions.current.get(submissionKey) ?? {
      ...intent({
        exerciseId: target.id,
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
    frozenSubmissions.current.set(submissionKey, submission);
    if (exposePending) setPending(submission);
    try {
      const result = await product(
        attemptReceipt,
        submission.path,
        "POST",
        submission.body,
        submission.eventId,
      );
      if (mounted.current) {
        frozenSubmissions.current.delete(submissionKey);
        registerOutcome(result);
        if (exposePending) setPending(undefined);
      }
      return result;
    } catch (reason) {
      if (mounted.current) setError(errorMessage(reason));
      return undefined;
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const submit = async (
    fields: Record<string, unknown>,
    path = "practice/attempts",
  ) => {
    if (!exercise || receipt) return;
    const result = await performSubmission(exercise, fields, path, true);
    if (result && mounted.current) setReceipt(result);
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
  const advance = async () => {
    if (!session || busy || cardLeaving) return;
    if (index + 1 < exercises.length) {
      setCardLeaving(true);
      if (cardTransitionTimer.current)
        clearTimeout(cardTransitionTimer.current);
      cardTransitionTimer.current = setTimeout(() => {
        if (!mounted.current) return;
        setIndex((current) => current + 1);
        setAnswer("");
        setFlipped(false);
        setReceipt(undefined);
        setMoment(undefined);
        setCardLeaving(false);
      }, 170);
      return;
    }
    const retryIds = [...mistakeIds.current];
    if (!remedialRound && retryIds.length && type !== "matching") {
      lock.current = true;
      setBusy(true);
      setError("");
      try {
        await issue(session, retryIds);
        if (mounted.current) setRemedialRound(true);
      } catch (reason) {
        if (mounted.current) setError(errorMessage(reason));
      } finally {
        lock.current = false;
        if (mounted.current) setBusy(false);
      }
      return;
    }
    await close("completed");
  };
  const restart = () => {
    creation.current = undefined;
    countedAttempts.current.clear();
    mistakeIds.current.clear();
    frozenSubmissions.current.clear();
    comboRef.current = 0;
    setSession(undefined);
    setStudyCards([]);
    setStudyIndex(0);
    setStudyImage(undefined);
    setExercises([]);
    setIndex(0);
    setAnswer("");
    setReceipt(undefined);
    setPending(undefined);
    setOutcomes([]);
    setCombo(0);
    setBestCombo(0);
    setSessionXp(0);
    setRemedialRound(false);
    setMoment(undefined);
    setCelebration(undefined);
    setCardLeaving(false);
  };
  const advanceStudy = () => {
    if (busy || cardLeaving) return;
    if (studyIndex + 1 === studyCards.length) {
      void beginReview();
      return;
    }
    setCardLeaving(true);
    if (cardTransitionTimer.current) clearTimeout(cardTransitionTimer.current);
    cardTransitionTimer.current = setTimeout(() => {
      if (!mounted.current) return;
      setStudyIndex((current) => current + 1);
      setCardLeaving(false);
    }, 170);
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
  const play = async (playbackRate = 1) => {
    if (!exercise || busy) return;
    setError("");
    try {
      audio.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      const blob = await api.audio(exercise.learningItemId);
      if (!mounted.current) return;
      audioUrl.current = URL.createObjectURL(blob);
      audio.current = new Audio(audioUrl.current);
      audio.current.playbackRate = playbackRate;
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
  const submitRef = useRef(submit);
  const playRef = useRef(play);
  submitRef.current = submit;
  playRef.current = play;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.matches("input, textarea, select, button") ||
        target.isContentEditable ||
        !exercise ||
        receipt ||
        busy ||
        pending
      )
        return;
      const optionIndex = Number(event.key) - 1;
      if (
        exercise.kind === "multiple_choice" &&
        optionIndex >= 0 &&
        optionIndex < (exercise.prompt.choices?.length ?? 0)
      ) {
        event.preventDefault();
        void submitRef.current({
          choiceId: exercise.prompt.choices![optionIndex]!.id,
        });
      } else if (
        exercise.kind === "self_rating" &&
        flipped &&
        optionIndex >= 0 &&
        optionIndex < 4
      ) {
        event.preventDefault();
        void submitRef.current({
          selfRating: ["again", "hard", "good", "easy"][optionIndex],
        });
      } else if (event.key === " " && exercise.prompt.audioUrl) {
        event.preventDefault();
        void playRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, exercise, flipped, pending, receipt]);
  if (!modes[type])
    return (
      <div className="empty-session">
        <h1>{t("game.unknownType")}</h1>
        <Link to="/learn">{t("game.backToLearn")}</Link>
      </div>
    );
  return (
    <div
      className={`session-page live-session${moment ? ` moment-${moment}` : ""}`}
    >
      <header className="session-topbar">
        <button
          className="button ghost"
          disabled={busy}
          onClick={() => void requestExit()}
        >
          <ArrowRight size={18} />
          {t("game.exit")}
        </button>
        <div className="session-brand">
          <Logo />
          <span>{t(`labels.${modes[type]}`)}</span>
        </div>
        <div className="session-hud" aria-live="polite">
          <span className={`hud-chip combo${combo >= 3 ? " active" : ""}`}>
            <Flame size={17} />
            <b>{combo}</b>
            {t("game.combo")}
          </span>
          <span className="hud-chip xp">
            <Zap size={17} />
            <b>{sessionXp}</b>
            XP
          </span>
          <button
            type="button"
            className="hud-sound"
            aria-label={
              effectsEnabled ? t("game.effectsOff") : t("game.effectsOn")
            }
            aria-pressed={effectsEnabled}
            onClick={() => {
              const next = !effectsEnabled;
              setEffectsEnabled(next);
              try {
                localStorage.setItem(
                  "gotit.practiceEffects.v1",
                  next ? "on" : "off",
                );
              } catch {
                // The setting remains active for this tab when storage is blocked.
              }
            }}
          >
            {effectsEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
        </div>
      </header>
      {celebration && (
        <StreakCelebration
          key={celebration.attemptId}
          combo={celebration.combo}
        />
      )}
      <main
        className={`live-session-main${exercise || studyCard ? " session-active" : ""}`}
      >
        {error && (
          <div role="alert" className="form-error">
            {error}
          </div>
        )}
        {!exercise && !studyCard && session?.status !== "completed" && (
          <section className="live-panel session-launch">
            <span className="launch-icon" aria-hidden="true">
              <Sparkles size={30} />
            </span>
            <p className="eyebrow">{t("game.readyEyebrow")}</p>
            <h1>{t(`labels.${modes[type]}`)}</h1>
            <p>{t("game.quickStartDescription", { count })}</p>
            <details className="session-settings">
              <summary>
                <Settings2 size={17} />
                {t("game.customize")}
              </summary>
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
                      setCount(
                        Math.max(1, Math.min(20, Number(e.target.value))),
                      )
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
                      <option value="translation_to_source">
                        {t("game.meaningToSource")}
                      </option>
                      <option value="source_to_translation">
                        {t("game.sourceToMeaning")}
                      </option>
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
            </details>
            <button
              className="button primary launch-button"
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
              {!busy && <ArrowLeft size={19} />}
            </button>
            {creation.current && !session && (
              <p>{t("game.retryCreationHelp")}</p>
            )}
          </section>
        )}
        {session?.status === "completed" ? (
          <section className="live-panel live-empty session-results">
            <span className="result-trophy" aria-hidden="true">
              <Trophy size={42} />
            </span>
            <p className="eyebrow">{t("game.resultsSaved")}</p>
            <h1>{t("game.completed")}</h1>
            <p>{t("game.finishMessage", { combo: bestCombo })}</p>
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
              <div>
                <b>{bestCombo}</b>
                <span>{t("game.bestCombo")}</span>
              </div>
            </div>
            {outcomes.some((outcome) => outcome.expectedAnswer) && (
              <div className="session-learnings">
                <b>{t("game.wordsStrengthened")}</b>
                <div>
                  {[
                    ...new Set(
                      outcomes
                        .map((outcome) => outcome.expectedAnswer)
                        .filter((answer): answer is string => Boolean(answer)),
                    ),
                  ]
                    .slice(0, 5)
                    .map((answer) => (
                      <span key={answer} dir="auto">
                        {answer}
                      </span>
                    ))}
                </div>
              </div>
            )}
            <div className="finish-actions">
              <button className="button primary" onClick={restart}>
                <RotateCcw size={17} />
                {t("game.anotherRound")}
              </button>
              <Link className="button secondary" to="/dashboard">
                {t("game.myProgress")}
              </Link>
            </div>
          </section>
        ) : studyCard ? (
          <>
            <div className="live-toolbar study-toolbar">
              <span>
                {t("game.studyProgress", {
                  current: studyIndex + 1,
                  total: studyCards.length,
                })}
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
            <section
              key={studyCard.learningItemId}
              className={`memorization-card live-panel practice-card${cardLeaving ? " card-leaving" : ""}`}
            >
              {(studyImage === undefined ||
                (studyImage && !studyImageFailed)) && (
                <div className="memorization-visual">
                  {studyImage ? (
                    <img
                      src={studyImage.url}
                      alt={
                        studyImage.alt ||
                        t("game.imageFor", { word: studyCard.sourceText })
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
                            ? t("game.imageBy", {
                                creator: studyImage.creator,
                                provider: studyImage.provider || "Pixabay",
                              })
                            : t("game.imageVia", {
                                provider: studyImage.provider || "Pixabay",
                              })}
                        </a>
                      ) : (
                        t("game.imageVia", {
                          provider:
                            studyImage.provider || t("game.externalSource"),
                        })
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
                  disabled={busy || cardLeaving}
                  onClick={advanceStudy}
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
                  {t("game.exerciseProgress", {
                    current: index + 1,
                    total: exercises.length,
                  })}
                </span>
                <span className="round-label">
                  {remedialRound
                    ? t("game.repairRound")
                    : index / exercises.length < 0.34
                      ? t("game.warmupRound")
                      : index / exercises.length < 0.75
                        ? t("game.challengeRound")
                        : t("game.masteryRound")}
                </span>
                <span>{t(`labels.${exercise.exerciseType}`)}</span>
              </div>
              <progress
                className="live-session-progress"
                value={type === "matching" ? outcomes.length : index}
                max={exercises.length}
                aria-label={t("game.exerciseProgressAria")}
              />
              {type === "matching" ? (
                <section className="live-exercise live-panel matching-panel practice-card">
                  <LiveMatchingBoard
                    exercises={exercises}
                    busy={busy}
                    onSubmit={(target, choiceId) =>
                      performSubmission(target, { choiceId })
                    }
                    onDone={() => void close("completed")}
                  />
                </section>
              ) : (
                <section
                  key={exercise.id}
                  className={`live-exercise live-panel practice-card${exercise.kind === "provider" ? " provider-exercise" : ""}${cardLeaving ? " card-leaving" : ""}`}
                >
                  <p className="eyebrow">
                    {exercise.direction === "translation_to_source"
                      ? t("game.sayInSource")
                      : t("game.whatMeaning")}
                  </p>
                  <h1 dir="auto">
                    {exercise.prompt.text || t("game.listenAndType")}
                  </h1>
                  {exercise.prompt.context && (
                    <blockquote dir="auto">
                      {exercise.prompt.context}
                    </blockquote>
                  )}
                  {exercise.prompt.audioUrl && (
                    <div className="audio-actions">
                      <button
                        className="listen-button"
                        disabled={busy}
                        onClick={() => void play()}
                      >
                        <span className="listen-button-icon">
                          <Volume2 size={24} />
                        </span>
                        {t("game.playSource")}
                      </button>
                      {exercise.exerciseType === "listening_spelling" && (
                        <button
                          className="button ghost slow-audio"
                          disabled={busy}
                          onClick={() => void play(0.75)}
                        >
                          <Gauge size={17} />
                          {t("game.playSlowly")}
                        </button>
                      )}
                    </div>
                  )}
                  {!receipt && (
                    <>
                      {exercise.kind === "self_rating" ? (
                        <>
                          {!flipped ? (
                            <button
                              className="button primary exercise-primary-action"
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
                                {["again", "hard", "good", "easy"].map(
                                  (selfRating) => (
                                    <button
                                      className="button secondary"
                                      key={selfRating}
                                      disabled={busy || !!pending}
                                      onClick={() =>
                                        void submit({ selfRating })
                                      }
                                    >
                                      {t(`game.ratings.${selfRating}`)}
                                    </button>
                                  ),
                                )}
                              </div>
                              <p className="muted-note">
                                {t("game.selfRatingHelp")}
                              </p>
                            </>
                          )}
                        </>
                      ) : exercise.kind === "multiple_choice" ? (
                        <div className="live-choice-grid">
                          {exercise.prompt.choices?.map(
                            (choice, choiceIndex) => (
                              <button
                                className="button secondary"
                                dir="auto"
                                key={choice.id}
                                disabled={busy || !!pending}
                                onClick={() =>
                                  void submit({ choiceId: choice.id })
                                }
                              >
                                <kbd>{choiceIndex + 1}</kbd>
                                <span>{choice.text}</span>
                              </button>
                            ),
                          )}
                        </div>
                      ) : exercise.kind === "provider" ? (
                        <>
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
                                wordLengths={exercise.prompt.wordLengths}
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
                          className="button ghost exercise-skip-action"
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
                      <span className="feedback-mark" aria-hidden="true">
                        {receipt.attempt.result === "correct" ||
                        (receipt.attempt.result === "self_rated" &&
                          (receipt.attempt.score ?? 0) >= 60) ? (
                          <CheckCircle2 size={30} />
                        ) : (
                          <Sparkles size={28} />
                        )}
                      </span>
                      <div className="feedback-copy">
                        <h2>{t(`labels.${receipt.attempt.result}`)}</h2>
                        {receipt.attempt.expectedAnswer && (
                          <p className="feedback-answer" dir="auto">
                            {t("game.expectedAnswer", {
                              answer: receipt.attempt.expectedAnswer,
                            })}
                          </p>
                        )}
                      </div>
                      <div className="feedback-rewards">
                        <span>
                          <Zap size={16} />+{receipt.attempt.xpEarned} XP
                        </span>
                        {receipt.attempt.score !== null && (
                          <span>{Math.round(receipt.attempt.score)}%</span>
                        )}
                        <span>
                          {t("game.masteryCompact", {
                            mastery: Math.round(receipt.progress.masteryScore),
                          })}
                        </span>
                      </div>
                      {receipt.attempt.pronunciationFeedback && (
                        <p className="pronunciation-coach">
                          {receipt.attempt.pronunciationFeedback}
                        </p>
                      )}
                      <details className="feedback-details">
                        <summary>{t("game.progressDetails")}</summary>
                        <p>
                          {t("game.masteryNext", {
                            mastery: Math.round(receipt.progress.masteryScore),
                            next: receipt.progress.nextReviewAt
                              ? new Date(
                                  receipt.progress.nextReviewAt,
                                ).toLocaleDateString(i18n.resolvedLanguage)
                              : t("game.notScheduled"),
                          })}
                        </p>
                        {masteryRequirements?.needsTypedRecall && (
                          <p>
                            {t("game.toMastered", {
                              requirement:
                                masteryRequirementText(masteryRequirements),
                            })}
                          </p>
                        )}
                        {receipt.attempt.xpStatus?.dailyXpCapReached && (
                          <p>
                            {t("game.xpCap", {
                              cap: receipt.attempt.xpStatus.dailyXpCap,
                              percent:
                                receipt.attempt.xpStatus.postDailyCapPercent ??
                                25,
                            })}
                          </p>
                        )}
                      </details>
                      <button
                        className="button primary feedback-next-action"
                        disabled={busy || cardLeaving}
                        onClick={() => void advance()}
                      >
                        {index + 1 === exercises.length
                          ? !remedialRound && mistakeIds.current.size
                            ? t("game.reviewMistakes", {
                                count: mistakeIds.current.size,
                              })
                            : t("game.finish")
                          : t("game.nextWord")}
                        <ArrowLeft size={18} />
                      </button>
                    </div>
                  )}
                </section>
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}
