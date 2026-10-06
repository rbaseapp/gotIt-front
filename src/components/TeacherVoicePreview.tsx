import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Volume2, LoaderCircle } from "lucide-react";
import { z } from "zod";
import { product, errorMessage } from "../lib/product";
const sample = z.object({
  teacherVoice: z.enum(["female", "male"]),
  sampleLanguageCode: z.literal("en"),
  contentType: z.literal("audio/mpeg"),
  audioBase64: z
    .string()
    .min(1)
    .max(1_400_000)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});
export function TeacherVoicePreview({ voice }: { voice: "female" | "male" }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement | undefined>(undefined);
  const audioUrl = useRef<string | undefined>(undefined);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      audio.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    },
    [],
  );
  async function play() {
    if (busy) return;
    const request = ++generation.current;
    setBusy(true);
    setError("");
    audio.current?.pause();
    if (audioUrl.current) {
      URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = undefined;
    }
    try {
      const result = await product(
        sample,
        "private-lessons/voice-sample",
        "POST",
        { teacherVoice: voice },
      );
      if (request !== generation.current) return;
      const bytes = Uint8Array.from(atob(result.audioBase64), (character) =>
        character.charCodeAt(0),
      );
      audioUrl.current = URL.createObjectURL(
        new Blob([bytes], { type: result.contentType }),
      );
      audio.current = new Audio(audioUrl.current);
      await audio.current.play();
    } catch (reason) {
      if (request === generation.current) setError(errorMessage(reason));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  return (
    <div className="teacher-voice-preview">
      <button
        type="button"
        className="button ghost"
        disabled={busy}
        onClick={() => void play()}
      >
        {busy ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <Volume2 size={18} />
        )}{" "}
        {t("lessonUi.voiceSample")}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
