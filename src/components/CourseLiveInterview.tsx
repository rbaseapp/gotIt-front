import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TeacherAvatar } from "./TeacherAvatar";
import { courseApi, type Course } from "../lib/courses";
import {
  connectPrivateLesson,
  PrivateLessonConnectionError,
  type PrivateLessonConnection,
} from "../lib/privateLesson";
import { errorMessage } from "../lib/product";

type Props = {
  course: Course;
  onAnswer: (answer: string) => Promise<Course>;
  onFinish: () => void;
  onTranscript: (answer: string) => void;
  onActiveChange: (active: boolean) => void;
};

export function CourseLiveInterview({
  course,
  onAnswer,
  onFinish,
  onTranscript,
  onActiveChange,
}: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<
    "idle" | "connecting" | "listening" | "thinking" | "speaking"
  >("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const connection = useRef<PrivateLessonConnection | null>(null);
  const controller = useRef<AbortController | null>(null);
  const active = useRef(false);
  const processing = useRef(false);
  const finalReply = useRef(false);
  const playbackTimer = useRef<number | null>(null);
  const responseDone = useRef(false);
  const callbacks = useRef({
    onAnswer,
    onFinish,
    onTranscript,
    onActiveChange,
  });
  callbacks.current = { onAnswer, onFinish, onTranscript, onActiveChange };

  function stop() {
    active.current = false;
    processing.current = false;
    if (playbackTimer.current !== null)
      window.clearTimeout(playbackTimer.current);
    playbackTimer.current = null;
    controller.current?.abort();
    controller.current = null;
    connection.current?.close();
    connection.current = null;
    setLevel(0);
    setPhase("idle");
    callbacks.current.onActiveChange(false);
  }
  useEffect(
    () => () => {
      active.current = false;
      if (playbackTimer.current !== null)
        window.clearTimeout(playbackTimer.current);
      controller.current?.abort();
      connection.current?.close();
    },
    [],
  );

  function spokenTurnFinished() {
    if (!responseDone.current || !active.current) return;
    responseDone.current = false;
    if (playbackTimer.current !== null)
      window.clearTimeout(playbackTimer.current);
    playbackTimer.current = null;
    if (finalReply.current) {
      stop();
      callbacks.current.onFinish();
    } else {
      connection.current?.setMicrophoneMuted(false);
      setPhase("listening");
    }
  }

  async function start() {
    if (active.current) return;
    active.current = true;
    processing.current = false;
    finalReply.current = false;
    responseDone.current = false;
    setError("");
    setPhase("connecting");
    callbacks.current.onActiveChange(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const session = await courseApi.realtimeSession(course.id);
      if (abort.signal.aborted || !audio.current) return;
      const opened = await connectPrivateLesson(
        session,
        audio.current,
        {
          onOpen() {
            if (abort.signal.aborted) return;
            setPhase("speaking");
          },
          onClose() {
            if (!abort.signal.aborted) {
              setError(t("courses.liveDisconnected"));
              stop();
            }
          },
          onAudioLevel: setLevel,
          onEvent(event) {
            if (abort.signal.aborted) return;
            if (event.type === "response.done") {
              responseDone.current = true;
              // Some browsers omit the playback-stopped event. Keep audio audible
              // before reopening the microphone or moving to review.
              playbackTimer.current = window.setTimeout(
                spokenTurnFinished,
                8000,
              );
            }
            if (event.type === "output_audio_buffer.stopped")
              spokenTurnFinished();
            if (
              event.type ===
                "conversation.item.input_audio_transcription.completed" &&
              typeof event.transcript === "string" &&
              event.transcript.trim() &&
              !processing.current
            ) {
              processing.current = true;
              const transcript = event.transcript.trim();
              connection.current?.setMicrophoneMuted(true);
              setPhase("thinking");
              void callbacks.current
                .onAnswer(transcript)
                .then((updated) => {
                  if (abort.signal.aborted) return;
                  finalReply.current = updated.ready;
                  responseDone.current = false;
                  const reply = updated.messages.at(-1)?.text;
                  const language = updated.preferences.supportLanguageCode;
                  if (
                    !reply ||
                    !connection.current?.send({
                      type: "response.create",
                      response: {
                        instructions: `Speak only in ${language}. Say exactly this teacher message naturally, then stop: ${JSON.stringify(reply)}`,
                      },
                    })
                  )
                    throw new Error(t("courses.liveDisconnected"));
                  processing.current = false;
                  setPhase("speaking");
                })
                .catch((reason) => {
                  if (abort.signal.aborted) return;
                  callbacks.current.onTranscript(transcript);
                  setError(errorMessage(reason));
                  stop();
                });
            }
            if (event.type === "error") {
              setError(t("courses.liveDisconnected"));
              stop();
            }
          },
        },
        abort.signal,
      );
      if (abort.signal.aborted) opened.close();
      else connection.current = opened;
    } catch (reason) {
      if (abort.signal.aborted) return;
      setError(
        reason instanceof PrivateLessonConnectionError
          ? t(`privateLesson.errors.${reason.code}`)
          : errorMessage(reason),
      );
      stop();
    }
  }

  const running = phase !== "idle";
  return (
    <div className="course-live-interview">
      <audio ref={audio} autoPlay />
      <TeacherAvatar
        variant="female"
        activity={
          phase === "thinking" ? "thinking" : running ? "listening" : "idle"
        }
        audioLevel={level}
        active={running}
        label={t("courses.teacher")}
      />
      <p role="status">{t(`courses.liveStatus.${phase}`)}</p>
      <button
        type="button"
        className={`button ${running ? "secondary" : "primary"}`}
        onClick={running ? stop : () => void start()}
      >
        {phase === "connecting" ? (
          <LoaderCircle className="spin" size={18} />
        ) : running ? (
          <MicOff size={18} />
        ) : (
          <Mic size={18} />
        )}
        {t(
          running ? "courses.stopLiveInterview" : "courses.startLiveInterview",
        )}
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
