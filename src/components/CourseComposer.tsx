import { useCallback, useEffect, useRef, useState } from "react";
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
}: {
  text: string;
  language: string;
  label?: string;
  autoPlay?: boolean;
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
      className="course-icon-button"
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
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (channel: "text" | "voice") => void;
  language: string;
  disabled?: boolean;
  label?: string;
  submitLabel?: string;
  onDraftChange?: () => void;
}) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false),
    [transcribing, setTranscribing] = useState(false),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null),
    release = useRef<AbortController | null>(null);
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
      setRecording(false);
      setTranscribing(true);
      const result = await courseApi.transcribe(audio, language);
      if (!abort.signal.aborted) {
        onChange([value, result.text].filter(Boolean).join(" "));
        channel.current = "voice";
        input.current?.focus();
      }
    } catch (err) {
      if (!abort.signal.aborted) setError(errorMessage(err));
    } finally {
      if (!abort.signal.aborted) {
        setRecording(false);
        setTranscribing(false);
      }
    }
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
          className={`button secondary${recording ? " course-recording" : ""}`}
          disabled={disabled || transcribing}
          onClick={() => void record()}
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
                ? "courses.stopRecording"
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
      {recording && <small role="status">{t("courses.recordingHint")}</small>}
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
