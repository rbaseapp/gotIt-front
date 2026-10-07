import {
  useCallback,
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
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { TeacherAvatar } from "../components/TeacherAvatar";
import { TeacherVoicePreview } from "../components/TeacherVoicePreview";
import { LessonWorkspace } from "../components/LessonWorkspace";
import { LanguageCombobox } from "../components/LanguageCombobox";
import { PrivateLessonText } from "../lib/privateLessonText";
import { PrivateLessonFlow } from "../lib/privateLessonFlow";
import { Modal } from "../components/Modal";
import { speak } from "../lib/utils";
import { readLessonDraft, saveLessonDraft } from "../lib/lessonDraft";
import { courseApi, type Course } from "../lib/courses";
import { LessonSummary } from "../components/LessonSummary";
import { learningReturn } from "../lib/learningNavigation";
import { LessonHomeworkCard } from "./HomeworkPage";
import "../courses.css";
import { useApp } from "../context/AppContext";
import { getBilingualLanguageOptions } from "../lib/languages";
import { captureReceipt, errorMessage, product } from "../lib/product";
import { ApiError } from "../lib/api";
import { billing } from "../lib/billing";
import { useResource } from "../lib/useResource";
import {
  completePrivateLessonSession,
  connectPrivateLesson,
  createPrivateLessonRoadmap,
  createPrivateLessonSession,
  deletePrivateLesson,
  listPrivateLessons,
  getPrivateLessonSetup,
  getLessonUnit,
  type LessonUnit,
  getSavedPrivateLessonLanguage,
  lessonActivityApi,
  type LessonActivity,
  type LessonActivityCommand,
  PrivateLessonConnectionError,
  type PrivateLessonConnection,
  type PrivateLessonDurationMinutes,
  type PrivateLessonMode,
  type PrivateLessonTeachingLanguage,
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

function sameBaseLanguage(first: string, second: string) {
  try {
    return (
      new Intl.Locale(first).language.toLowerCase() ===
      new Intl.Locale(second).language.toLowerCase()
    );
  } catch {
    return (
      first.toLowerCase().split("-")[0] === second.toLowerCase().split("-")[0]
    );
  }
}

const speechRateMultipliers: Record<PrivateLessonSpeechRate, number> = {
  very_slow: 0.7,
  slow: 0.85,
  normal: 1,
  fast: 1.2,
  very_fast: 1.4,
};

export function PrivateLessonPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const courseId = searchParams.get("course");
  const packId = searchParams.get("pack");
  useLayoutEffect(() => {
    if (packId) window.scrollTo({ top: 0, behavior: "instant" });
  }, [packId]);
  const minuteBalance = useResource(
    useCallback(
      () => (packId ? billing.minutes() : Promise.resolve(null)),
      [packId],
    ),
  );
  const [unit, setUnit] = useState<LessonUnit>();
  const [unitError, setUnitError] = useState("");
  useEffect(() => {
    setUnit(undefined);
    setUnitError("");
    if (!packId) return;
    let live = true;
    getLessonUnit(packId)
      .then((result) => {
        if (live) setUnit(result.unit);
      })
      .catch((reason) => {
        if (live) setUnitError(errorMessage(reason));
      });
    return () => {
      live = false;
    };
  }, [packId]);
  const [courseData, setCourseData] = useState<Course | null>(null);
  const [courseError, setCourseError] = useState("");
  const [courseRetry, setCourseRetry] = useState(0);
  const { profile, retryProfile, user } = useApp();
  const languageOptions = getBilingualLanguageOptions();
  const [targetLanguage, setTargetLanguage] = useState(
    searchParams.get("language") ||
      getSavedPrivateLessonLanguage(
        profile.languages[0]?.languageCode ||
          profile.defaultSourceLanguage ||
          "en",
      ),
  );
  const [supportLanguage, setSupportLanguage] = useState(
    profile.defaultTranslationLanguage || "",
  );
  const [lessonMode, setLessonMode] = useState<PrivateLessonMode>("standard");
  const [teachingLanguage, setTeachingLanguage] =
    useState<PrivateLessonTeachingLanguage>("target");
  const [courseTeachingLanguage, setCourseTeachingLanguage] =
    useState<PrivateLessonTeachingLanguage>("target");
  const [level, setLevel] = useState<"" | CefrLevel>("");
  const [teacherVoice, setTeacherVoice] = useState<TeacherVoice>("female");
  const [speechRate, setSpeechRate] =
    useState<PrivateLessonSpeechRate>("normal");
  const [lessonDurationMinutes, setLessonDurationMinutes] =
    useState<PrivateLessonDurationMinutes>(5);
  const selectedUnitStation = unit?.teacherStations?.find(
    (step) => step.station === (searchParams.get("station") || "supported"),
  );
  const plannedMinutes = packId
    ? (selectedUnitStation?.durationMinutes ?? 5)
    : lessonDurationMinutes;
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
  useEffect(() => {
    if (!courseId) return;
    let live = true;
    setCourseError("");
    setCourseData(null);
    courseApi
      .get(courseId)
      .then((result) => {
        if (live) setCourseData(result.course);
      })
      .catch((reason) => {
        if (live) setCourseError(errorMessage(reason));
      });
    return () => {
      live = false;
    };
  }, [courseId, courseRetry]);
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const [status, setStatus] = useState(t("privateLesson.ready"));
  const [translatedTurn, setTranslatedTurn] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState<PrivateLessonSession>();
  const [remaining, setRemaining] = useState(300);
  const [tutorAudioLevel, setTutorAudioLevel] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const turnsRef = useRef<Turn[]>([]);
  const [completedLesson, setCompletedLesson] = useState<SavedPrivateLesson>();
  const [reportLoading, setReportLoading] = useState(false);
  const [reportRequested, setReportRequested] = useState(false);
  const reportRequestedRef = useRef(reportRequested);
  reportRequestedRef.current = reportRequested;
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
  const [showTextAlternative, setShowTextAlternative] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  const [replayError, setReplayError] = useState("");
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
  const [needsContinue, setNeedsContinue] = useState(false);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [activity, setActivity] = useState<LessonActivity | null>(null);
  const activityRef = useRef<LessonActivity | null>(null);
  const pendingActivity = useRef<LessonActivityCommand | null>(null);
  const [activityBusy, setActivityBusy] = useState(false);
  const activityBusyRef = useRef(false);
  const [activityError, setActivityError] = useState("");
  const textTurnRef = useRef<PrivateLessonText | undefined>(undefined);
  const flowRef = useRef<PrivateLessonFlow | undefined>(undefined);
  const microphoneMutedRef = useRef(false);
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
  const lastTutorAudioAt = useRef(0);
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
    textTurnRef.current?.close();
    textTurnRef.current = undefined;
    flowRef.current = undefined;
    microphoneMutedRef.current = false;
    setNeedsContinue(false);
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
    message: string,
    includeTimeMessage = false,
    reason: "completed" | "stopped" | "disconnected" = "completed",
    activeSession?: PrivateLessonSession,
  ) => {
    if (includeTimeMessage) addTurn("system", t("privateLesson.timeFinished"));
    completionReason.current = reason;
    dispose();
    setRemaining(0);
    setStatus(message);
    setPhase("ended");
    if (
      activeSession &&
      (activeSession.activity || reportRequestedRef.current)
    ) {
      setReportRequested(true);
      void finalizeLesson(activeSession);
    }
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
    const estimatedPlaybackMs = Math.max(
      3_000,
      (wordCount / (2.4 * rateMultiplier)) * 1000 + 2_500,
    );
    const elapsed = Date.now() - wrapResponseStartedAt.current;
    setStatus(t("privateLesson.goodbyePlaying"));
    const finishWhenQuiet = () => {
      const quietFor = Date.now() - lastTutorAudioAt.current;
      if (quietFor < 1_200) {
        timers.current.push(
          window.setTimeout(finishWhenQuiet, 1_200 - quietFor),
        );
        return;
      }
      finish(
        completionReason.current === "stopped"
          ? t("privateLesson.stopped")
          : t("privateLesson.ended"),
        true,
        completionReason.current,
        activeSession,
      );
    };
    timers.current.push(
      window.setTimeout(
        finishWhenQuiet,
        Math.max(1_000, estimatedPlaybackMs - elapsed),
      ),
    );
  };
  const requestTranslation = (activeSession: PrivateLessonSession) => {
    if (!activeSession.realtime.translationEvent || activeResponse.current)
      return;
    const eventId = crypto.randomUUID();
    flowRef.current?.requested(eventId);
    const sent = connectionRef.current?.send({
      ...activeSession.realtime.translationEvent,
      event_id: eventId,
    });
    if (sent) {
      translationRequested.current = true;
      activeResponse.current = true;
      setResponding(true);
      setStatus(t("privateLesson.translating"));
    } else flowRef.current?.sendFailed();
  };
  const continueLesson = (
    activeSession: PrivateLessonSession,
    manual = false,
  ) => {
    const flow = flowRef.current;
    if (!flow || !activeSession.realtime.continuationEvent) return;
    flow.setPaused(
      phaseRef.current !== "active" ||
        microphoneMutedRef.current ||
        document.hidden ||
        !navigator.onLine ||
        !connectionRef.current,
    );
    const eventId = crypto.randomUUID();
    if (flow.shouldContinue(eventId, manual)) {
      const sent = connectionRef.current?.send({
        ...activeSession.realtime.continuationEvent,
        event_id: eventId,
      });
      if (sent) {
        activeResponse.current = true;
        setResponding(true);
        setStatus(t("privateLesson.continuing"));
      } else flow.sendFailed();
    }
    setNeedsContinue(flow.needsContinue);
  };
  const beginTimer = (activeSession: PrivateLessonSession) => {
    const startedAt = Date.now();
    setRemaining(activeSession.lesson.durationSeconds);
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setRemaining(Math.max(0, activeSession.lesson.durationSeconds - elapsed));
      continueLesson(activeSession);
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
  };
  const wrapAfterCurrentPlayback = (activeSession: PrivateLessonSession) => {
    const quietFor = Date.now() - lastTutorAudioAt.current;
    if (lastTutorAudioAt.current && quietFor < 1_200) {
      timers.current.push(
        window.setTimeout(
          () => wrapAfterCurrentPlayback(activeSession),
          Math.max(250, 1_200 - quietFor),
        ),
      );
      return;
    }
    requestWrapUp(
      activeSession,
      completionReason.current === "stopped" ? "stopped" : "completed",
    );
  };
  const handleRealtimeEvent = (
    event: Record<string, unknown>,
    activeSession: PrivateLessonSession,
  ) => {
    textTurnRef.current?.observe(event);
    const flow = flowRef.current;
    flow?.observe(event);
    if (flow) setNeedsContinue(flow.needsContinue);
    if (event.type === "response.created") {
      activeResponse.current = true;
      setResponding(true);
      if (wrapSent.current && !wrapResponseStarted.current) {
        wrapResponseStarted.current = true;
        wrapResponseStartedAt.current = Date.now();
        lastTutorAudioAt.current = 0;
      }
    }
    if (event.type === "response.done") {
      activeResponse.current = false;
      setResponding(false);
      if (wrapPending.current) wrapAfterCurrentPlayback(activeSession);
      else if (wrapResponseStarted.current)
        finishAfterClosingPlayback(activeSession);
      else if (translationRequested.current) {
        translationRequested.current = false;
        setStatus(t("privateLesson.connected"));
      } else setStatus(t("privateLesson.connected"));
      const response = event.response as { status?: string } | undefined;
      if (response?.status === "failed" || response?.status === "incomplete")
        setStatus(t("privateLesson.communicationError"));
    }
    if (
      event.type === "conversation.item.input_audio_transcription.completed" &&
      typeof event.transcript === "string"
    ) {
      if (!activeSession.activity) addTurn("learner", event.transcript);
      if (activeSession.activity) {
        connectionRef.current?.setMicrophoneMuted(true);
        microphoneMutedRef.current = true;
        setMicrophoneMuted(true);
        void submitActivity(activeSession, "answer", event.transcript, "voice");
      }
    }
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
      if (translationRequested.current) setTranslatedTurn(transcript);
      if (wrapResponseStarted.current) wrapTranscript.current = transcript;
      assistantBuffer.current = "";
    }
    if (event.type === "error") {
      if (flow && !flow.busy) {
        activeResponse.current = false;
        setResponding(false);
      }
      setStatus(t("privateLesson.communicationError"));
    }
  };

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      flowRef.current = undefined;
      abortRef.current?.abort();
      connectionRef.current?.close();
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void listPrivateLessons(50, courseId ?? undefined, packId ?? undefined)
      .then((lessons) => {
        if (!active) return;
        setHistory(lessons);
        const requested = searchParams.get("lesson");
        if (searchParams.get("view") === "history" && requested)
          setSelectedHistory(lessons.find((lesson) => lesson.id === requested));
      })
      .catch((reason) => active && setHistoryError(errorMessage(reason)));
    return () => {
      active = false;
    };
  }, [courseId, packId, searchParams]);

  useEffect(() => {
    let active = true;
    setSetupLoading(true);
    setError("");
    void getPrivateLessonSetup(
      unit?.targetLanguageCode ??
        courseData?.preferences.targetLanguageCode ??
        targetLanguage,
    )
      .then((setup) => {
        if (!active) return;
        setLessonSetup(setup);
        const preparation =
          searchParams.get("prep") === "warmup"
            ? readLessonDraft(user, targetLanguage, courseId)
            : undefined;
        const saved = preparation?.preferences ?? setup.preferences;
        if (saved) {
          setSupportLanguage(saved.supportLanguageCode ?? "");
          setLessonMode(saved.lessonMode);
          setTeachingLanguage(
            saved.lessonMode === "absolute_beginner"
              ? "support"
              : saved.teachingLanguage,
          );
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
        if (preparation) {
          setTopic(preparation.topic);
          setGrammarFocus(preparation.grammarFocus);
          setLevel(preparation.level);
          setCourseTeachingLanguage(preparation.courseTeachingLanguage);
          personalizationTouched.current = true;
        } else if (currentMilestone && !personalizationTouched.current) {
          setTopic(currentMilestone.communicationObjective);
          setGrammarFocus(currentMilestone.grammarTopics.join(", "));
        }
      })
      .catch((reason) => active && setError(errorMessage(reason)))
      .finally(() => active && setSetupLoading(false));
    return () => {
      active = false;
    };
  }, [
    targetLanguage,
    courseId,
    unit?.targetLanguageCode,
    courseData?.preferences.targetLanguageCode,
    searchParams,
    user,
  ]);

  const coursePreferences = courseData
    ? (courseData.versions.find(
        (version) => version.version === courseData.activeVersion,
      )?.preferences ?? courseData.preferences)
    : null;
  const lessonTargetLanguage =
    coursePreferences?.targetLanguageCode ??
    unit?.targetLanguageCode ??
    targetLanguage;
  const lessonSupportLanguage = coursePreferences
    ? coursePreferences.supportLanguageCode
    : (unit?.supportLanguageCode ?? supportLanguage);
  const lessonTeachingLanguage =
    coursePreferences?.absoluteBeginner ||
    unit?.level === "A1" ||
    (!coursePreferences && lessonMode === "absolute_beginner")
      ? "support"
      : coursePreferences
        ? courseTeachingLanguage
        : teachingLanguage;
  const supportExplanationAvailable = Boolean(
    lessonSupportLanguage &&
    !sameBaseLanguage(lessonTargetLanguage, lessonSupportLanguage),
  );

  const sessionFullscreen = phase !== "setup" && phase !== "preparing";
  const childCourse =
    (
      courseData?.versions.find(
        (version) => version.version === courseData.activeVersion,
      )?.preferences ?? courseData?.preferences
    )?.ageGroup === "child";
  usePrivateLessonViewport(sessionFullscreen);
  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript && phase !== "ended")
      transcript.scrollTop = transcript.scrollHeight;
  }, [phase, status, turns, needsContinue]);

  const startLesson = async (event: FormEvent) => {
    event.preventDefault();
    dispose();
    setPhase("preparing");
    setError("");
    setTurns([]);
    turnsRef.current = [];
    setSession(undefined);
    setActivity(null);
    activityRef.current = null;
    pendingActivity.current = null;
    setActivityError("");
    setTranslatedTurn("");
    setCompletedLesson(undefined);
    setReportRequested(false);
    setReportError("");
    setSavedSuggestions(new Set());
    finalizing.current = false;
    wrapPending.current = false;
    wrapSent.current = false;
    closingPrepared.current = false;
    wrapResponseStarted.current = false;
    wrapResponseStartedAt.current = 0;
    wrapTranscript.current = "";
    lastTutorAudioAt.current = 0;
    translationRequested.current = false;
    assistantBuffer.current = "";
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const created = await createPrivateLessonSession({
        interactionMode:
          !courseId && !packId && searchParams.get("practice") === "free"
            ? "conversation"
            : "guided",
        ...(courseId ? { courseId } : {}),
        ...(packId
          ? {
              packId,
              station:
                searchParams.get("station") === "review"
                  ? ("review" as const)
                  : searchParams.get("station") === "midpoint"
                    ? ("midpoint" as const)
                    : ("supported" as const),
            }
          : {}),
        targetLanguageCode: lessonTargetLanguage.trim(),
        supportLanguageCode: lessonSupportLanguage?.trim() || null,
        lessonMode,
        teachingLanguage: lessonTeachingLanguage,
        ...(level ? { requestedLevel: level } : {}),
        requestedDurationMinutes:
          plannedMinutes as PrivateLessonDurationMinutes,
        teacherVoice,
        speechRate,
        ...(topic.trim() ? { topic: topic.trim() } : {}),
        ...(grammarFocus.trim() ? { grammarFocus: grammarFocus.trim() } : {}),
        focusAreas,
        customFocus: customFocus.trim() || null,
        correctionMode,
        vocabularyMode,
        ...(courseData
          ? {
              targetLanguageCode: coursePreferences!.targetLanguageCode,
              supportLanguageCode: coursePreferences!.supportLanguageCode,
              lessonMode: coursePreferences!.absoluteBeginner
                ? ("absolute_beginner" as const)
                : ("standard" as const),
            }
          : {}),
      });
      if (controller.signal.aborted) return;
      setSession(created);
      setActivity(created.activity);
      activityRef.current = created.activity;
      setRemaining(created.lesson.durationSeconds);
      setPhase("connecting");
      setStatus(t("privateLesson.microphoneRequest"));
      const audio = audioRef.current;
      if (!audio) throw new Error("Missing audio element");
      flowRef.current = new PrivateLessonFlow(
        Date.now,
        created.lesson.lessonMode === "absolute_beginner" ||
          ["slow", "very_slow"].includes(created.lesson.speechRate)
          ? 20_000
          : 15_000,
      );
      flowRef.current.requested("private-lesson-opening");
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
                t("privateLesson.connectionClosed"),
                false,
                "disconnected",
                created,
              );
            }
          },
          onEvent: (realtimeEvent) => {
            if (!controller.signal.aborted)
              handleRealtimeEvent(realtimeEvent, created);
          },
          onAudioLevel(level) {
            if (controller.signal.aborted) return;
            if (level > 0.06) lastTutorAudioAt.current = Date.now();
            flowRef.current?.audioLevel(level);
            setTutorAudioLevel(level);
          },
          onMicrophoneUnavailable() {
            setInputMode("text");
            setMicrophoneMuted(true);
            microphoneMutedRef.current = true;
          },
        },
        controller.signal,
        inputMode,
      );
      if (controller.signal.aborted) connection.close();
      else {
        connectionRef.current = connection;
        if (!created.activity) {
          textTurnRef.current = new PrivateLessonText(
            (event) => connection.send(event),
            (text) => {
              addTurn("learner", text);
              setTranslatedTurn("");
            },
            () => flowRef.current?.sendFailed(),
          );
        }
        setMicrophoneReady(true);
        if (created.activity || inputMode === "text") {
          connection.setMicrophoneMuted(true);
          setMicrophoneMuted(true);
          microphoneMutedRef.current = true;
        }
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
    setActivity(null);
    activityRef.current = null;
    pendingActivity.current = null;
    setTurns([]);
    turnsRef.current = [];
    setCompletedLesson(undefined);
    setReportRequested(false);
    setReportError("");
    setError("");
    setRemaining(plannedMinutes * 60);
    setStatus(t("privateLesson.ready"));
    setPhase("setup");
  };
  const reviewLesson = (lesson: SavedPrivateLesson) => {
    const ids = lesson.report?.recommendedReviewItemIds ?? [];
    if (ids.length)
      navigate(
        `/learn/smart?items=${encodeURIComponent(ids.join(","))}&language=${encodeURIComponent(lesson.targetLanguageCode)}&return=${encodeURIComponent(lesson.course?.courseId ? `/courses/${lesson.course.courseId}` : "/history")}`,
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
    if (connectionRef.current?.setMicrophoneMuted(nextMuted)) {
      microphoneMutedRef.current = nextMuted;
      if (nextMuted) flowRef.current?.microphoneMuted();
      flowRef.current?.setPaused(nextMuted);
      setMicrophoneMuted(nextMuted);
    }
  };

  const submitActivity = async (
    activeSession: PrivateLessonSession,
    action: LessonActivityCommand["action"],
    answer?: string,
    channel: "text" | "voice" = "text",
  ): Promise<boolean> => {
    const current = activityRef.current;
    if (!current || activityBusyRef.current || phaseRef.current !== "active")
      return false;
    const text = answer?.trim();
    if (action === "answer" && !text) return false;
    const saved = pendingActivity.current;
    if (
      saved &&
      (saved.action !== action ||
        (action === "review" ? saved.correctedAnswer : saved.answer) !== text ||
        (action === "answer" && saved.channel !== channel))
    ) {
      setActivityError(t("lessonUi.retrySameAnswer"));
      return false;
    }
    const command = saved ?? {
      eventId: crypto.randomUUID(),
      revision: current.revision,
      action,
      ...(text
        ? action === "review"
          ? { correctedAnswer: text }
          : { answer: text, channel }
        : {}),
    };
    const controller = abortRef.current;
    pendingActivity.current = command;
    activityBusyRef.current = true;
    setActivityBusy(true);
    setActivityError("");
    try {
      const response = await lessonActivityApi.act(
        activeSession.lesson.id,
        command,
      );
      if (controller !== abortRef.current || controller?.signal.aborted)
        return false;
      activityRef.current = response.activity;
      setActivity(response.activity);
      setTranslatedTurn("");
      pendingActivity.current = null;
      if (action === "review") return true;
      if (text) addTurn("learner", text);
      if (activeResponse.current)
        connectionRef.current?.send({ type: "response.cancel" });
      flowRef.current?.requested(command.eventId);
      const sent = connectionRef.current?.send({
        ...response.tutorEvent,
        event_id: command.eventId,
      });
      if (!sent) setActivityError(t("lessonUi.audioReplyUnavailable"));
      return true;
    } catch (reason) {
      if (controller !== abortRef.current || controller?.signal.aborted)
        return false;
      if (
        reason instanceof ApiError &&
        reason.status === 409 &&
        reason.code === "PRIVATE_LESSON_ACTIVITY_CONFLICT"
      ) {
        const fresh = await lessonActivityApi
          .get(activeSession.lesson.id)
          .catch(() => null);
        if (
          fresh &&
          controller === abortRef.current &&
          !controller?.signal.aborted
        ) {
          activityRef.current = fresh.activity;
          setActivity(fresh.activity);
          pendingActivity.current = null;
        }
      }
      setActivityError(errorMessage(reason));
      return false;
    } finally {
      if (controller === abortRef.current) {
        activityBusyRef.current = false;
        setActivityBusy(false);
      }
    }
  };

  const submitConversationAnswer = async (answer: string) => {
    if (
      !textTurnRef.current ||
      phaseRef.current !== "active" ||
      activeResponse.current ||
      flowRef.current?.busy
    )
      return false;
    setActivityError("");
    const accepted = await textTurnRef.current.submit(answer);
    if (!accepted) setActivityError(t("lessonUi.retrySameAnswer"));
    return accepted;
  };
  const requestConversationHelp = (action: "hint" | "continue") => {
    if (!session || phaseRef.current !== "active" || flowRef.current?.busy)
      return;
    const base = session.realtime.continuationEvent;
    if (!base) return;
    const eventId = crypto.randomUUID();
    flowRef.current?.requested(eventId);
    const sent = connectionRef.current?.send({
      ...base,
      event_id: eventId,
      ...(action === "hint"
        ? {
            response: {
              instructions: `${base.response.instructions}\nThe learner requests a hint for the current question. Give one short hint without revealing its answer, moving to another task or counting this as an attempt. Wait for the learner.`,
            },
          }
        : {}),
    });
    if (sent) {
      activeResponse.current = true;
      setResponding(true);
      setNeedsContinue(false);
    } else flowRef.current?.sendFailed();
  };
  const enableLessonMicrophone = async () => {
    const connection = connectionRef.current;
    if (!connection || activityBusyRef.current) return;
    if (inputMode === "voice" && !microphoneMutedRef.current) {
      toggleMicrophone();
      return;
    }
    const available = connection.enableMicrophone
      ? await connection.enableMicrophone()
      : microphoneReady;
    if (!available) {
      setInputMode("text");
      setActivityError(t("lessonUi.microphoneTextFallback"));
      return;
    }
    setInputMode("voice");
    if (connection.setMicrophoneMuted(false)) {
      microphoneMutedRef.current = false;
      setMicrophoneMuted(false);
      flowRef.current?.setPaused(false);
    }
  };
  const selectLessonInputMode = (mode: "voice" | "text") => {
    if (mode === "text") {
      connectionRef.current?.setMicrophoneMuted(true);
      microphoneMutedRef.current = true;
      setMicrophoneMuted(true);
      setInputMode("text");
      flowRef.current?.microphoneMuted();
      flowRef.current?.setPaused(true);
    } else if (inputMode !== "voice") {
      void enableLessonMicrophone();
    }
  };
  const replayGuidedTurn = async (
    activeSession: PrivateLessonSession,
    kind: "original" | "translation",
    rate: number,
  ) => {
    if (
      phaseRef.current !== "active" ||
      activityBusyRef.current ||
      flowRef.current?.busy
    )
      return;
    const controller = abortRef.current;
    setReplayError("");
    try {
      const reply = await lessonActivityApi.replay(
        activeSession.lesson.id,
        kind,
        rate < 1 ? "slow" : "normal",
      );
      if (
        controller !== abortRef.current ||
        controller?.signal.aborted ||
        reply.revision !== activityRef.current?.revision
      )
        return;
      translationRequested.current = kind === "translation";
      const eventId = crypto.randomUUID();
      flowRef.current?.requested(eventId);
      if (
        !connectionRef.current?.send({ ...reply.tutorEvent, event_id: eventId })
      )
        setReplayError(t("lessonUi.audioReplyUnavailable"));
    } catch (reason) {
      if (controller === abortRef.current && !controller?.signal.aborted)
        setReplayError(errorMessage(reason));
    }
  };
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  const visibleHistory = courseId
    ? history.filter((lesson) => lesson.course?.courseId === courseId)
    : history;
  const latestAssessmentLesson = visibleHistory.find(
    (lesson) =>
      lesson.status === "completed" &&
      lesson.report?.assessment &&
      lesson.lessonMode === lessonMode &&
      sameBaseLanguage(lesson.targetLanguageCode, targetLanguage),
  );
  const currentMilestone =
    lessonMode === "absolute_beginner"
      ? undefined
      : lessonSetup?.roadmap?.milestones.find(
          (item) => item.status === "current",
        );
  const profileLanguage = profile.languages.find(
    (language) =>
      language.languageCode.split("-")[0] === targetLanguage.split("-")[0],
  );
  const effectiveLevel =
    lessonMode === "absolute_beginner"
      ? "A1"
      : latestAssessmentLesson?.report?.assessment.overallLevel ||
        profileLanguage?.effectiveLevel ||
        profileLanguage?.selfAssessedLevel ||
        "A2";
  const targetLanguageLabel =
    languageOptions.find(([code]) =>
      sameBaseLanguage(code, targetLanguage),
    )?.[1] || targetLanguage;
  const historyGroups = Array.from(
    visibleHistory.reduce((groups, lesson) => {
      const languageCode =
        languageOptions.find(([code]) =>
          sameBaseLanguage(code, lesson.targetLanguageCode),
        )?.[0] ?? lesson.targetLanguageCode;
      const current = groups.get(languageCode) ?? [];
      current.push(lesson);
      groups.set(languageCode, current);
      return groups;
    }, new globalThis.Map<string, SavedPrivateLesson[]>()),
  );
  const lessonTitle = currentMilestone
    ? t(`privateLesson.roadmap.stages.${currentMilestone.key}`, {
        defaultValue: currentMilestone.title,
      })
    : topic ||
      t("privateLesson.recommendedFallbackTitle", {
        defaultValue: "Everyday conversation",
      });
  const chooseLessonMode = (mode: PrivateLessonMode) => {
    setLessonMode(mode);
    if (mode === "absolute_beginner") {
      setTeachingLanguage("support");
      setLevel("A1");
      setSpeechRate((current) => (current === "normal" ? "slow" : current));
    }
  };
  const levelDetailsOpen =
    showLevelDetails || searchParams.get("view") === "level";
  const closeLevelDetails = () => {
    setShowLevelDetails(false);
    if (searchParams.get("view") !== "level") return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("view");
    setSearchParams(nextParams, { replace: true });
  };
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

  const teacherChoices = (
    <fieldset
      className="teacher-choice-row plain-fieldset"
      disabled={setupLoading || phase === "preparing"}
    >
      <legend>{t("ux.chooseTeacher")}</legend>
      {(["female", "male"] as const).map((voice) => (
        <div key={voice} className="teacher-choice-with-preview">
          <button
            type="button"
            key={voice}
            className={`teacher-choice${teacherVoice === voice ? " selected" : ""}`}
            aria-label={t(`privateLesson.voiceOptions.${voice}`)}
            aria-pressed={teacherVoice === voice}
            onClick={() => {
              setTeacherVoice(voice);
              setShowTeacherPicker(false);
            }}
          >
            <TeacherAvatar
              variant={voice}
              activity="idle"
              active={false}
              audioLevel={0}
              label={t(`privateLesson.voiceOptions.${voice}`)}
            />
            <span>{t(`privateLesson.voiceOptions.${voice}`)}</span>
          </button>
          <TeacherVoicePreview voice={voice} />
        </div>
      ))}
    </fieldset>
  );
  const warmup = () => {
    saveLessonDraft(user, lessonTargetLanguage, courseId, {
      topic,
      grammarFocus,
      level,
      courseTeachingLanguage,
      preferences: {
        supportLanguageCode: lessonSupportLanguage || null,
        lessonMode,
        teachingLanguage: lessonTeachingLanguage,
        requestedDurationMinutes:
          plannedMinutes as PrivateLessonDurationMinutes,
        teacherVoice,
        speechRate,
        focusAreas,
        customFocus: customFocus || null,
        correctionMode,
        vocabularyMode,
      },
    });
    const back = new URLSearchParams({
      language: lessonTargetLanguage,
      prep: "warmup",
    });
    if (courseId) back.set("course", courseId);
    else if (packId) back.set("pack", packId);
    else back.set("practice", "free");
    const returnTo = encodeURIComponent("/private-lesson?" + back);
    if (courseId && courseData?.nextLesson) {
      navigate(
        `/courses/${courseId}/units/${encodeURIComponent(courseData.nextLesson.unitKey)}/words?return=${returnTo}`,
      );
    } else if (packId) {
      navigate(
        `/english-learning?unit=${encodeURIComponent(packId)}&tab=words&return=${returnTo}`,
      );
    } else {
      navigate(
        `/learn?language=${encodeURIComponent(lessonTargetLanguage)}&return=${returnTo}`,
      );
    }
  };

  const lessonReturn = learningReturn(
    searchParams.get("return"),
    courseId
      ? "/courses/" + courseId
      : packId
        ? "/english-learning?unit=" + packId
        : "/dashboard",
  );
  if (phase === "ended" && reportRequested && completedLesson?.report)
    return (
      <LessonSummary lesson={completedLesson} returnTo={lessonReturn}>
        <LessonReportView
          lesson={completedLesson}
          savedSuggestions={savedSuggestions}
          savingSuggestions={savingSuggestions}
          saveError={suggestionSaveError}
          onReview={() => reviewLesson(completedLesson)}
          onSaveSuggestion={(suggestion) =>
            void saveSuggestion(completedLesson, suggestion)
          }
          hideHomework
          t={t}
        />
      </LessonSummary>
    );
  if (phase === "ended" && reportRequested)
    return (
      <section className="lesson-summary-workspace">
        <header>
          <Logo />
        </header>
        <main
          className="canonical-page lesson-summary"
          data-figma-desktop="43:7515"
        >
          <h1>
            {t(
              reportLoading
                ? "privateLesson.report.preparing"
                : "privateLesson.report.failed",
            )}
          </h1>
          <section
            className="ux-card mint"
            role={reportLoading ? "status" : "alert"}
          >
            {reportLoading ? (
              <LoaderCircle className="spin" size={44} />
            ) : (
              <>
                <p>{reportError}</p>
                {session && (
                  <button
                    className="button primary"
                    onClick={() => void finalizeLesson(session)}
                  >
                    {t("privateLesson.report.retry")}
                  </button>
                )}
              </>
            )}
          </section>
          <Link className="button secondary" to={lessonReturn}>
            {t("common.back")}
          </Link>
        </main>
      </section>
    );

  return (
    <div
      className={`private-lesson-page live-page page-enter${packId ? " unit-prep-page" : ""}${sessionFullscreen ? " session-fullscreen" : ""}`}
    >
      {!packId && (
        <section className="page-heading-row private-lesson-heading">
          <div>
            <p className="eyebrow">{t("privateLesson.eyebrow")}</p>
            <h1>
              {courseId && courseData?.nextLesson
                ? courseData.nextLesson.title
                : t("ux.readyForLesson")}
            </h1>
            <p>
              {courseId ? (
                <>
                  {t("courses.yourCourse")} ·{" "}
                  {languageOptions.find(
                    ([code]) => code === lessonTargetLanguage,
                  )?.[1] ?? lessonTargetLanguage}
                </>
              ) : (
                t("privateLesson.description")
              )}
            </p>
          </div>
          <span className="private-lesson-heading-icon" aria-hidden="true">
            <Mic2 size={34} />
          </span>
        </section>
      )}

      {phase === "setup" || phase === "preparing" ? (
        <>
          {packId ? (
            <div
              className="unit-lesson-prep canonical-page"
              data-figma-desktop="43:6205"
              data-figma-mobile="44:8465"
            >
              <header>
                <h1>{t("ux.readyForLesson")}</h1>
                <p>
                  {t("ux.fromZeroLanguage", {
                    language: new Intl.DisplayNames([i18n.language], {
                      type: "language",
                    }).of(lessonTargetLanguage),
                  })}{" "}
                  ·{" "}
                  {t("englishPath.unit", { number: unit?.moduleNumber ?? "…" })}{" "}
                  · {t("lessonPrep.aiTeacher")}
                </p>
              </header>
              <section className="ux-card mint">
                <h2 dir="auto">{unit?.title}</h2>
                <p>
                  {t("privateLesson.durationMinutes", {
                    count: plannedMinutes,
                  })}
                  {minuteBalance.data && (
                    <>
                      {" "}
                      ·{" "}
                      {t("lessonPrep.availableMinutes", {
                        count: Math.floor(
                          minuteBalance.data.secondsRemaining / 60,
                        ),
                      })}
                    </>
                  )}
                  <br />
                  <span
                    className="unit-lesson-word-preview"
                    lang={unit?.targetLanguageCode}
                    dir="auto"
                  >
                    {unit?.words
                      .slice(0, 5)
                      .map((word) => word.sourceText)
                      .join(" · ")}
                  </span>
                </p>
                {unitError && (
                  <p role="alert" className="form-error">
                    {unitError}
                  </p>
                )}
                {!unit && !unitError && (
                  <p role="status">{t("common.loading")}</p>
                )}
                {selectedUnitStation && !selectedUnitStation.available && (
                  <p role="status">
                    {t("pathUi.remaining", {
                      count: Math.max(
                        0,
                        selectedUnitStation.requiredWords -
                          (unit?.introduced ?? 0),
                      ),
                    })}
                  </p>
                )}
                <form onSubmit={(event) => void startLesson(event)}>
                  <button
                    className="button primary"
                    type="submit"
                    disabled={
                      !unit ||
                      !selectedUnitStation?.available ||
                      phase === "preparing" ||
                      setupLoading
                    }
                  >
                    {phase === "preparing" && (
                      <LoaderCircle size={18} className="spin" />
                    )}
                    {t("lessonPrep.startWithTeacher")}
                  </button>
                </form>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    navigate(
                      `/english-learning?unit=${packId}&tab=words&return=${encodeURIComponent("/private-lesson?" + searchParams)}`,
                    )
                  }
                >
                  {t("lessonPrep.learnWordsFirst")}
                </button>
              </section>
              <section className="ux-card unit-lesson-preferences">
                <label className="field">
                  <span>{t("lessonPrep.myTeacher")}</span>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => setShowTeacherPicker(true)}
                  >
                    {t("privateLesson.voiceOptions." + teacherVoice)}
                  </button>
                </label>
                <label className="field">
                  <span>{t("privateLesson.supportLanguage")}</span>
                  <span className="unit-help-language">
                    {unit?.supportLanguageCode &&
                      new Intl.DisplayNames([i18n.language], {
                        type: "language",
                      }).of(unit.supportLanguageCode)}
                  </span>
                </label>
                <label className="field">
                  <span>{t("lessonUi.answerMode")}</span>
                  <select
                    value={inputMode}
                    onChange={(event) =>
                      setInputMode(event.target.value as "voice" | "text")
                    }
                  >
                    <option value="voice">{t("lessonPrep.voiceOrText")}</option>
                    <option
                      value="text"
                      disabled={
                        !lessonSetup?.interactionCapabilities?.textAnswers
                      }
                    >
                      {t("lessonUi.textWithoutMicrophone")}
                    </option>
                  </select>
                </label>
                <details>
                  <summary>{t("lessonPrep.preferences")}</summary>
                  <p>
                    {t("privateLesson.durationMinutes", {
                      count: plannedMinutes,
                    })}
                  </p>
                  <details className="unit-lesson-words">
                    <summary>{t("ux.unitWords")}</summary>
                    {unit?.words.map((word) => (
                      <p key={word.sourceText} dir="auto">
                        <strong>{word.sourceText}</strong> ·{" "}
                        {word.translationText}
                      </p>
                    ))}
                  </details>
                </details>
              </section>
              <p className="unit-lesson-input-help">
                {t("lessonPrep.inputHelp")}
              </p>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
            </div>
          ) : courseId ? (
            <form
              className="unit-lesson-prep canonical-page"
              data-figma-desktop="43:7991"
              data-figma-mobile="44:10351"
              onSubmit={(event) => void startLesson(event)}
            >
              <section className="ux-card mint">
                <h2 dir="auto">{courseData?.nextLesson?.objective}</h2>
                <p>
                  {t("privateLesson.durationMinutes", {
                    count: lessonDurationMinutes,
                  })}
                </p>
                <p dir="auto" lang={lessonTargetLanguage}>
                  {courseData?.versions
                    .find(
                      (version) => version.version === courseData.activeVersion,
                    )
                    ?.plan.units.find(
                      (unit) => unit.key === courseData.nextLesson?.unitKey,
                    )
                    ?.vocabulary.slice(0, 5)
                    .join(" · ")}
                </p>
                {courseError && (
                  <div className="course-error" role="alert">
                    <p>{courseError}</p>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setCourseRetry((value) => value + 1)}
                    >
                      {t("courses.tryAgain")}
                    </button>
                  </div>
                )}
                <button
                  className="button primary"
                  disabled={
                    !courseData?.nextLesson ||
                    setupLoading ||
                    phase === "preparing" ||
                    (lessonTeachingLanguage === "support" &&
                      !supportExplanationAvailable)
                  }
                  type="submit"
                >
                  {phase === "preparing" && (
                    <LoaderCircle className="spin" size={18} />
                  )}
                  {t("privateLesson.start")}
                </button>
              </section>
              <section className="ux-card unit-lesson-preferences">
                {childCourse && (
                  <TeacherAvatar
                    variant="female"
                    activity="idle"
                    audioLevel={0}
                    active={false}
                    label={t("privateLesson.voiceOptions.female")}
                  />
                )}
                <label className="field">
                  <span>{t("ux.chooseTeacher")}</span>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={childCourse}
                    onClick={() => setShowTeacherPicker(true)}
                  >
                    {t(
                      "privateLesson.voiceOptions." +
                        (childCourse ? "female" : teacherVoice),
                    )}
                  </button>
                </label>
                <label className="field">
                  <span>{t("privateLesson.supportLanguage")}</span>
                  <span className="unit-help-language">
                    {languageOptions.find(
                      ([code]) => code === lessonSupportLanguage,
                    )?.[1] ?? lessonSupportLanguage}
                  </span>
                </label>
                {lessonSetup?.interactionCapabilities?.textAnswers && (
                  <label className="field lesson-answer-mode">
                    <span>{t("lessonUi.answerMode")}</span>
                    <select
                      value={inputMode}
                      onChange={(event) =>
                        setInputMode(event.target.value as "voice" | "text")
                      }
                    >
                      <option value="voice">{t("lessonUi.voiceOrText")}</option>
                      <option value="text">
                        {t("lessonUi.textWithoutMicrophone")}
                      </option>
                    </select>
                  </label>
                )}
                {coursePreferences && !coursePreferences.absoluteBeginner && (
                  <label className="field private-lesson-explanation-language">
                    <span>{t("privateLesson.mode.teachingLanguage")}</span>
                    <select
                      value={courseTeachingLanguage}
                      dir="auto"
                      onChange={(event) =>
                        setCourseTeachingLanguage(
                          event.target.value as PrivateLessonTeachingLanguage,
                        )
                      }
                    >
                      <option value="target">
                        {t("privateLesson.mode.explainInTarget", {
                          language:
                            languageOptions.find(([code]) =>
                              sameBaseLanguage(code, lessonTargetLanguage),
                            )?.[1] ?? lessonTargetLanguage,
                        })}
                      </option>
                      {supportExplanationAvailable && (
                        <option value="support">
                          {t("privateLesson.mode.explainInSupport", {
                            language:
                              languageOptions.find(([code]) =>
                                sameBaseLanguage(
                                  code,
                                  lessonSupportLanguage || "",
                                ),
                              )?.[1] ?? lessonSupportLanguage,
                          })}
                        </option>
                      )}
                    </select>
                  </label>
                )}
                <Link className="button ghost" to="/settings#private-lessons">
                  {t("accountUi.morePreferences")}
                </Link>
              </section>
              <button
                type="button"
                className="button secondary"
                disabled={setupLoading || !courseData?.nextLesson}
                onClick={warmup}
              >
                {t("ux.warmup")}
              </button>
              <p className="unit-lesson-privacy">
                {t("privateLesson.privacy")}
              </p>
              <button
                type="button"
                className="button ghost"
                onClick={() => navigate("/courses/" + courseId)}
              >
                {t("courses.backToCourse")}
              </button>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          ) : (
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
                <section className="lesson-ready-card">
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
                            {t(
                              `privateLesson.mode.options.${lessonMode}.title`,
                            )}
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
                        (lessonTeachingLanguage === "support" &&
                          !supportExplanationAvailable) ||
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
                    className="button secondary"
                    disabled={setupLoading}
                    onClick={warmup}
                  >
                    {t("ux.warmup")}
                  </button>
                </section>
                <section className="lesson-preferences-card">
                  <div className="lesson-teacher-field">
                    <span>{t("ux.chooseTeacher")}</span>
                    <button
                      type="button"
                      aria-label={t("ux.chooseTeacher")}
                      className="button secondary lesson-teacher-picker"
                      disabled={setupLoading || phase === "preparing"}
                      onClick={() => setShowTeacherPicker(true)}
                    >
                      <TeacherAvatar
                        variant={teacherVoice}
                        activity="idle"
                        active={false}
                        audioLevel={0}
                        label={t(`privateLesson.voiceOptions.${teacherVoice}`)}
                      />
                      {t(`privateLesson.voiceOptions.${teacherVoice}`)}
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  {lessonMode === "standard" && (
                    <label className="field private-lesson-explanation-language">
                      <span>{t("privateLesson.mode.teachingLanguage")}</span>
                      <select
                        value={teachingLanguage}
                        dir="auto"
                        onChange={(event) =>
                          setTeachingLanguage(
                            event.target.value as PrivateLessonTeachingLanguage,
                          )
                        }
                      >
                        <option value="target">
                          {t("privateLesson.mode.explainInTarget", {
                            language: targetLanguageLabel,
                          })}
                        </option>
                        <option value="support">
                          {t("privateLesson.mode.explainInSupport", {
                            language: supportLanguage
                              ? (languageOptions.find(([code]) =>
                                  sameBaseLanguage(code, supportLanguage),
                                )?.[1] ?? supportLanguage)
                              : t("privateLesson.mode.chooseTeachingLanguage"),
                          })}
                        </option>
                      </select>
                    </label>
                  )}
                  {(lessonMode === "absolute_beginner" ||
                    teachingLanguage === "support") && (
                    <div className="private-lesson-beginner-language">
                      <label className="field">
                        <span>
                          {t("privateLesson.mode.chooseTeachingLanguage")}
                        </span>
                        <LanguageCombobox
                          value={supportLanguage}
                          onChange={setSupportLanguage}
                          options={languageOptions.filter(
                            ([code]) => !sameBaseLanguage(code, targetLanguage),
                          )}
                          emptyLabel={t(
                            "privateLesson.mode.chooseTeachingLanguage",
                          )}
                          required
                        />
                      </label>
                      <p>
                        {t(
                          lessonMode === "absolute_beginner"
                            ? "privateLesson.mode.beginnerHint"
                            : "privateLesson.mode.supportHint",
                        )}
                      </p>
                    </div>
                  )}
                  {lessonSetup?.interactionCapabilities?.textAnswers ? (
                    <label className="field lesson-answer-mode">
                      <span>{t("lessonUi.answerMode")}</span>
                      <select
                        value={inputMode}
                        onChange={(event) =>
                          setInputMode(event.target.value as "voice" | "text")
                        }
                      >
                        <option value="voice">
                          {t("lessonUi.voiceOrText")}
                        </option>
                        <option value="text">
                          {t("lessonUi.textWithoutMicrophone")}
                        </option>
                      </select>
                    </label>
                  ) : (
                    <button
                      type="button"
                      className="button secondary lesson-text-choice"
                      onClick={() => setShowTextAlternative(true)}
                    >
                      {t("ux.textAlternative")}
                    </button>
                  )}
                  <Modal
                    open={showTextAlternative}
                    onClose={() => setShowTextAlternative(false)}
                    title={t("ux.textAlternative")}
                  >
                    <div className="modal-body">
                      <p>{t("ux.textUnavailable")}</p>
                      <button
                        className="button primary"
                        onClick={() =>
                          navigate(
                            `/learn?language=${encodeURIComponent(targetLanguage)}&return=%2Fprivate-lesson`,
                          )
                        }
                      >
                        {t("ux.writtenPractice")}
                      </button>
                    </div>
                  </Modal>
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
                </section>
                <div className="private-lesson-quick-links">
                  <button
                    type="button"
                    onClick={() => setShowLevelDetails(true)}
                  >
                    <span className="private-lesson-quick-icon">
                      <TrendingUp size={19} />
                    </span>
                    <span>
                      <small>
                        {t("privateLesson.yourLevel", {
                          defaultValue: "Your level",
                        })}{" "}
                        · {targetLanguageLabel}
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
                          <LanguageCombobox
                            value={targetLanguage}
                            onChange={setTargetLanguage}
                            options={languageOptions}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>{t("privateLesson.supportLanguage")}</span>
                          <LanguageCombobox
                            value={supportLanguage}
                            onChange={setSupportLanguage}
                            options={languageOptions}
                            emptyLabel={t("privateLesson.noSupport")}
                          />
                        </label>
                        <label className="field">
                          <span>{t("privateLesson.duration")}</span>
                          <select
                            aria-label={t("privateLesson.duration")}
                            value={lessonDurationMinutes}
                            onChange={(event) =>
                              setLessonDurationMinutes(
                                Number(
                                  event.target.value,
                                ) as PrivateLessonDurationMinutes,
                              )
                            }
                          >
                            {([1, 5, 10, 15, 20] as const).map((value) => (
                              <option key={value} value={value}>
                                {t(`privateLesson.durationOptions.${value}`)}
                              </option>
                            ))}
                          </select>
                          <small>
                            {t("privateLesson.minutesChargePolicy")}
                          </small>
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
                        disabled={
                          !targetLanguage.trim() || phase === "preparing"
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
          )}
          <Modal
            open={levelDetailsOpen}
            onClose={closeLevelDetails}
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
                  onClick={closeLevelDetails}
                >
                  {t("common.close")}
                </button>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => {
                    closeLevelDetails();
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
              <fieldset className="private-lesson-mode-field compact">
                <legend>{t("privateLesson.mode.title")}</legend>
                <div className="private-lesson-mode-options">
                  {(["standard", "absolute_beginner"] as const).map((mode) => (
                    <label
                      key={mode}
                      className={lessonMode === mode ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="lesson-mode-modal"
                        value={mode}
                        checked={lessonMode === mode}
                        onChange={() => chooseLessonMode(mode)}
                      />
                      <span>
                        <strong>
                          {t(`privateLesson.mode.options.${mode}.title`)}
                        </strong>
                        <small>
                          {t(`privateLesson.mode.options.${mode}.description`)}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="live-form-grid">
                {lessonMode === "standard" && (
                  <label className="field">
                    <span>{t("privateLesson.mode.teachingLanguage")}</span>
                    <select
                      value={teachingLanguage}
                      dir="auto"
                      onChange={(event) =>
                        setTeachingLanguage(
                          event.target.value as PrivateLessonTeachingLanguage,
                        )
                      }
                    >
                      <option value="target">
                        {t("privateLesson.mode.explainInTarget", {
                          language: targetLanguageLabel,
                        })}
                      </option>
                      <option value="support">
                        {t("privateLesson.mode.explainInSupport", {
                          language: supportLanguage
                            ? (languageOptions.find(([code]) =>
                                sameBaseLanguage(code, supportLanguage),
                              )?.[1] ?? supportLanguage)
                            : t("privateLesson.mode.chooseTeachingLanguage"),
                        })}
                      </option>
                    </select>
                  </label>
                )}
                {(lessonMode === "absolute_beginner" ||
                  teachingLanguage === "support") && (
                  <label className="field">
                    <span>
                      {t("privateLesson.mode.chooseTeachingLanguage")}
                    </span>
                    <LanguageCombobox
                      value={supportLanguage}
                      onChange={setSupportLanguage}
                      options={languageOptions.filter(
                        ([code]) => !sameBaseLanguage(code, targetLanguage),
                      )}
                      emptyLabel={t(
                        "privateLesson.mode.chooseTeachingLanguage",
                      )}
                      required
                    />
                  </label>
                )}
                <label className="field">
                  <span>{t("privateLesson.duration")}</span>
                  <select
                    aria-label={t("privateLesson.duration")}
                    value={lessonDurationMinutes}
                    onChange={(event) =>
                      setLessonDurationMinutes(
                        Number(
                          event.target.value,
                        ) as PrivateLessonDurationMinutes,
                      )
                    }
                  >
                    {([1, 5, 10, 15, 20] as const).map((value) => (
                      <option key={value} value={value}>
                        {t(`privateLesson.durationOptions.${value}`)}
                      </option>
                    ))}
                  </select>
                  <small>{t("privateLesson.minutesChargePolicy")}</small>
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
          <Modal
            open={showTeacherPicker}
            onClose={() => setShowTeacherPicker(false)}
            title={t("ux.chooseTeacher")}
          >
            <div className="modal-body">{teacherChoices}</div>
          </Modal>
          {!packId && (
            <section className="private-lesson-history live-panel">
              <div className="private-lesson-history-heading">
                <div>
                  <p className="eyebrow">
                    {t("privateLesson.history.eyebrow")}
                  </p>
                  <h2>
                    {t(
                      courseId
                        ? "courses.courseHistory"
                        : "privateLesson.history.title",
                    )}
                  </h2>
                </div>
                <BookOpen size={24} aria-hidden="true" />
              </div>
              {historyError ? (
                <p className="form-error" role="alert">
                  {historyError}
                </p>
              ) : visibleHistory.length ? (
                <div className="private-lesson-history-groups">
                  {historyGroups.map(([languageCode, lessons]) => (
                    <section
                      key={languageCode}
                      className="private-lesson-history-group"
                    >
                      <h3>
                        <Languages size={18} aria-hidden="true" />
                        {languageOptions.find(
                          ([code]) => code === languageCode,
                        )?.[1] ?? languageCode}
                      </h3>
                      <div className="private-lesson-history-list">
                        {lessons.map((lesson) => (
                          <article key={lesson.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedHistory(lesson)}
                            >
                              <strong dir="auto">{lesson.topic}</strong>
                              <span>
                                {new Date(
                                  lesson.startedAt,
                                ).toLocaleDateString()}{" "}
                                · {lesson.level}
                              </span>
                              <small
                                dir="auto"
                                lang={
                                  lesson.report
                                    ? (lesson.supportLanguageCode ??
                                      lesson.targetLanguageCode)
                                    : undefined
                                }
                              >
                                {lesson.report?.summary ??
                                  t(
                                    `privateLesson.history.status.${lesson.status}`,
                                  )}
                              </small>
                            </button>
                            <button
                              className="icon-button"
                              type="button"
                              aria-label={t("privateLesson.history.delete")}
                              onClick={() =>
                                void removeHistoryLesson(lesson).catch(
                                  (reason) =>
                                    setHistoryError(errorMessage(reason)),
                                )
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <p>
                  {t(
                    courseId
                      ? "courses.noCourseHistory"
                      : "privateLesson.history.empty",
                  )}
                </p>
              )}
            </section>
          )}
          <Modal
            open={Boolean(selectedHistory)}
            onClose={() => setSelectedHistory(undefined)}
            title={
              selectedHistory
                ? `${t("privateLesson.report.title")} · ${selectedHistory.topic}`
                : t("privateLesson.report.title")
            }
            size="lg"
            className="private-lesson-history-modal"
          >
            {selectedHistory?.report ? (
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
            ) : selectedHistory ? (
              <div className="modal-body">
                <p>
                  {t(`privateLesson.history.status.${selectedHistory.status}`)}
                </p>
              </div>
            ) : null}
          </Modal>
        </>
      ) : (
        createPortal(
          session && phase !== "ended" ? (
            <LessonWorkspace
              lesson={session.lesson}
              activity={
                activity ?? {
                  interactionMode: "conversation",
                  stage: "chat",
                  tutorText: "",
                  question: "",
                  example: null,
                  feedback: null,
                  turns: turns.filter(
                    (turn): turn is Turn & { role: "learner" | "tutor" } =>
                      turn.role !== "system",
                  ),
                }
              }
              needsContinue={needsContinue}
              finishBlocked={activityBusy}
              remaining={remaining}
              status={status}
              audioLevel={tutorAudioLevel}
              busy={activityBusy || responding || phase === "wrapping"}
              ready={phase === "active"}
              microphoneMuted={microphoneMuted}
              inputMode={inputMode}
              error={activityError || replayError}
              translatedTurn={translatedTurn}
              onAnswer={(answer) =>
                activity
                  ? submitActivity(session, "answer", answer)
                  : submitConversationAnswer(answer)
              }
              onReview={
                activity
                  ? (answer) => submitActivity(session, "review", answer)
                  : undefined
              }
              onAction={(action) =>
                activity
                  ? void submitActivity(session, action)
                  : requestConversationHelp(action)
              }
              onMicrophone={() => void enableLessonMicrophone()}
              onInputMode={selectLessonInputMode}
              onReplay={(rate) =>
                activity
                  ? void replayGuidedTurn(session, "original", rate)
                  : speak(
                      turns.filter((turn) => turn.role === "tutor").at(-1)
                        ?.text ?? "",
                      session.lesson.teachingLanguage === "support"
                        ? (session.lesson.supportLanguageCode ??
                            session.lesson.targetLanguageCode)
                        : session.lesson.targetLanguageCode,
                      rate,
                    )
              }
              onTranslate={() =>
                activity
                  ? void replayGuidedTurn(session, "translation", 1)
                  : requestTranslation(session)
              }
              onPause={(paused) => {
                connectionRef.current?.setMicrophoneMuted(true);
                microphoneMutedRef.current = true;
                setMicrophoneMuted(true);
                flowRef.current?.setPaused(paused);
                if (paused) {
                  audioRef.current?.pause();
                  window.speechSynthesis?.cancel();
                } else void audioRef.current?.play().catch(() => undefined);
              }}
              onFinish={() => {
                setReportRequested(true);
                requestWrapUp(session, "stopped");
              }}
            />
          ) : (
            <section
              className={`private-lesson-session live-panel${reportRequested ? " has-report" : ""}`}
              role="dialog"
              aria-label={t("privateLesson.title")}
            >
              <header className="private-lesson-session-header">
                <Logo />
                <div>
                  <p className="eyebrow">{t("privateLesson.active")}</p>
                  <h2 dir="auto">{session?.lesson.topic}</h2>
                  <span className={`private-lesson-status ${phase}`}>
                    <i aria-hidden="true" /> {status}
                  </span>
                </div>
                <div className="private-lesson-header-controls">
                  {phase !== "ended" && (
                    <button
                      className="button secondary lesson-end"
                      type="button"
                      disabled={phase === "wrapping"}
                      onClick={() =>
                        session && requestWrapUp(session, "stopped")
                      }
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
                  )}
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
                  <div
                    className="private-lesson-timer"
                    aria-label={t("privateLesson.timerLabel")}
                    aria-live="polite"
                  >
                    {minutes}:{seconds}
                  </div>
                </div>
              </header>

              <details className="private-lesson-settings-details">
                <summary>{t("ux.learningDetails")}</summary>
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
                      t(
                        `privateLesson.speedOptions.${session.lesson.speechRate}`,
                      )}
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
              </details>

              {phase === "ended" && reportRequested ? (
                <div className="private-lesson-report-shell">
                  {reportLoading ? (
                    <div
                      className="private-lesson-report-loading"
                      role="status"
                    >
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
                  <div className="lesson-dialogue">
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
                        <strong>
                          {t(
                            `privateLesson.voiceOptions.${session?.lesson.teacherVoice ?? teacherVoice}`,
                          )}
                        </strong>
                        <span>{status}</span>
                      </div>
                    </div>

                    {phase !== "ended" &&
                      turns.some((turn) => turn.role === "tutor") && (
                        <div
                          className="lesson-current-message"
                          aria-live="polite"
                        >
                          <p dir="auto">
                            {
                              turns
                                .filter((turn) => turn.role === "tutor")
                                .at(-1)?.text
                            }
                          </p>
                          <div className="lesson-replay-controls">
                            {[1, 0.65].map((rate) => (
                              <button
                                type="button"
                                className="button secondary"
                                key={rate}
                                disabled={responding || phase !== "active"}
                                onClick={() => {
                                  const text = turns
                                    .filter((turn) => turn.role === "tutor")
                                    .at(-1)?.text;
                                  const replayLanguage =
                                    session?.lesson.teachingLanguage ===
                                    "support"
                                      ? supportLanguage
                                      : targetLanguage;
                                  setReplayError(
                                    text && speak(text, replayLanguage, rate)
                                      ? ""
                                      : t("ux.audioUnavailable"),
                                  );
                                }}
                              >
                                <Headphones size={17} />
                                {t(rate === 1 ? "ux.replay" : "ux.replaySlow")}
                              </button>
                            ))}
                          </div>
                          {replayError && <p role="alert">{replayError}</p>}
                        </div>
                      )}
                    {phase !== "ended" &&
                      !turns.some((turn) => turn.role === "tutor") && (
                        <div
                          className="lesson-current-message lesson-waiting"
                          role="status"
                        >
                          <p>{status}</p>
                        </div>
                      )}
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

                  <details
                    className="lesson-transcript-details"
                    open={phase === "ended" || undefined}
                  >
                    <summary>{t("ux.fullConversation")}</summary>
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
                        turns
                          .filter(
                            (turn) =>
                              phase === "ended" ||
                              turn.id !==
                                turns
                                  .filter((item) => item.role === "tutor")
                                  .at(-1)?.id,
                          )
                          .map((turn) => (
                            <div
                              className={`private-lesson-turn ${turn.role}`}
                              key={turn.id}
                            >
                              <small>
                                {t(`privateLesson.roles.${turn.role}`)}
                              </small>
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
                  </details>
                </>
              )}

              {phase === "ended" ? (
                <div className="private-lesson-actions private-lesson-report-actions">
                  {!reportRequested && session && (
                    <button
                      className="button primary"
                      type="button"
                      onClick={() => {
                        setReportRequested(true);
                        void finalizeLesson(session);
                      }}
                    >
                      <BookOpen size={18} />{" "}
                      {t("privateLesson.report.generate")}
                    </button>
                  )}
                  <button
                    className="button secondary"
                    type="button"
                    onClick={reset}
                  >
                    <RotateCcw size={18} /> {t("privateLesson.restart")}
                  </button>
                </div>
              ) : (
                <div className="private-lesson-actions">
                  <button
                    className={`private-lesson-mute${microphoneMuted ? " muted" : phase === "active" && microphoneReady ? " ux-recording" : ""}`}
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
                    {microphoneMuted ? (
                      <MicOff size={19} />
                    ) : (
                      <Mic2 size={19} />
                    )}
                    <span>
                      {microphoneMuted
                        ? t("privateLesson.unmuteMicrophone")
                        : t("privateLesson.muteMicrophone")}
                    </span>
                  </button>

                  {needsContinue &&
                    session?.realtime.continuationEvent &&
                    phase === "active" && (
                      <button
                        className="button secondary private-lesson-continue"
                        type="button"
                        disabled={responding || microphoneMuted}
                        onClick={() => continueLesson(session, true)}
                      >
                        <MessageCircleMore size={17} />{" "}
                        {t("privateLesson.continueLesson")}
                      </button>
                    )}
                  {session?.realtime.translationEvent && (
                    <button
                      className="button secondary lesson-translate"
                      type="button"
                      disabled={responding || phase === "wrapping"}
                      onClick={() => requestTranslation(session)}
                    >
                      <Languages size={17} /> {t("privateLesson.translateLast")}
                    </button>
                  )}
                </div>
              )}
            </section>
          ),
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
  hideHomework = false,
  lesson,
  savedSuggestions,
  savingSuggestions,
  saveError,
  onReview,
  onSaveSuggestion,
  t,
}: {
  hideHomework?: boolean;
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
  const reportLanguageCode =
    lesson.supportLanguageCode ?? lesson.targetLanguageCode;
  return (
    <div className="private-lesson-report">
      <section className="private-lesson-report-summary">
        <p className="eyebrow">{t("privateLesson.report.title")}</p>
        <ul className="lesson-report-highlights">
          {report.strengths.slice(0, 2).map((item) => (
            <li key={item}>
              <Check size={17} />
              <span dir="auto" lang={reportLanguageCode}>
                {item}
              </span>
            </li>
          ))}
        </ul>
        {report.corrections[0] && (
          <p>
            <strong>{t("courses.oneFocus")}</strong>{" "}
            <span dir="auto">{report.corrections[0].explanation}</span>
          </p>
        )}
        <p>
          <strong>{t("privateLesson.report.next")}</strong>{" "}
          <span dir="auto" lang={reportLanguageCode}>
            {report.nextLessonPlan}
          </span>
        </p>
      </section>
      {!hideHomework && <LessonHomeworkCard lessonId={lesson.id} />}
      <details className="lesson-report-details">
        <summary>{t("courses.reportDetails")}</summary>
        <p dir="auto" lang={reportLanguageCode}>
          {report.summary}
        </p>
        <SkillAssessment assessment={report.assessment} t={t} />
        <div className="private-lesson-report-grid">
          <section>
            <h4>{t("privateLesson.report.strengths")}</h4>
            {report.strengths.length ? (
              <ul>
                {report.strengths.map((item) => (
                  <li key={item} dir="auto" lang={reportLanguageCode}>
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
                <article key={`${item.original}:${index}`}>
                  <div dir="auto" lang={lesson.targetLanguageCode}>
                    <del>{item.original}</del> <strong>{item.corrected}</strong>
                  </div>
                  <p dir="auto" lang={reportLanguageCode}>
                    {item.explanation}
                  </p>
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
                <article key={item.topic}>
                  <strong dir="auto">{item.topic}</strong>
                  <p dir="auto" lang={reportLanguageCode}>
                    {item.explanation}
                  </p>
                  {item.example && (
                    <small dir="auto" lang={lesson.targetLanguageCode}>
                      {item.example}
                    </small>
                  )}
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
                <article key={item.learningItemId}>
                  <strong>
                    <span dir="auto" lang={lesson.targetLanguageCode}>
                      {item.sourceText}
                    </span>
                    {" · "}
                    <span dir="auto" lang={reportLanguageCode}>
                      {item.translationText}
                    </span>
                  </strong>
                  <p dir="auto" lang={reportLanguageCode}>
                    {item.note}
                  </p>
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
                    <span>
                      <strong dir="auto" lang={lesson.targetLanguageCode}>
                        {suggestion.sourceText}
                      </strong>
                      {" · "}
                      <span dir="auto" lang={reportLanguageCode}>
                        {suggestion.translationText}
                      </span>
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
      </details>
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
