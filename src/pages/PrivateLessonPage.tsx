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
  Headphones,
  Gauge,
  Languages,
  LoaderCircle,
  Menu,
  MessageCircleMore,
  Mic2,
  MicOff,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { TeacherAvatar } from "../components/TeacherAvatar";
import { useApp } from "../context/AppContext";
import { captureReceipt, errorMessage, product } from "../lib/product";
import {
  completePrivateLessonSession,
  connectPrivateLesson,
  createPrivateLessonSession,
  deletePrivateLesson,
  listPrivateLessons,
  PrivateLessonConnectionError,
  type PrivateLessonConnection,
  type PrivateLessonDurationMinutes,
  type SavedPrivateLesson,
  type PrivateLessonSession,
} from "../lib/privateLesson";

type Phase =
  "setup" | "preparing" | "connecting" | "active" | "wrapping" | "ended";
type Turn = { id: number; role: "learner" | "tutor" | "system"; text: string };
type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type TeacherVoice = "female" | "male";
type SpeechRate = "slow" | "normal" | "fast";

export function PrivateLessonPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useApp();
  const learningLanguages = profile.languages.map(
    (entry) => entry.languageCode,
  );
  const [targetLanguage, setTargetLanguage] = useState(
    learningLanguages[0] || profile.defaultSourceLanguage || "en",
  );
  const [supportLanguage, setSupportLanguage] = useState(
    profile.defaultTranslationLanguage || "",
  );
  const [level, setLevel] = useState<"" | CefrLevel>("");
  const [teacherVoice, setTeacherVoice] = useState<TeacherVoice>("female");
  const [speechRate, setSpeechRate] = useState<SpeechRate>("normal");
  const [lessonDurationMinutes, setLessonDurationMinutes] =
    useState<PrivateLessonDurationMinutes>(5);
  const [topic, setTopic] = useState(profile.interests[0] || "");
  const [grammarFocus, setGrammarFocus] = useState("");
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
  const [selectedHistory, setSelectedHistory] = useState<SavedPrivateLesson>();
  const [savedSuggestions, setSavedSuggestions] = useState<Set<string>>(
    new Set(),
  );
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
    const rateMultiplier = { slow: 0.85, normal: 1, fast: 1.2 }[
      activeSession.lesson.speechRate
    ];
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
        ...(supportLanguage.trim()
          ? { supportLanguageCode: supportLanguage.trim() }
          : {}),
        ...(level ? { requestedLevel: level } : {}),
        requestedDurationMinutes: lessonDurationMinutes,
        teacherVoice,
        speechRate,
        ...(topic.trim() ? { topic: topic.trim() } : {}),
        ...(grammarFocus.trim() ? { grammarFocus: grammarFocus.trim() } : {}),
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
    const eventId = crypto.randomUUID();
    await product(
      captureReceipt,
      "capture",
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
        clientEventId: eventId,
      },
      eventId,
    );
    setSavedSuggestions((current) => new Set(current).add(key));
  };
  const removeHistoryLesson = async (lesson: SavedPrivateLesson) => {
    await deletePrivateLesson(lesson.id);
    setHistory((current) => current.filter((item) => item.id !== lesson.id));
    if (selectedHistory?.id === lesson.id) setSelectedHistory(undefined);
  };
  const toggleMicrophone = () => {
    const nextMuted = !microphoneMuted;
    if (connectionRef.current?.setMicrophoneMuted(nextMuted))
      setMicrophoneMuted(nextMuted);
  };
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

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
                <p>{t("privateLesson.setupDescription")}</p>
              </div>
            </div>
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
                    {learningLanguages.length ? (
                      <select
                        value={targetLanguage}
                        onChange={(event) =>
                          setTargetLanguage(event.target.value)
                        }
                        dir="ltr"
                      >
                        {learningLanguages.map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={targetLanguage}
                        onChange={(event) =>
                          setTargetLanguage(event.target.value)
                        }
                        maxLength={64}
                        dir="ltr"
                        required
                      />
                    )}
                  </label>
                  <label className="field">
                    <span>{t("privateLesson.supportLanguage")}</span>
                    <input
                      value={supportLanguage}
                      onChange={(event) =>
                        setSupportLanguage(event.target.value)
                      }
                      maxLength={64}
                      dir="ltr"
                      placeholder={t("privateLesson.noSupport")}
                    />
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
                <div className="live-form-grid">
                  <label className="field">
                    <span>{t("privateLesson.teacherVoice")}</span>
                    <select
                      value={teacherVoice}
                      onChange={(event) =>
                        setTeacherVoice(event.target.value as TeacherVoice)
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
                        setSpeechRate(event.target.value as SpeechRate)
                      }
                    >
                      {(["slow", "normal", "fast"] as const).map((value) => (
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
                      {(["A1", "A2", "B1", "B2", "C1", "C2"] as const).map(
                        (value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("privateLesson.topic")}</span>
                    <input
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      maxLength={120}
                      placeholder={t("privateLesson.topicPlaceholder")}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>{t("privateLesson.grammarFocus")}</span>
                  <input
                    value={grammarFocus}
                    onChange={(event) => setGrammarFocus(event.target.value)}
                    maxLength={160}
                    placeholder={t("privateLesson.grammarPlaceholder")}
                  />
                </label>
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
          </section>
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
                      <small>
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
                onReview={() => reviewLesson(selectedHistory)}
                onSaveSuggestion={(suggestion) =>
                  void saveSuggestion(selectedHistory, suggestion).catch(
                    (reason) => setHistoryError(errorMessage(reason)),
                  )
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
                    onReview={() => reviewLesson(completedLesson)}
                    onSaveSuggestion={(suggestion) =>
                      void saveSuggestion(completedLesson, suggestion).catch(
                        (reason) => setReportError(errorMessage(reason)),
                      )
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

function LessonReportView({
  lesson,
  savedSuggestions,
  onReview,
  onSaveSuggestion,
  t,
}: {
  lesson: SavedPrivateLesson;
  savedSuggestions: Set<string>;
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
    <div className="private-lesson-report" dir="auto">
      <section className="private-lesson-report-summary">
        <p className="eyebrow">{t("privateLesson.report.title")}</p>
        <h3>{report.summary}</h3>
        <p>
          <strong>{t("privateLesson.report.next")}</strong>{" "}
          {report.nextLessonPlan}
        </p>
      </section>
      <div className="private-lesson-report-grid">
        <section>
          <h4>{t("privateLesson.report.strengths")}</h4>
          {report.strengths.length ? (
            <ul>
              {report.strengths.map((item) => (
                <li key={item}>{item}</li>
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
              <article key={item.topic}>
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
              <article key={item.learningItemId}>
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
              return (
                <article key={key}>
                  <span>
                    <strong>{suggestion.sourceText}</strong> ·{" "}
                    {suggestion.translationText}
                  </span>
                  {lesson.supportLanguageCode && (
                    <button
                      className="button secondary"
                      type="button"
                      disabled={saved}
                      onClick={() => onSaveSuggestion(suggestion)}
                    >
                      {saved ? <Check size={15} /> : <Plus size={15} />}
                      {t(
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
