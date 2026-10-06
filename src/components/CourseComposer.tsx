import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Mic, Square, Volume2, Send, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { recordVoice } from "../lib/voice";
import { courseApi } from "../lib/courses";
import { errorMessage } from "../lib/product";

export function ReadAloud({
  text,
  language,
  label,
  autoPlay = false,
  showLabel = false,
  className = "course-icon-button",
}: {
  text: string;
  language: string;
  label?: string;
  autoPlay?: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const autoPlayed = useRef("");
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const update = () => setVoices(synth.getVoices());
    update();
    synth.addEventListener("voiceschanged", update);
    return () => {
      synth.removeEventListener("voiceschanged", update);
      synth.cancel();
    };
  }, []);
  const voice = voices.find(
    (v) =>
      v.lang.split("-")[0].toLowerCase() ===
      language.split("-")[0].toLowerCase(),
  );
  const play = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }, [text, language, voice]);
  useEffect(() => {
    if (!autoPlay || !text || !window.speechSynthesis) return;
    const key = `${language}:${text}`;
    if (autoPlayed.current === key) return;
    autoPlayed.current = key;
    const timer = window.setTimeout(play, 0);
    return () => window.clearTimeout(timer);
  }, [autoPlay, text, language, play]);
  if (!window.speechSynthesis) return null;
  return (
    <button
      type="button"
      className={className}
      aria-label={`${t(speaking ? "courses.stopAudio" : "courses.readAloud")}${label ? `: ${label}` : ""}`}
      onClick={() => {
        window.speechSynthesis.cancel();
        if (speaking) {
          setSpeaking(false);
          return;
        }
        play();
      }}
    >
      {speaking ? <Square size={17} /> : <Volume2 size={17} />}
      {showLabel &&
        (speaking ? t("courses.stopAudio") : label || t("courses.readAloud"))}
    </button>
  );
}

export function CourseComposer({
  value,
  onChange,
  onSubmit,
  language,
  disabled = false,
  label,
  submitLabel,
  onDraftChange,
  replaceVoice = false,
  holdToTalk = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (channel: "text" | "voice") => void;
  language: string;
  disabled?: boolean;
  label?: string;
  submitLabel?: string;
  onDraftChange?: () => void;
  replaceVoice?: boolean;
  holdToTalk?: boolean;
}) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false),
    [transcribing, setTranscribing] = useState(false),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null),
    release = useRef<AbortController | null>(null);
  const holdPointer = useRef<number | null>(null),
    holdKey = useRef<string | null>(null);
  const channel = useRef<"text" | "voice">("text");
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!value) channel.current = "text";
  }, [value]);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!holdToTalk) return;
    const cancel = () => {
      if (holdPointer.current === null && holdKey.current === null) return;
      holdPointer.current = null;
      holdKey.current = null;
      controller.current?.abort();
      setRecording(false);
    };
    const cancelIfHidden = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancelIfHidden);
    return () => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancelIfHidden);
    };
  }, [holdToTalk]);
  async function record() {
    if (recording) {
      release.current?.abort();
      return;
    }
    const abort = new AbortController(),
      stop = new AbortController();
    controller.current = abort;
    release.current = stop;
    setError("");
    window.speechSynthesis?.cancel();
    setRecording(true);
    try {
      const audio = await recordVoice(abort.signal, stop.signal, 15);
      if (abort.signal.aborted) return;
      setRecording(false);
      setTranscribing(true);
      const result = await courseApi.transcribe(audio, language);
      if (!abort.signal.aborted) {
        onChange(
          replaceVoice
            ? result.text
            : [value, result.text].filter(Boolean).join(" "),
        );
        channel.current = "voice";
        input.current?.focus();
      }
    } catch (err) {
      if (!abort.signal.aborted) setError(errorMessage(err));
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        release.current = null;
      }
      if (!abort.signal.aborted) {
        setRecording(false);
        setTranscribing(false);
      }
    }
  }
  function finishHold(cancel = false) {
    holdPointer.current = null;
    holdKey.current = null;
    if (cancel) {
      controller.current?.abort();
      setRecording(false);
    } else release.current?.abort();
  }
  function startPointer(event: PointerEvent<HTMLButtonElement>) {
    if (
      event.button !== 0 ||
      disabled ||
      recording ||
      transcribing ||
      holdPointer.current !== null ||
      holdKey.current !== null
    )
      return;
    holdPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    void record();
  }
  function stopPointer(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    if (holdPointer.current === event.pointerId) finishHold(cancel);
  }
  function startKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      (event.key !== " " && event.key !== "Enter") ||
      event.repeat ||
      disabled ||
      recording ||
      transcribing
    )
      return;
    event.preventDefault();
    if (holdPointer.current !== null || holdKey.current !== null) return;
    holdKey.current = event.key;
    void record();
  }
  function stopKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (holdKey.current !== event.key) return;
    event.preventDefault();
    finishHold();
  }
  return (
    <form
      className="course-composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim() && !disabled && !recording && !transcribing)
          onSubmit(channel.current);
      }}
    >
      <label className="course-input-label">
        <span>{label ?? t("courses.answerLabel")}</span>
        <textarea
          ref={input}
          dir="auto"
          maxLength={1500}
          rows={2}
          value={value}
          disabled={disabled || transcribing || recording}
          placeholder={t("courses.answerPlaceholder")}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onDraftChange}
        />
      </label>
      <div className="course-composer-actions">
        <button
          type="button"
          className={`button secondary${recording ? " course-recording" : ""}${holdToTalk ? " course-hold-to-talk" : ""}`}
          disabled={disabled || transcribing}
          onClick={holdToTalk ? undefined : () => void record()}
          onPointerDown={holdToTalk ? startPointer : undefined}
          onPointerUp={holdToTalk ? (event) => stopPointer(event) : undefined}
          onPointerCancel={
            holdToTalk ? (event) => stopPointer(event, true) : undefined
          }
          onLostPointerCapture={
            holdToTalk ? (event) => stopPointer(event, true) : undefined
          }
          onKeyDown={holdToTalk ? startKey : undefined}
          onKeyUp={holdToTalk ? stopKey : undefined}
          onBlur={
            holdToTalk
              ? () => {
                  if (holdPointer.current !== null || holdKey.current !== null)
                    finishHold(true);
                }
              : undefined
          }
          aria-pressed={recording}
        >
          {transcribing ? (
            <LoaderCircle className="spin" size={18} />
          ) : recording ? (
            <Square size={18} />
          ) : (
            <Mic size={18} />
          )}
          {t(
            transcribing
              ? "courses.transcribing"
              : recording
                ? holdToTalk
                  ? "courses.releaseToTranscribe"
                  : "courses.stopRecording"
                : holdToTalk
                  ? "courses.holdToTalk"
                  : "courses.voiceAnswer",
          )}
        </button>
        <button
          className="button primary"
          type="submit"
          disabled={disabled || recording || transcribing || !value.trim()}
        >
          <Send size={17} />
          {submitLabel ?? t("courses.send")}
        </button>
      </div>
      {recording && (
        <small role="status">
          {t(
            holdToTalk
              ? "courses.releaseToTranscribe"
              : "courses.recordingHint",
          )}
        </small>
      )}
      {channel.current === "voice" && value && (
        <small>{t("courses.checkTranscript")}</small>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error} {t("courses.typeFallback")}
        </p>
      )}
    </form>
  );
}
