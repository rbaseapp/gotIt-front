import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  Gauge,
  Languages,
  LoaderCircle,
  Menu,
  MessageCircleMore,
  Mic2,
  MicOff,
  Map,
  Plus,
  RotateCcw,
  Sparkles,
  Settings2,
  Square,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { TeacherAvatar } from "../components/TeacherAvatar";
import { Modal } from "../components/Modal";
import { useApp } from "../context/AppContext";
import { getBilingualLanguageOptions } from "../lib/languages";
import { captureReceipt, errorMessage, product } from "../lib/product";
import {
  completePrivateLessonSession,
  connectPrivateLesson,
  createPrivateLessonRoadmap,
  createPrivateLessonSession,
  deletePrivateLesson,
  listPrivateLessons,
  getPrivateLessonSetup,
  getSavedPrivateLessonLanguage,
  PrivateLessonConnectionError,
  type PrivateLessonConnection,
  type PrivateLessonDurationMinutes,
  privateLessonCorrectionModes,
  type PrivateLessonCorrectionMode,
  privateLessonVocabularyModes,
  type PrivateLessonVocabularyMode,
  privateLessonSpeechRates,
  type PrivateLessonSpeechRate,
  privateLessonFocusAreas,
  type PrivateLessonFocusArea,
  type SavedPrivateLesson,
  type PrivateLessonSession,
  type PrivateLessonSetup,
} from "../lib/privateLesson";

type Phase =
  "setup" | "preparing" | "connecting" | "active" | "wrapping" | "ended";
type Turn = { id: number; role: "learner" | "tutor" | "system"; text: string };
type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type TeacherVoice = "female" | "male";

const speechRateMultipliers: Record<PrivateLessonSpeechRate, number> = {
  very_slow: 0.7,
  slow: 0.85,
  normal: 1,
  fast: 1.2,
  very_fast: 1.4,
};

