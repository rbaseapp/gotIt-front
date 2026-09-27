import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Headphones,
  Gauge,
  Languages,
  LoaderCircle,
  MessageCircleMore,
  Mic2,
  RotateCcw,
  Sparkles,
  Square,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { TeacherAvatar } from "../components/TeacherAvatar";
import { useApp } from "../context/AppContext";
import { errorMessage } from "../lib/product";
import {
  connectPrivateLesson,
  createPrivateLessonSession,
  PrivateLessonConnectionError,
  type PrivateLessonConnection,
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
  const [responding, setResponding] = useState(false);
  const turnId = useRef(0);
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

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };
  const addTurn = (role: Turn["role"], text: string) => {
    if (!text.trim()) return;
    setTurns((current) => [
      ...current,
      { id: ++turnId.current, role, text: text.trim() },
    ]);
  };
  const dispose = () => {
    clearTimers();
    abortRef.current?.abort();
    abortRef.current = undefined;
    connectionRef.current?.close();
    connectionRef.current = undefined;
    activeResponse.current = false;
    setResponding(false);
    setTutorAudioLevel(0);
  };
  const finish = (message: string, includeTimeMessage = false) => {
    if (includeTimeMessage) addTurn("system", t("privateLesson.timeFinished"));
    dispose();
    setRemaining(0);
    setStatus(message);
    setPhase("ended");
  };
  const requestWrapUp = (activeSession: PrivateLessonSession) => {
    if (wrapSent.current) return;
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
        () => finish(t("privateLesson.ended"), true),
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
        () => finish(t("privateLesson.ended"), true),
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
      if (wrapPending.current) requestWrapUp(activeSession);
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

  const startLesson = async (event: FormEvent) => {
    event.preventDefault();
    dispose();
    setPhase("preparing");
    setError("");
    setTurns([]);
    setSession(undefined);
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
            beginTimer(created);
          },
          onClose() {
            if (
              !controller.signal.aborted &&
              (phaseRef.current === "active" || phaseRef.current === "wrapping")
            ) {
              clearTimers();
              setPhase("ended");
              setStatus(t("privateLesson.connectionClosed"));
            }
          },
          onEvent: (realtimeEvent) =>
            handleRealtimeEvent(realtimeEvent, created),
          onAudioLevel: setTutorAudioLevel,
        },
        controller.signal,
      );
      if (controller.signal.aborted) connection.close();
      else connectionRef.current = connection;
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
    setError("");
    setRemaining(300);
    setStatus(t("privateLesson.ready"));
    setPhase("setup");
  };
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <div className="private-lesson-page live-page page-enter">
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
                    onChange={(event) => setSupportLanguage(event.target.value)}
                    maxLength={64}
                    dir="ltr"
                    placeholder={t("privateLesson.noSupport")}
                  />
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
      ) : (
        <section className="private-lesson-session live-panel">
          <header className="private-lesson-session-header">
            <div>
              <p className="eyebrow">{t("privateLesson.active")}</p>
              <h2 dir="auto">{session?.lesson.topic}</h2>
              <span className={`private-lesson-status ${phase}`}>
                <i aria-hidden="true" /> {status}
              </span>
            </div>
            <div
              className="private-lesson-timer"
              aria-label={t("privateLesson.timerLabel")}
              aria-live="polite"
            >
              {minutes}:{seconds}
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
                t(`privateLesson.voiceOptions.${session.lesson.teacherVoice}`)}
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

          <div className="private-lesson-tutor-stage">
            <TeacherAvatar
              audioLevel={tutorAudioLevel}
              active={phase === "active" || phase === "wrapping"}
              label={status}
              variant={session?.lesson.teacherVoice ?? teacherVoice}
            />
            <div className="private-lesson-tutor-caption" aria-live="polite">
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

          <div className="private-lesson-transcript" aria-live="polite">
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
                  <span className="private-lesson-wave" aria-hidden="true">
                    <i /> <i /> <i /> <i /> <i />
                  </span>
                )}
                <p>{status}</p>
              </div>
            )}
          </div>

          {phase === "ended" ? (
            <button className="button primary" type="button" onClick={reset}>
              <RotateCcw size={18} /> {t("privateLesson.restart")}
            </button>
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
                onClick={() => session && requestWrapUp(session)}
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
        </section>
      )}
      <audio ref={audioRef} autoPlay />
    </div>
  );
}
