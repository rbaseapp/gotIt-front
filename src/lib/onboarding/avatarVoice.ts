import { useCallback, useEffect, useRef, useState } from "react";
import { canSpeak } from "../placement/speech";

const VOICE_LANGUAGE: Record<string, string> = {
  he: "he-IL",
  en: "en-US",
  ru: "ru-RU",
  ar: "ar-SA",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  zh: "zh-CN",
};
const MUTE_KEY = "gotit.onboarding.avatarMuted";
const readMuted = () => {
  try {
    return sessionStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * The avatar's voice for the questions: the browser's own voice, free and instant.
 * Recorded audio can replace it later without changing the screens. Always paired with
 * the written caption, so nothing depends on sound.
 */
export function useAvatarVoice(
  text: string | null,
  options: { auto: boolean; language: string },
) {
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(readMuted);
  const lastSpoken = useRef<string | null>(null);

  const say = useCallback(
    (line: string) => {
      if (!canSpeak() || !line) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(line);
        utterance.lang = VOICE_LANGUAGE[options.language] ?? "en-US";
        utterance.rate = 0.95;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setSpeaking(false);
      }
    },
    [options.language],
  );

  useEffect(() => {
    if (!text || !options.auto || muted || lastSpoken.current === text) return;
    lastSpoken.current = text;
    say(text);
  }, [text, options.auto, muted, say]);

  useEffect(
    () => () => {
      if (canSpeak()) window.speechSynthesis.cancel();
    },
    [],
  );

  return {
    available: canSpeak(),
    speaking,
    muted,
    replay: () => text && say(text),
    toggleMute: () => {
      const next = !muted;
      setMuted(next);
      try {
        sessionStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        // The choice just will not survive a reload.
      }
      if (next && canSpeak()) window.speechSynthesis.cancel();
    },
  };
}