export function PrivateLessonPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, retryProfile } = useApp();
  const languageOptions = getBilingualLanguageOptions();
  const [targetLanguage, setTargetLanguage] = useState(
    getSavedPrivateLessonLanguage(
      profile.languages[0]?.languageCode ||
        profile.defaultSourceLanguage ||
        "en",
    ),
  );
  const [supportLanguage, setSupportLanguage] = useState(
    profile.defaultTranslationLanguage || "",
  );
  const [level, setLevel] = useState<"" | CefrLevel>("");
  const [teacherVoice, setTeacherVoice] = useState<TeacherVoice>("female");
  const [speechRate, setSpeechRate] =
    useState<PrivateLessonSpeechRate>("normal");
  const [lessonDurationMinutes, setLessonDurationMinutes] =
    useState<PrivateLessonDurationMinutes>(5);
  const [topic, setTopic] = useState(profile.interests[0] || "");
  const [grammarFocus, setGrammarFocus] = useState("");
  const [focusAreas, setFocusAreas] = useState<PrivateLessonFocusArea[]>([
    "speaking",
    "vocabulary",
  ]);
  const [customFocus, setCustomFocus] = useState("");
  const [correctionMode, setCorrectionMode] =
    useState<PrivateLessonCorrectionMode>("recast");
  const [vocabularyMode, setVocabularyMode] =
    useState<PrivateLessonVocabularyMode>("learned");
  const [phase, setPhase] = useState<Phase>("setup");
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const [status, setStatus] = useState(t("privateLesson.ready"));
  const [error, setError] = useState("");
  const [session, setSession] = useState<PrivateLessonSession>();
  const [remaining, setRemaining] = useState(300);
  const [tutorAudioLevel, setTutorAudioLevel] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const turnsRef = useRef<Turn[]>([]);
  const [completedLesson, setCompletedLesson] = useState<SavedPrivateLesson>();
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [history, setHistory] = useState<SavedPrivateLesson[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [lessonSetup, setLessonSetup] = useState<PrivateLessonSetup>();
  const [setupLoading, setSetupLoading] = useState(true);
  const [roadmapCreating, setRoadmapCreating] = useState("");
  const [showGoalChooser, setShowGoalChooser] = useState(false);
  const [showLevelDetails, setShowLevelDetails] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showLessonOptions, setShowLessonOptions] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<SavedPrivateLesson>();
  const [savedSuggestions, setSavedSuggestions] = useState<Set<string>>(
    new Set(),
  );
  const [savingSuggestions, setSavingSuggestions] = useState<Set<string>>(
    new Set(),
  );
  const [suggestionSaveError, setSuggestionSaveError] = useState("");
  const [responding, setResponding] = useState(false);
  const [microphoneMuted, setMicrophoneMuted] = useState(false);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const turnId = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const connectionRef = useRef<PrivateLessonConnection | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const timers = useRef<number[]>([]);
  const activeResponse = useRef(false);
  const wrapPending = useRef(false);
  const wrapSent = useRef(false);
  const closingPrepared = useRef(false);
  const wrapResponseStarted = useRef(false);
  const wrapResponseStartedAt = useRef(0);
  const wrapTranscript = useRef("");
  const translationRequested = useRef(false);
  const assistantBuffer = useRef("");
  const lessonStartedAt = useRef(0);
  const finalizing = useRef(false);
  const personalizationTouched = useRef(false);
  const completionReason = useRef<"completed" | "stopped" | "disconnected">(
    "completed",
  );

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };
  const addTurn = (role: Turn["role"], text: string) => {
    if (!text.trim()) return;
    setTurns((current) => {
      const next = [
        ...current,
        { id: ++turnId.current, role, text: text.trim() },
      ];
      turnsRef.current = next;
      return next;
    });
  };
  const dispose = () => {
    clearTimers();
    abortRef.current?.abort();
    abortRef.current = undefined;
    connectionRef.current?.close();
    connectionRef.current = undefined;
    setMicrophoneMuted(false);
    setMicrophoneReady(false);
    activeResponse.current = false;
    setResponding(false);
    setTutorAudioLevel(0);
  };
  const finalizeLesson = async (activeSession: PrivateLessonSession) => {
    if (finalizing.current || completedLesson?.id === activeSession.lesson.id)
      return;
    finalizing.current = true;
    setReportLoading(true);
    setReportError("");
    try {
      const lesson = await completePrivateLessonSession(
        activeSession.lesson.id,
        {
          actualDurationSeconds: Math.min(
            1800,
            Math.max(
              0,
              Math.round((Date.now() - lessonStartedAt.current) / 1000),
            ),
          ),
          completionReason: completionReason.current,
          turns: turnsRef.current
            .filter(
              (turn): turn is Turn & { role: "learner" | "tutor" } =>
                turn.role === "learner" || turn.role === "tutor",
            )
            .map(({ role, text }) => ({ role, text })),
        },
      );
      setCompletedLesson(lesson);
      setHistory((current) => [
        lesson,
        ...current.filter((item) => item.id !== lesson.id),
      ]);
      window.dispatchEvent(new Event("gotit:lesson-assessment-updated"));
      void retryProfile();
      void getPrivateLessonSetup(targetLanguage)
        .then(setLessonSetup)
        .catch(() => undefined);
    } catch (reason) {
      setReportError(errorMessage(reason));
    } finally {
      finalizing.current = false;
      setReportLoading(false);
    }
  };
  const finish = (
    activeSession: PrivateLessonSession,
    message: string,
    includeTimeMessage = false,
    reason: "completed" | "stopped" | "disconnected" = "completed",
  ) => {
    if (includeTimeMessage) addTurn("system", t("privateLesson.timeFinished"));
    completionReason.current = reason;
    dispose();
    setRemaining(0);
    setStatus(message);
    setPhase("ended");
    void finalizeLesson(activeSession);
  };
  const requestWrapUp = (
    activeSession: PrivateLessonSession,
    reason: "completed" | "stopped" = "completed",
  ) => {
    if (wrapSent.current) return;
    completionReason.current = reason;
    setPhase("wrapping");
    phaseRef.current = "wrapping";
    if (!closingPrepared.current) {
      closingPrepared.current = true;
      connectionRef.current?.send({
        type: "session.update",
        session: {
          type: "realtime",
          audio: { input: { turn_detection: null } },
        },
      });
    }
    if (activeResponse.current) {
      wrapPending.current = true;
      setStatus(t("privateLesson.endingAfterTurn"));
      return;
    }
    wrapSent.current =
      connectionRef.current?.send(activeSession.realtime.wrapUpEvent) ?? false;
    wrapPending.current = !wrapSent.current;
    if (wrapSent.current) setStatus(t("privateLesson.wrapping"));
  };
  const finishAfterClosingPlayback = (activeSession: PrivateLessonSession) => {
    const wordCount = wrapTranscript.current
      .trim()
      .split(/\s+/u)
      .filter(Boolean).length;
    const rateMultiplier =
      speechRateMultipliers[activeSession.lesson.speechRate];
    const estimatedPlaybackMs = Math.min(
      20_000,
      Math.max(3_000, (wordCount / (2.4 * rateMultiplier)) * 1000 + 1_500),
    );
    const elapsed = Date.now() - wrapResponseStartedAt.current;
    setStatus(t("privateLesson.goodbyePlaying"));
    timers.current.push(
      window.setTimeout(
        () =>
          finish(
            activeSession,
            completionReason.current === "stopped"
              ? t("privateLesson.stopped")
              : t("privateLesson.ended"),
            true,
            completionReason.current,
          ),
        Math.max(1_000, estimatedPlaybackMs - elapsed),
      ),
    );
  };
  const requestTranslation = (activeSession: PrivateLessonSession) => {
    if (!activeSession.realtime.translationEvent || activeResponse.current)
      return;
    const sent = connectionRef.current?.send(
      activeSession.realtime.translationEvent,
    );
    if (sent) {
      translationRequested.current = true;
      activeResponse.current = true;
      setResponding(true);
      setStatus(t("privateLesson.translating"));
    }
  };
  const beginTimer = (activeSession: PrivateLessonSession) => {
    const startedAt = Date.now();
    setRemaining(activeSession.lesson.durationSeconds);
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setRemaining(Math.max(0, activeSession.lesson.durationSeconds - elapsed));
      if (elapsed < activeSession.lesson.durationSeconds)
        timers.current.push(window.setTimeout(tick, 250));
    };
    timers.current.push(window.setTimeout(tick, 250));
    timers.current.push(
      window.setTimeout(
        () => requestWrapUp(activeSession),
        activeSession.lesson.wrapUpAfterSeconds * 1000,
      ),
    );
    timers.current.push(
      window.setTimeout(
        () => requestWrapUp(activeSession),
        activeSession.lesson.durationSeconds * 1000,
      ),
    );
    timers.current.push(
      window.setTimeout(
        () => finish(activeSession, t("privateLesson.ended"), true),
        (activeSession.lesson.durationSeconds + 30) * 1000,
      ),
    );
  };
  const handleRealtimeEvent = (
    event: Record<string, unknown>,
    activeSession: PrivateLessonSession,
  ) => {
    if (event.type === "response.created") {
      activeResponse.current = true;
      setResponding(true);
      if (wrapSent.current && !wrapResponseStarted.current) {
        wrapResponseStarted.current = true;
        wrapResponseStartedAt.current = Date.now();
      }
    }
    if (event.type === "response.done") {
      activeResponse.current = false;
      setResponding(false);
      if (wrapPending.current)
        requestWrapUp(
          activeSession,
          completionReason.current === "stopped" ? "stopped" : "completed",
        );
      else if (wrapResponseStarted.current)
        finishAfterClosingPlayback(activeSession);
      else if (translationRequested.current) {
        translationRequested.current = false;
        setStatus(t("privateLesson.connected"));
      }
    }
    if (
      event.type === "conversation.item.input_audio_transcription.completed" &&
      typeof event.transcript === "string"
    )
      addTurn("learner", event.transcript);
    if (
      event.type === "response.output_audio_transcript.delta" &&
      typeof event.delta === "string"
    )
      assistantBuffer.current += event.delta;
    if (event.type === "response.output_audio_transcript.done") {
      const transcript =
        typeof event.transcript === "string"
          ? event.transcript
          : assistantBuffer.current;
      addTurn("tutor", transcript);
      if (wrapResponseStarted.current) wrapTranscript.current = transcript;
      assistantBuffer.current = "";
    }
    if (event.type === "error")
      setStatus(t("privateLesson.communicationError"));
  };

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      abortRef.current?.abort();
      connectionRef.current?.close();
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void listPrivateLessons()
      .then((lessons) => active && setHistory(lessons))
      .catch((reason) => active && setHistoryError(errorMessage(reason)));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setSetupLoading(true);
    setError("");
    void getPrivateLessonSetup(targetLanguage)
      .then((setup) => {
        if (!active) return;
        setLessonSetup(setup);
        const saved = setup.preferences;
        if (saved) {
          setSupportLanguage(saved.supportLanguageCode ?? "");
          setLessonDurationMinutes(saved.requestedDurationMinutes);
          setTeacherVoice(saved.teacherVoice);
          setSpeechRate(saved.speechRate);
          setFocusAreas(
            saved.focusAreas.length ? saved.focusAreas : ["speaking"],
          );
          setCustomFocus(saved.customFocus ?? "");
          setCorrectionMode(saved.correctionMode);
          setVocabularyMode(saved.vocabularyMode);
        }
        const currentMilestone = setup.roadmap?.milestones.find(
          (item) => item.status === "current",
        );
        if (currentMilestone && !personalizationTouched.current) {
          setTopic(currentMilestone.communicationObjective);
          setGrammarFocus(currentMilestone.grammarTopics.join(", "));
        }
      })
      .catch((reason) => active && setError(errorMessage(reason)))
      .finally(() => active && setSetupLoading(false));
    return () => {
      active = false;
    };
  }, [targetLanguage]);

  const sessionFullscreen = phase !== "setup" && phase !== "preparing";
  usePrivateLessonViewport(sessionFullscreen);
  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [phase, status, turns]);

  const startLesson = async (event: FormEvent) => {
    event.preventDefault();
    dispose();
    setPhase("preparing");
    setError("");
    setTurns([]);
    turnsRef.current = [];
    setSession(undefined);
    setCompletedLesson(undefined);
    setReportError("");
    setSavedSuggestions(new Set());
    finalizing.current = false;
    wrapPending.current = false;
    wrapSent.current = false;
    closingPrepared.current = false;
    wrapResponseStarted.current = false;
    wrapResponseStartedAt.current = 0;
    wrapTranscript.current = "";
    translationRequested.current = false;
    assistantBuffer.current = "";
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const created = await createPrivateLessonSession({
        targetLanguageCode: targetLanguage.trim(),
        supportLanguageCode: supportLanguage.trim() || null,
        ...(level ? { requestedLevel: level } : {}),
        requestedDurationMinutes: lessonDurationMinutes,
        teacherVoice,
        speechRate,
        ...(topic.trim() ? { topic: topic.trim() } : {}),
        ...(grammarFocus.trim() ? { grammarFocus: grammarFocus.trim() } : {}),
        focusAreas,
        customFocus: customFocus.trim() || null,
        correctionMode,
        vocabularyMode,
      });
      if (controller.signal.aborted) return;
      setSession(created);
      setRemaining(created.lesson.durationSeconds);
      setPhase("connecting");
      setStatus(t("privateLesson.microphoneRequest"));
      const audio = audioRef.current;
      if (!audio) throw new Error("Missing audio element");
      const connection = await connectPrivateLesson(
        created,
        audio,
        {
          onOpen() {
            if (controller.signal.aborted) return;
            setPhase("active");
            setStatus(t("privateLesson.connected"));
            lessonStartedAt.current = Date.now();
            beginTimer(created);
          },
          onClose() {
            if (
              !controller.signal.aborted &&
              (phaseRef.current === "active" || phaseRef.current === "wrapping")
            ) {
              finish(
                created,
                t("privateLesson.connectionClosed"),
                false,
                "disconnected",
              );
            }
          },
          onEvent: (realtimeEvent) =>
            handleRealtimeEvent(realtimeEvent, created),
          onAudioLevel: setTutorAudioLevel,
        },
        controller.signal,
      );
      if (controller.signal.aborted) connection.close();
      else {
        connectionRef.current = connection;
        setMicrophoneReady(true);
      }
    } catch (reason) {
      if (controller.signal.aborted) return;
      dispose();
      setPhase("setup");
      setError(
        reason instanceof PrivateLessonConnectionError
          ? t(`privateLesson.errors.${reason.code}`)
          : errorMessage(reason),
      );
      setStatus(t("privateLesson.ready"));
    }
  };

  const reset = () => {
    dispose();
    setSession(undefined);
    setTurns([]);
    turnsRef.current = [];
    setCompletedLesson(undefined);
    setReportError("");
    setError("");
    setRemaining(lessonDurationMinutes * 60);
    setStatus(t("privateLesson.ready"));
    setPhase("setup");
  };
  const reviewLesson = (lesson: SavedPrivateLesson) => {
    const ids = lesson.report?.recommendedReviewItemIds ?? [];
    if (ids.length)
      navigate(
        `/learn/session/smart?items=${encodeURIComponent(ids.join(","))}`,
      );
  };
  const saveSuggestion = async (
    lesson: SavedPrivateLesson,
    suggestion: NonNullable<
      SavedPrivateLesson["report"]
    >["newWordSuggestions"][number],
  ) => {
    if (!lesson.supportLanguageCode) return;
    const key = `${lesson.id}:${suggestion.sourceText}:${suggestion.translationText}`;
    if (savedSuggestions.has(key) || savingSuggestions.has(key)) return;
    setSuggestionSaveError("");
    setSavingSuggestions((current) => new Set(current).add(key));
    const eventId = crypto.randomUUID();
    try {
      await product(
        captureReceipt,
        "captures",
        "POST",
        {
          item: {
            sourceText: suggestion.sourceText,
            sourceLanguageCode: lesson.targetLanguageCode,
            translationLanguageCode: lesson.supportLanguageCode,
            itemType: suggestion.sourceText.includes(" ") ? "phrase" : "word",
            partOfSpeech: null,
            phoneticText: null,
            phoneticScheme: null,
          },
          translation: { text: suggestion.translationText, variants: [] },
          context: {
            sentenceText: suggestion.example,
            paragraphText: null,
            pageTitle: null,
            pageUrl: null,
            selectedText: suggestion.sourceText,
            sourceType: "web_manual",
            capturedAt: new Date().toISOString(),
          },
          senseDecision: { mode: "auto" },
        },
        eventId,
      );
      setSavedSuggestions((current) => new Set(current).add(key));
      window.dispatchEvent(new Event("gotit:library-changed"));
    } catch (reason) {
      setSuggestionSaveError(errorMessage(reason));
    } finally {
      setSavingSuggestions((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };
  const removeHistoryLesson = async (lesson: SavedPrivateLesson) => {
    await deletePrivateLesson(lesson.id);
    setHistory((current) => current.filter((item) => item.id !== lesson.id));
    window.dispatchEvent(new Event("gotit:lesson-assessment-updated"));
    if (selectedHistory?.id === lesson.id) setSelectedHistory(undefined);
  };
  const toggleMicrophone = () => {
    const nextMuted = !microphoneMuted;
    if (connectionRef.current?.setMicrophoneMuted(nextMuted))
      setMicrophoneMuted(nextMuted);
  };
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  const latestAssessmentLesson = history.find(
    (lesson) => lesson.status === "completed" && lesson.report?.assessment,
  );
  const currentMilestone = lessonSetup?.roadmap?.milestones.find(
    (item) => item.status === "current",
  );
  const profileLanguage = profile.languages.find(
    (language) =>
      language.languageCode.split("-")[0] === targetLanguage.split("-")[0],
  );
  const effectiveLevel =
    latestAssessmentLesson?.report?.assessment.overallLevel ||
    profileLanguage?.effectiveLevel ||
    profileLanguage?.selfAssessedLevel ||
    "A2";
  const targetLanguageLabel =
    languageOptions.find(([code]) => code === targetLanguage)?.[1] ||
    targetLanguage;
  const lessonTitle = currentMilestone
    ? t(`privateLesson.roadmap.stages.${currentMilestone.key}`, {
        defaultValue: currentMilestone.title,
      })
    : topic ||
      t("privateLesson.recommendedFallbackTitle", {
        defaultValue: "Everyday conversation",
      });
  const showLegacySetup = false;
  const toggleFocusArea = (area: PrivateLessonFocusArea) => {
    personalizationTouched.current = true;
    setFocusAreas((current) =>
      current.includes(area)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== area)
        : [...current, area],
    );
  };
  const chooseRoadmap = async (
    goalKind: "recommended" | "communication" | "grammar",
    goalKey: string,
  ) => {
    setRoadmapCreating(`${goalKind}:${goalKey}`);
    setError("");
    try {
      const roadmap = await createPrivateLessonRoadmap({
        targetLanguageCode: targetLanguage,
        goalKind,
        goalKey,
      });
      setLessonSetup((current) =>
        current ? { ...current, roadmap } : current,
      );
      setShowGoalChooser(false);
      const current = roadmap.milestones.find(
        (item) => item.status === "current",
      );
      if (current) {
        setTopic(current.communicationObjective);
        setGrammarFocus(current.grammarTopics.join(", "));
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setRoadmapCreating("");
    }
  };

  return (
    <div
      className={`private-lesson-page live-page page-enter${sessionFullscreen ? " session-fullscreen" : ""}`}
    >
      <section className="page-heading-row private-lesson-heading">
        <div>
          <p className="eyebrow">{t("privateLesson.eyebrow")}</p>
          <h1>{t("privateLesson.title")}</h1>
          <p>{t("privateLesson.description")}</p>
        </div>
        <span className="private-lesson-heading-icon" aria-hidden="true">
          <Mic2 size={34} />
        </span>
      </section>

      {phase === "setup" || phase === "preparing" ? (
        <>
          <section className="private-lesson-setup live-panel">
            <div className="private-lesson-intro">
              <span className="private-lesson-orb" aria-hidden="true">
                <MessageCircleMore size={34} />
              </span>
              <div>
                <h2>{t("privateLesson.setupTitle")}</h2>
              </div>
            </div>
            <div className="private-lesson-clean-content">
              {setupLoading ? (
                <div className="private-lesson-roadmap-loading">
                  <LoaderCircle className="spin" size={20} />
                  {t("privateLesson.preparingRecommendation", {
                    defaultValue: "Preparing a lesson for you…",
                  })}
                </div>
              ) : (
                <article className="private-lesson-recommendation">
                  <div
                    className="private-lesson-recommendation-icon"
                    aria-hidden="true"
                  >
                    <Sparkles size={24} />
                  </div>
                  <div className="private-lesson-recommendation-copy">
                    <small>
                      {t("privateLesson.recommendedForYou", {
                        defaultValue: "Recommended for you",
                      })}
                    </small>
                    <h3 dir="auto">{lessonTitle}</h3>
                    <p dir="auto">
                      {currentMilestone?.communicationObjective ||
                        latestAssessmentLesson?.report?.nextLessonPlan ||
                        t("privateLesson.recommendedFallbackDescription", {
                          defaultValue:
                            "A focused conversation matched to your current level.",
                        })}
                    </p>
                    <div className="private-lesson-summary-chips">
                      <span>
                        <Languages size={15} /> {targetLanguageLabel}
                      </span>
                      <span>
                        <Clock3 size={15} />{" "}
                        {t(
                          `privateLesson.durationOptions.${lessonDurationMinutes}`,
                        )}
                      </span>
                      {focusAreas.slice(0, 2).map((area) => (
                        <span key={area}>
                          {t(`privateLesson.focus.options.${area}`)}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              )}

              <form onSubmit={(event) => void startLesson(event)}>
                <button
                  className="button primary private-lesson-start"
                  type="submit"
                  disabled={
                    !targetLanguage.trim() ||
                    phase === "preparing" ||
                    setupLoading
                  }
                >
                  {phase === "preparing" ? (
                    <LoaderCircle className="spin" size={19} />
                  ) : (
                    <Sparkles size={19} />
                  )}
                  {phase === "preparing"
                    ? t("privateLesson.preparing")
                    : t("privateLesson.start")}
                </button>
              </form>

              <button
                type="button"
                className="button ghost private-lesson-customize"
                onClick={() => setShowLessonOptions(true)}
              >
                <Settings2 size={17} />
                {t("privateLesson.chooseAnotherFocus", {
                  defaultValue: "Choose another topic or focus",
                })}
              </button>

              <div className="private-lesson-quick-links">
                <button type="button" onClick={() => setShowLevelDetails(true)}>
                  <span className="private-lesson-quick-icon">
                    <TrendingUp size={19} />
                  </span>
                  <span>
                    <small>
                      {t("privateLesson.yourLevel", {
                        defaultValue: "Your level",
                      })}
                    </small>
                    <strong>{effectiveLevel}</strong>
                  </span>
                  <em>
                    {t("privateLesson.viewDetails", {
                      defaultValue: "View details",
                    })}
                  </em>
                  <ChevronRight size={18} />
                </button>
                <button type="button" onClick={() => setShowRoadmap(true)}>
                  <span className="private-lesson-quick-icon">
                    <Map size={19} />
                  </span>
                  <span>
                    <small>
                      {t("privateLesson.learningPath", {
                        defaultValue: "Learning path",
                      })}
                    </small>
                    <strong>
                      {lessonSetup?.roadmap
                        ? t("privateLesson.roadmapCurrentStage", {
                            defaultValue: "Current stage",
                          })
                        : t("privateLesson.roadmapCreatePath", {
                            defaultValue: "Create a path",
                          })}
                    </strong>
                  </span>
                  <em>{t("privateLesson.open", { defaultValue: "Open" })}</em>
                  <ChevronRight size={18} />
                </button>
              </div>

              <button
                type="button"
                className="private-lesson-settings-link"
                onClick={() => navigate("/settings#private-lessons")}
              >
                <Settings2 size={16} />
                {t("privateLesson.managePreferences", {
                  defaultValue:
                    "Manage language and lesson preferences in Settings",
                })}
              </button>
              <p className="private-lesson-privacy">
                <Headphones size={17} /> {t("privateLesson.privacy")}
              </p>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            {showLegacySetup && (
              <div className="private-lesson-legacy-setup" aria-hidden="true">
                {latestAssessmentLesson?.report && (
                  <section
                    className="private-lesson-latest-assessment"
                    aria-label={t("privateLesson.assessment.latest")}
                  >
                    <div className="private-lesson-assessment-heading">
                      <span>
                        <TrendingUp size={22} />
                      </span>
                      <div>
                        <p className="eyebrow">
                          {t("privateLesson.assessment.latest")}
                        </p>
                        <strong>
                          {
                            latestAssessmentLesson.report.assessment
                              .overallLevel
                          }
                        </strong>
                        <small>
                          {t(
                            `privateLesson.assessment.confidence.${latestAssessmentLesson.report.assessment.confidence}`,
                          )}
                        </small>
                      </div>
                    </div>
                    <SkillAssessment
                      assessment={latestAssessmentLesson.report.assessment}
                      compact
                      t={t}
                    />
                    <p className="private-lesson-continuity-note">
                      <Target size={16} />
                      <span>
                        <strong>{t("privateLesson.continuity.title")}</strong>{" "}
                        {latestAssessmentLesson.report.nextLessonPlan}
                      </span>
                    </p>
                  </section>
                )}
                {setupLoading ? (
                  <div className="private-lesson-roadmap-loading">
                    <LoaderCircle className="spin" size={20} />
                    {t("privateLesson.roadmap.loading", {
                      defaultValue: "Preparing your learning path…",
                    })}
                  </div>
                ) : lessonSetup ? (
                  <RoadmapPanel
                    setup={lessonSetup}
                    choosing={showGoalChooser || !lessonSetup.roadmap}
                    creating={roadmapCreating}
                    onShowChooser={() => setShowGoalChooser(true)}
                    onChoose={(kind, key) => void chooseRoadmap(kind, key)}
                    t={t}
                  />
                ) : null}
                <form
                  className="form-stack"
                  onSubmit={(event) => void startLesson(event)}
                >
                  <fieldset
                    className="plain-fieldset form-stack"
                    disabled={phase === "preparing"}
                  >
                    <div className="live-form-grid">
                      <label className="field">
                        <span>{t("privateLesson.targetLanguage")}</span>
                        <select
                          value={targetLanguage}
                          onChange={(event) =>
                            setTargetLanguage(event.target.value)
                          }
                          dir="auto"
                          required
                        >
                          {languageOptions.map(([code, label]) => (
                            <option key={code} value={code}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>{t("privateLesson.supportLanguage")}</span>
                        <select
                          value={supportLanguage}
                          onChange={(event) =>
                            setSupportLanguage(event.target.value)
                          }
                          dir="auto"
                        >
                          <option value="">
                            {t("privateLesson.noSupport")}
                          </option>
                          {languageOptions.map(([code, label]) => (
                            <option key={code} value={code}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>{t("privateLesson.duration")}</span>
                        <select
                          value={lessonDurationMinutes}
                          onChange={(event) =>
                            setLessonDurationMinutes(
                              Number(
                                event.target.value,
                              ) as PrivateLessonDurationMinutes,
                            )
                          }
                        >
                          {([1, 5, 10, 15] as const).map((value) => (
                            <option key={value} value={value}>
                              {t(`privateLesson.durationOptions.${value}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <details className="private-lesson-advanced">
                      <summary>
                        <span>
                          <strong>
                            {t("privateLesson.preferences.title", {
                              defaultValue: "Lesson preferences",
                            })}
                          </strong>
                          <small>
                            {t("privateLesson.preferences.saved", {
                              defaultValue:
                                "Saved automatically for this language",
                            })}
                          </small>
                        </span>
                        <Gauge size={20} />
                      </summary>
                      <div className="live-form-grid">
                        <label className="field">
                          <span>{t("privateLesson.teacherVoice")}</span>
                          <select
                            value={teacherVoice}
                            onChange={(event) =>
                              setTeacherVoice(
                                event.target.value as TeacherVoice,
                              )
                            }
                          >
                            <option value="female">
                              {t("privateLesson.voiceOptions.female")}
                            </option>
                            <option value="male">
                              {t("privateLesson.voiceOptions.male")}
                            </option>
                          </select>
                        </label>
                        <label className="field">
                          <span>{t("privateLesson.speechRate")}</span>
                          <select
                            value={speechRate}
                            onChange={(event) =>
                              setSpeechRate(
                                event.target.value as PrivateLessonSpeechRate,
                              )
                            }
                          >
                            {privateLessonSpeechRates.map((value) => (
                              <option key={value} value={value}>
                                {t(`privateLesson.speedOptions.${value}`)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="live-form-grid">
                        <label className="field">
                          <span>{t("privateLesson.level")}</span>
                          <select
                            value={level}
                            onChange={(event) =>
                              setLevel(event.target.value as "" | CefrLevel)
                            }
                          >
                            <option value="">
                              {t("privateLesson.automaticLevel")}
                            </option>
                            {(
                              ["A1", "A2", "B1", "B2", "C1", "C2"] as const
                            ).map((value) => (
                              <option key={value} value={value}>
                                {t(`privateLesson.levelOptions.${value}`)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>{t("privateLesson.topic")}</span>
                          <input
                            value={topic}
                            onChange={(event) => {
                              personalizationTouched.current = true;
                              setTopic(event.target.value);
                            }}
                            maxLength={120}
                            placeholder={t("privateLesson.topicPlaceholder")}
                          />
                        </label>
                      </div>
                      <div className="field private-lesson-focus-field">
                        <span>{t("privateLesson.focus.title")}</span>
                        <small>{t("privateLesson.focus.description")}</small>
                        <div className="private-lesson-focus-options">
                          {privateLessonFocusAreas.map((area) => (
                            <label
                              key={area}
                              className={
                                focusAreas.includes(area) ? "selected" : ""
                              }
                            >
                              <input
                                type="checkbox"
                                checked={focusAreas.includes(area)}
                                onChange={() => toggleFocusArea(area)}
                              />
                              <span>
                                {t(`privateLesson.focus.options.${area}`)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <fieldset className="private-lesson-correction-field">
                        <legend>
                          {t("privateLesson.vocabularyMode.title")}
                        </legend>
                        <small>
                          {t("privateLesson.vocabularyMode.description")}
                        </small>
                        <div className="private-lesson-correction-options private-lesson-vocabulary-options">
                          {privateLessonVocabularyModes.map((mode) => (
                            <label
                              key={mode}
                              className={
                                vocabularyMode === mode ? "selected" : ""
                              }
                            >
                              <input
                                type="radio"
                                name="vocabulary-mode"
                                value={mode}
                                checked={vocabularyMode === mode}
                                onChange={() => {
                                  personalizationTouched.current = true;
                                  setVocabularyMode(mode);
                                }}
                              />
                              <span>
                                <strong>
                                  {t(
                                    `privateLesson.vocabularyMode.options.${mode}.title`,
                                  )}
                                </strong>
                                <small>
                                  {t(
                                    `privateLesson.vocabularyMode.options.${mode}.description`,
                                  )}
                                </small>
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset className="private-lesson-correction-field">
                        <legend>
                          {t("privateLesson.correctionMode.title")}
                        </legend>
                        <small>
                          {t("privateLesson.correctionMode.description")}
                        </small>
                        <div className="private-lesson-correction-options">
                          {privateLessonCorrectionModes.map((mode) => (
                            <label
                              key={mode}
                              className={
                                correctionMode === mode ? "selected" : ""
                              }
                            >
                              <input
                                type="radio"
                                name="correction-mode"
                                value={mode}
                                checked={correctionMode === mode}
                                onChange={() => {
                                  personalizationTouched.current = true;
                                  setCorrectionMode(mode);
                                }}
                              />
                              <span>
                                <strong>
                                  {t(
                                    `privateLesson.correctionMode.options.${mode}.title`,
                                  )}
                                </strong>
                                <small>
                                  {t(
                                    `privateLesson.correctionMode.options.${mode}.description`,
                                  )}
                                </small>
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <label className="field">
                        <span>{t("privateLesson.customFocus")}</span>
                        <textarea
                          value={customFocus}
                          onChange={(event) => {
                            personalizationTouched.current = true;
                            setCustomFocus(event.target.value);
                          }}
                          maxLength={300}
                          rows={3}
                          placeholder={t(
                            "privateLesson.customFocusPlaceholder",
                          )}
                        />
                      </label>
                      <label className="field">
                        <span>{t("privateLesson.grammarFocus")}</span>
                        <input
                          value={grammarFocus}
                          onChange={(event) => {
                            personalizationTouched.current = true;
                            setGrammarFocus(event.target.value);
                          }}
                          maxLength={160}
                          placeholder={t("privateLesson.grammarPlaceholder")}
                        />
                      </label>
                    </details>
                    <button
                      className="button primary private-lesson-start"
                      type="submit"
                      disabled={!targetLanguage.trim() || phase === "preparing"}
                    >
                      {phase === "preparing" ? (
                        <LoaderCircle className="spin" size={19} />
                      ) : (
                        <Sparkles size={19} />
                      )}
                      {phase === "preparing"
                        ? t("privateLesson.preparing")
                        : t("privateLesson.start")}
                    </button>
                  </fieldset>
                </form>
                <p className="private-lesson-privacy">
                  <Headphones size={17} /> {t("privateLesson.privacy")}
                </p>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            )}
          </section>
          <Modal
            open={showLevelDetails}
            onClose={() => setShowLevelDetails(false)}
            title={t("privateLesson.levelDetailsTitle", {
              defaultValue: "Your current level",
            })}
            size="lg"
          >
            <div className="modal-body private-lesson-detail-modal">
              <div className="private-lesson-level-hero">
                <TrendingUp size={24} />
                <div>
                  <small>
                    {t("privateLesson.assessmentCurrentEstimate", {
                      defaultValue: "Current estimate",
                    })}
                  </small>
                  <strong>{effectiveLevel}</strong>
                </div>
              </div>
              {latestAssessmentLesson?.report ? (
                <>
                  <SkillAssessment
                    assessment={latestAssessmentLesson.report.assessment}
                    t={t}
                  />
                  <p className="private-lesson-continuity-note">
                    <Target size={16} />
                    <span>
                      <strong>{t("privateLesson.continuity.title")}</strong>{" "}
                      {latestAssessmentLesson.report.nextLessonPlan}
                    </span>
                  </p>
                </>
              ) : (
                <p>
                  {t("privateLesson.assessmentNoLessonYet", {
                    defaultValue:
                      "Complete a lesson and your detailed skill estimate will appear here.",
                  })}
                </p>
              )}
              <div className="modal-actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setShowLevelDetails(false)}
                >
                  {t("common.close")}
                </button>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => {
                    setShowLevelDetails(false);
                    navigate("/settings#languages");
                  }}
                >
                  {t("privateLesson.updateLevel", {
                    defaultValue: "Update level in Settings",
                  })}
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            open={showRoadmap}
            onClose={() => setShowRoadmap(false)}
            title={t("privateLesson.roadmapModalTitle", {
              defaultValue: "My learning path",
            })}
            size="lg"
          >
            <div className="modal-body private-lesson-detail-modal">
              {lessonSetup ? (
                <RoadmapPanel
                  setup={lessonSetup}
                  choosing={showGoalChooser || !lessonSetup.roadmap}
                  creating={roadmapCreating}
                  onShowChooser={() => setShowGoalChooser(true)}
                  onChoose={(kind, key) => void chooseRoadmap(kind, key)}
                  t={t}
                />
              ) : (
                <div className="private-lesson-roadmap-loading">
                  <LoaderCircle className="spin" size={20} />
                  {t("privateLesson.roadmap.loading")}
                </div>
              )}
            </div>
          </Modal>

          <Modal
            open={showLessonOptions}
            onClose={() => setShowLessonOptions(false)}
            title={t("privateLesson.lessonOptionsTitle", {
              defaultValue: "Adjust this lesson",
            })}
            size="lg"
          >
            <form
              className="modal-body form-stack"
              onSubmit={(event) => {
                setShowLessonOptions(false);
                void startLesson(event);
              }}
            >
              <p className="muted-note">
                {t("privateLesson.lessonOptionsDescription", {
                  defaultValue:
                    "These changes apply to this lesson only. Your regular preferences stay in Settings.",
                })}
              </p>
              <div className="live-form-grid">
                <label className="field">
                  <span>{t("privateLesson.duration")}</span>
                  <select
                    value={lessonDurationMinutes}
                    onChange={(event) =>
                      setLessonDurationMinutes(
                        Number(
                          event.target.value,
                        ) as PrivateLessonDurationMinutes,
                      )
                    }
                  >
                    {([1, 5, 10, 15] as const).map((value) => (
                      <option key={value} value={value}>
                        {t(`privateLesson.durationOptions.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t("privateLesson.topic")}</span>
                  <input
                    value={topic}
                    onChange={(event) => {
                      personalizationTouched.current = true;
                      setTopic(event.target.value);
                    }}
                    maxLength={120}
                    placeholder={t("privateLesson.topicPlaceholder")}
                  />
                </label>
                <label className="field full">
                  <span>{t("privateLesson.grammarFocus")}</span>
                  <input
                    value={grammarFocus}
                    onChange={(event) => {
                      personalizationTouched.current = true;
                      setGrammarFocus(event.target.value);
                    }}
                    maxLength={160}
                    placeholder={t("privateLesson.grammarPlaceholder")}
                  />
                </label>
              </div>
              <div className="field private-lesson-focus-field">
                <span>{t("privateLesson.focus.title")}</span>
                <small>{t("privateLesson.focus.description")}</small>
                <div className="private-lesson-focus-options">
                  {privateLessonFocusAreas.map((area) => (
                    <label
                      key={area}
                      className={focusAreas.includes(area) ? "selected" : ""}
                    >
                      <input
                        type="checkbox"
                        checked={focusAreas.includes(area)}
                        onChange={() => toggleFocusArea(area)}
                      />
                      <span>{t(`privateLesson.focus.options.${area}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="field">
                <span>{t("privateLesson.customFocus")}</span>
                <textarea
                  value={customFocus}
                  onChange={(event) => {
                    personalizationTouched.current = true;
                    setCustomFocus(event.target.value);
                  }}
                  maxLength={300}
                  rows={2}
                  placeholder={t("privateLesson.customFocusPlaceholder")}
                />
              </label>
              <div className="modal-actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setShowLessonOptions(false)}
                >
                  {t("feedback.cancel")}
                </button>
                <button className="button primary" type="submit">
                  <Sparkles size={18} /> {t("privateLesson.start")}
                </button>
              </div>
            </form>
          </Modal>
          <section className="private-lesson-history live-panel">
            <div className="private-lesson-history-heading">
              <div>
                <p className="eyebrow">{t("privateLesson.history.eyebrow")}</p>
                <h2>{t("privateLesson.history.title")}</h2>
              </div>
              <BookOpen size={24} aria-hidden="true" />
            </div>
            {historyError ? (
              <p className="form-error" role="alert">
                {historyError}
              </p>
            ) : history.length ? (
              <div className="private-lesson-history-list">
                {history.map((lesson) => (
                  <article key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedHistory(lesson)}
                    >
                      <strong dir="auto">{lesson.topic}</strong>
                      <span>
                        {new Date(lesson.startedAt).toLocaleDateString()} ·{" "}
                        {lesson.level}
                      </span>
                      <small
                        dir="auto"
                        lang={
                          lesson.report ? lesson.targetLanguageCode : undefined
                        }
                      >
                        {lesson.report?.summary ??
                          t(`privateLesson.history.status.${lesson.status}`)}
                      </small>
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={t("privateLesson.history.delete")}
                      onClick={() =>
                        void removeHistoryLesson(lesson).catch((reason) =>
                          setHistoryError(errorMessage(reason)),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p>{t("privateLesson.history.empty")}</p>
            )}
            {selectedHistory?.report && (
              <LessonReportView
                lesson={selectedHistory}
                savedSuggestions={savedSuggestions}
                savingSuggestions={savingSuggestions}
                saveError={suggestionSaveError}
                onReview={() => reviewLesson(selectedHistory)}
                onSaveSuggestion={(suggestion) =>
                  void saveSuggestion(selectedHistory, suggestion)
                }
                t={t}
              />
            )}
          </section>
        </>
      ) : (
        createPortal(
          <section
            className={`private-lesson-session live-panel${phase === "ended" ? " has-report" : ""}`}
            role="dialog"
            aria-label={t("privateLesson.title")}
          >
            <header className="private-lesson-session-header">
              <div>
                <p className="eyebrow">{t("privateLesson.active")}</p>
                <h2 dir="auto">{session?.lesson.topic}</h2>
                <span className={`private-lesson-status ${phase}`}>
                  <i aria-hidden="true" /> {status}
                </span>
              </div>
              <div className="private-lesson-header-controls">
                <button
                  className="icon-button private-lesson-sidebar-button"
                  type="button"
                  aria-label={t("shell.openMenu")}
                  onClick={() =>
                    window.dispatchEvent(new Event("gotit:open-sidebar"))
                  }
                >
                  <Menu size={20} />
                </button>
                <button
                  className={`private-lesson-mute${microphoneMuted ? " muted" : ""}`}
                  type="button"
                  aria-label={
                    microphoneMuted
                      ? t("privateLesson.unmuteMicrophone")
                      : t("privateLesson.muteMicrophone")
                  }
                  aria-pressed={microphoneMuted}
                  disabled={!microphoneReady || phase === "wrapping"}
                  onClick={toggleMicrophone}
                >
                  {microphoneMuted ? <MicOff size={19} /> : <Mic2 size={19} />}
                  <span>
                    {microphoneMuted
                      ? t("privateLesson.unmuteMicrophone")
                      : t("privateLesson.muteMicrophone")}
                  </span>
                </button>
                <div
                  className="private-lesson-timer"
                  aria-label={t("privateLesson.timerLabel")}
                  aria-live="polite"
                >
                  {minutes}:{seconds}
                </div>
              </div>
            </header>

            <div className="private-lesson-meta">
              <span>
                <Languages size={16} /> {session?.lesson.targetLanguageCode}
              </span>
              <span>{session?.lesson.level}</span>
              <span>
                <UserRound size={16} />
                {session &&
                  t(
                    `privateLesson.voiceOptions.${session.lesson.teacherVoice}`,
                  )}
              </span>
              <span>
                <Gauge size={16} />
                {session &&
                  t(`privateLesson.speedOptions.${session.lesson.speechRate}`)}
              </span>
              <span>
                <MessageCircleMore size={16} />
                {session &&
                  t(
                    `privateLesson.correctionMode.options.${session.lesson.correctionMode}.title`,
                  )}
              </span>
              <span>
                <BookOpen size={16} />
                {session &&
                  t(
                    `privateLesson.vocabularyMode.options.${session.lesson.vocabularyMode}.title`,
                  )}
              </span>
              {session?.lesson.grammarFocus && (
                <span dir="auto">{session.lesson.grammarFocus}</span>
              )}
            </div>

            {phase === "ended" ? (
              <div className="private-lesson-report-shell">
                {reportLoading ? (
                  <div className="private-lesson-report-loading" role="status">
                    <LoaderCircle className="spin" size={28} />
                    <p>{t("privateLesson.report.preparing")}</p>
                  </div>
                ) : completedLesson?.report ? (
                  <LessonReportView
                    lesson={completedLesson}
                    savedSuggestions={savedSuggestions}
                    savingSuggestions={savingSuggestions}
                    saveError={suggestionSaveError}
                    onReview={() => reviewLesson(completedLesson)}
                    onSaveSuggestion={(suggestion) =>
                      void saveSuggestion(completedLesson, suggestion)
                    }
                    t={t}
                  />
                ) : (
                  <div className="private-lesson-report-loading">
                    <p role="alert">
                      {reportError || t("privateLesson.report.failed")}
                    </p>
                    {session && (
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => void finalizeLesson(session)}
                      >
                        {t("privateLesson.report.retry")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="private-lesson-tutor-stage">
                  <TeacherAvatar
                    activity={
                      phase === "connecting" ||
                      phase === "wrapping" ||
                      responding
                        ? "thinking"
                        : phase === "active"
                          ? "listening"
                          : "idle"
                    }
                    audioLevel={tutorAudioLevel}
                    active={phase === "active" || phase === "wrapping"}
                    label={status}
                    variant={session?.lesson.teacherVoice ?? teacherVoice}
                  />
                  <div
                    className="private-lesson-tutor-caption"
                    aria-live="polite"
                  >
                    <strong>{t("privateLesson.roles.tutor")}</strong>
                    <span>{status}</span>
                  </div>
                </div>

                <div className="private-lesson-words">
                  <strong>{t("privateLesson.wordsTitle")}</strong>
                  <div>
                    {session?.lesson.targetWords.length ? (
                      session.lesson.targetWords.map((word) => (
                        <span key={word.learningItemId} dir="auto">
                          {word.sourceText} · {word.translationText}
                        </span>
                      ))
                    ) : (
                      <span>{t("privateLesson.noWords")}</span>
                    )}
                  </div>
                </div>

                <div
                  className="private-lesson-transcript"
                  aria-live="polite"
                  ref={transcriptRef}
                >
                  <div className="private-lesson-transcript-title">
                    <MessageCircleMore size={18} />
                    <strong>{t("privateLesson.transcriptTitle")}</strong>
                  </div>
                  {turns.length ? (
                    turns.map((turn) => (
                      <div
                        className={`private-lesson-turn ${turn.role}`}
                        key={turn.id}
                      >
                        <small>{t(`privateLesson.roles.${turn.role}`)}</small>
                        <p dir="auto">{turn.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="private-lesson-listening">
                      {phase === "connecting" ? (
                        <LoaderCircle className="spin" size={24} />
                      ) : (
                        <span
                          className="private-lesson-wave"
                          aria-hidden="true"
                        >
                          <i /> <i /> <i /> <i /> <i />
                        </span>
                      )}
                      <p>{status}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {phase === "ended" ? (
              <div className="private-lesson-actions private-lesson-report-actions">
                <button
                  className="button primary"
                  type="button"
                  onClick={reset}
                >
                  <RotateCcw size={18} /> {t("privateLesson.restart")}
                </button>
              </div>
            ) : (
              <div className="private-lesson-actions">
                {session?.realtime.translationEvent && (
                  <button
                    className="button secondary"
                    type="button"
                    disabled={responding || phase === "wrapping"}
                    onClick={() => requestTranslation(session)}
                  >
                    <Languages size={17} /> {t("privateLesson.translateLast")}
                  </button>
                )}
                <button
                  className="button secondary"
                  type="button"
                  disabled={phase === "wrapping"}
                  onClick={() => session && requestWrapUp(session, "stopped")}
                >
                  {phase === "wrapping" ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Square size={16} />
                  )}
                  {phase === "wrapping"
                    ? t("privateLesson.finishing")
                    : t("privateLesson.finish")}
                </button>
              </div>
            )}
          </section>,
          document.body,
        )
      )}
      <audio ref={audioRef} autoPlay />
    </div>
  );
}

function RoadmapPanel({
  setup,
  choosing,
  creating,
  onShowChooser,
  onChoose,
  t,
}: {
  setup: PrivateLessonSetup;
  choosing: boolean;
  creating: string;
  onShowChooser: () => void;
  onChoose: (
    kind: "recommended" | "communication" | "grammar",
    key: string,
  ) => void;
  t: TFunction;
}) {
  const roadmap = setup.roadmap;
  const label = (section: "goals" | "topics", key: string) =>
    t(`privateLesson.roadmap.${section}.${key}`, {
      defaultValue: key
        .split("-")
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(" "),
    });
  if (!choosing && roadmap) {
    const completed = roadmap.milestones.filter(
      (item) => item.status === "completed",
    ).length;
    const current = roadmap.milestones.find(
      (item) => item.status === "current",
    );
    const progress = Math.round(
      ((completed * 100 + (current?.progressScore ?? 0)) /
        roadmap.milestones.length) *
        1,
    );
    return (
      <section className="private-lesson-roadmap">
        <header>
          <div>
            <p className="eyebrow">
              {t("privateLesson.roadmap.eyebrow", {
                defaultValue: "Your learning roadmap",
              })}
            </p>
            <h3>
              {label(
                roadmap.goalKind === "communication" ? "goals" : "topics",
                roadmap.goalKey === "recommended-foundation"
                  ? setup.curriculum.recommended.goalKey
                  : roadmap.goalKey,
              )}
            </h3>
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={onShowChooser}
          >
            {t("privateLesson.roadmap.change", { defaultValue: "Change goal" })}
          </button>
        </header>
        <div className="private-lesson-roadmap-overall">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="private-lesson-milestones">
          {roadmap.milestones.map((milestone) => (
            <article className={milestone.status} key={milestone.id}>
              <span>
                {milestone.status === "completed" ? (
                  <Check size={16} />
                ) : (
                  milestone.position
                )}
              </span>
              <div>
                <strong>
                  {t(`privateLesson.roadmap.stages.${milestone.key}`, {
                    defaultValue: milestone.title,
                  })}
                </strong>
                {milestone.status === "current" && (
                  <>
                    <small>
                      {milestone.grammarTopics
                        .map((key) => label("topics", key))
                        .join(" · ")}
                    </small>
                    <div className="private-lesson-milestone-score">
                      <i style={{ width: `${milestone.progressScore}%` }} />
                    </div>
                    <small>
                      {t("privateLesson.roadmap.evidence", {
                        count: milestone.evidenceLessonCount,
                        score: milestone.progressScore,
                        defaultValue: `${milestone.evidenceLessonCount}/2 lessons · ${milestone.progressScore}/75 score`,
                      })}
                    </small>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
        {current && (
          <p className="private-lesson-roadmap-note">
            <Target size={17} />
            {t("privateLesson.roadmap.currentHint", {
              defaultValue:
                "This lesson will revisit the current milestone and advance only after the target task is completed consistently.",
            })}
          </p>
        )}
      </section>
    );
  }

  const recommended = setup.curriculum.recommended;
  return (
    <section className="private-lesson-roadmap private-lesson-goal-chooser">
      <header>
        <div>
          <p className="eyebrow">
            {t("privateLesson.roadmap.eyebrow", {
              defaultValue: "Your learning roadmap",
            })}
          </p>
          <h3>
            {t("privateLesson.roadmap.chooseTitle", {
              defaultValue: "Choose one direction — we’ll build the path",
            })}
          </h3>
          <p>
            {t("privateLesson.roadmap.chooseDescription", {
              defaultValue:
                "Start with our recommendation or choose a communication goal or English skill. You can change it later.",
            })}
          </p>
        </div>
      </header>
      <button
        className="private-lesson-recommended-goal"
        type="button"
        disabled={Boolean(creating)}
        onClick={() => onChoose("recommended", recommended.goalKey)}
      >
        <Sparkles size={22} />
        <span>
          <small>
            {t("privateLesson.roadmap.recommended", {
              defaultValue: "Recommended for you",
            })}
          </small>
          <strong>{label("topics", recommended.goalKey)}</strong>
          <em>
            {t("privateLesson.roadmap.recommendedReason", {
              defaultValue:
                "Based on your current level and the most useful next skill",
            })}
          </em>
        </span>
        {creating.startsWith("recommended:") && (
          <LoaderCircle className="spin" size={19} />
        )}
      </button>
      <details>
        <summary>
          {t("privateLesson.roadmap.communicationTitle", {
            defaultValue: "Choose a communication goal",
          })}
        </summary>
        <div className="private-lesson-goal-grid">
          {setup.curriculum.communicationGoals.map(({ key }) => (
            <button
              key={key}
              type="button"
              disabled={Boolean(creating)}
              onClick={() => onChoose("communication", key)}
            >
              <MessageCircleMore size={18} /> {label("goals", key)}
            </button>
          ))}
        </div>
      </details>
      <details>
        <summary>
          {t("privateLesson.roadmap.grammarTitle", {
            defaultValue: "Explore English skills",
          })}
        </summary>
        <div className="private-lesson-goal-grid">
          {setup.curriculum.grammarTopics.map(({ key, cefr }) => (
            <button
              key={key}
              type="button"
              disabled={Boolean(creating)}
              onClick={() => onChoose("grammar", key)}
            >
              <span>{cefr}</span> {label("topics", key)}
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}

function LessonReportView({
  lesson,
  savedSuggestions,
  savingSuggestions,
  saveError,
  onReview,
  onSaveSuggestion,
  t,
}: {
  lesson: SavedPrivateLesson;
  savedSuggestions: Set<string>;
  savingSuggestions: Set<string>;
  saveError: string;
  onReview: () => void;
  onSaveSuggestion: (
    suggestion: NonNullable<
      SavedPrivateLesson["report"]
    >["newWordSuggestions"][number],
  ) => void;
  t: TFunction;
}) {
  const report = lesson.report;
  if (!report) return null;
  return (
    <div className="private-lesson-report">
      <section className="private-lesson-report-summary">
        <p className="eyebrow">{t("privateLesson.report.title")}</p>
        <h3 dir="auto" lang={lesson.targetLanguageCode}>
          {report.summary}
        </h3>
        <p>
          <strong>{t("privateLesson.report.next")}</strong>{" "}
          <span dir="auto" lang={lesson.targetLanguageCode}>
            {report.nextLessonPlan}
          </span>
        </p>
      </section>
      <SkillAssessment assessment={report.assessment} t={t} />
      <div className="private-lesson-report-grid">
        <section>
          <h4>{t("privateLesson.report.strengths")}</h4>
          {report.strengths.length ? (
            <ul>
              {report.strengths.map((item) => (
                <li key={item} dir="auto" lang={lesson.targetLanguageCode}>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("privateLesson.report.noEvidence")}</p>
          )}
        </section>
        <section>
          <h4>{t("privateLesson.report.corrections")}</h4>
          {report.corrections.length ? (
            report.corrections.map((item, index) => (
              <article
                key={`${item.original}:${index}`}
                dir="auto"
                lang={lesson.targetLanguageCode}
              >
                <del>{item.original}</del> <strong>{item.corrected}</strong>
                <p>{item.explanation}</p>
              </article>
            ))
          ) : (
            <p>{t("privateLesson.report.noCorrections")}</p>
          )}
        </section>
        <section>
          <h4>{t("privateLesson.report.grammar")}</h4>
          {report.grammarPoints.length ? (
            report.grammarPoints.map((item) => (
              <article
                key={item.topic}
                dir="auto"
                lang={lesson.targetLanguageCode}
              >
                <strong>{item.topic}</strong>
                <p>{item.explanation}</p>
                {item.example && <small>{item.example}</small>}
              </article>
            ))
          ) : (
            <p>{t("privateLesson.report.noGrammar")}</p>
          )}
        </section>
        <section>
          <h4>{t("privateLesson.report.vocabulary")}</h4>
          {report.vocabulary.length ? (
            report.vocabulary.map((item) => (
              <article
                key={item.learningItemId}
                dir="auto"
                lang={lesson.targetLanguageCode}
              >
                <strong>
                  {item.sourceText} · {item.translationText}
                </strong>
                <p>{item.note}</p>
              </article>
            ))
          ) : (
            <p>{t("privateLesson.report.noVocabulary")}</p>
          )}
        </section>
      </div>
      {report.newWordSuggestions.length > 0 && (
        <section className="private-lesson-report-suggestions">
          <h4>{t("privateLesson.report.suggestions")}</h4>
          <div>
            {report.newWordSuggestions.map((suggestion) => {
              const key = `${lesson.id}:${suggestion.sourceText}:${suggestion.translationText}`;
              const saved = savedSuggestions.has(key);
              const saving = savingSuggestions.has(key);
              return (
                <article key={key}>
                  <span dir="auto" lang={lesson.targetLanguageCode}>
                    <strong>{suggestion.sourceText}</strong> ·{" "}
                    {suggestion.translationText}
                  </span>
                  {lesson.supportLanguageCode && (
                    <button
                      className="button secondary"
                      type="button"
                      disabled={saved || saving}
                      onClick={() => onSaveSuggestion(suggestion)}
                    >
                      {saving ? (
                        <LoaderCircle className="spin" size={15} />
                      ) : saved ? (
                        <Check size={15} />
                      ) : (
                        <Plus size={15} />
                      )}
                      {saving
                        ? t("capture.saving")
                        : t(
                            saved
                              ? "privateLesson.report.saved"
                              : "privateLesson.report.saveWord",
                          )}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          {saveError && (
            <p className="form-error" role="alert">
              {saveError}
            </p>
          )}
        </section>
      )}
      {report.recommendedReviewItemIds.length > 0 && (
        <button
          className="button primary private-lesson-review"
          type="button"
          onClick={onReview}
        >
          <BookOpen size={17} /> {t("privateLesson.report.reviewNow")}
        </button>
      )}
    </div>
  );
}

function SkillAssessment({
  assessment,
  compact = false,
  t,
}: {
  assessment: NonNullable<SavedPrivateLesson["report"]>["assessment"];
  compact?: boolean;
  t: TFunction;
}) {
  const entries = Object.entries(assessment.skills) as Array<
    [
      keyof typeof assessment.skills,
      (typeof assessment.skills)[keyof typeof assessment.skills],
    ]
  >;
  const levelLabel = assessment.overallLevel
    ? assessment.overallLevel
    : assessment.levelRange
      ? assessment.levelRange.from === assessment.levelRange.to
        ? assessment.levelRange.from
        : `${assessment.levelRange.from}–${assessment.levelRange.to}`
      : t("privateLesson.assessment.insufficient");
  return (
    <section
      className={`private-lesson-assessment${compact ? " compact" : ""}`}
    >
      {!compact && (
        <header>
          <div>
            <p className="eyebrow">{t("privateLesson.assessment.title")}</p>
            <h4>
              {assessment.evidenceSufficient
                ? t("privateLesson.assessment.overall", { level: levelLabel })
                : t("privateLesson.assessment.provisional", {
                    range: levelLabel,
                  })}
            </h4>
            <p>{assessment.basis}</p>
          </div>
          <span>
            {t(`privateLesson.assessment.confidence.${assessment.confidence}`)}
          </span>
        </header>
      )}
      <div className="private-lesson-skill-grid">
        {entries.map(([skill, result]) => (
          <article key={skill} title={result.feedback}>
            <div>
              <strong>{t(`privateLesson.assessment.skills.${skill}`)}</strong>
              <span>
                {result.level ?? "—"}
                {result.evidenceQuality !== "insufficient"
                  ? ` · ${result.score}`
                  : ""}
              </span>
            </div>
            <div
              className="private-lesson-skill-track"
              aria-label={
                result.evidenceQuality === "insufficient"
                  ? t("privateLesson.assessment.insufficient")
                  : `${result.score}/100`
              }
            >
              <i
                style={{
                  width:
                    result.evidenceQuality === "insufficient"
                      ? "0%"
                      : `${result.score}%`,
                }}
              />
            </div>
            {!compact && <p dir="auto">{result.feedback}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function usePrivateLessonViewport(enabled: boolean) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const body = document.body;
    const viewport = window.visualViewport;
    let animationFrame = 0;

    const update = () => {
      const height = Math.round(viewport?.height ?? window.innerHeight);
      root.style.setProperty("--private-lesson-viewport-height", `${height}px`);
      body.classList.toggle("private-lesson-viewport-short", height < 760);
      body.classList.toggle("private-lesson-viewport-compact", height < 640);
    };
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(update);
    };

    body.classList.add("private-lesson-session-open");
    update();
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("orientationchange", scheduleUpdate);
    viewport?.addEventListener("resize", scheduleUpdate);
    viewport?.addEventListener("scroll", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("orientationchange", scheduleUpdate);
      viewport?.removeEventListener("resize", scheduleUpdate);
      viewport?.removeEventListener("scroll", scheduleUpdate);
      body.classList.remove(
        "private-lesson-session-open",
        "private-lesson-viewport-short",
        "private-lesson-viewport-compact",
      );
      root.style.removeProperty("--private-lesson-viewport-height");
    };
  }, [enabled]);
}
