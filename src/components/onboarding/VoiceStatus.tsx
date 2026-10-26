import { useTranslation } from "react-i18next";
import { Mic, MicOff } from "lucide-react";
import type { VoiceState } from "../../lib/onboarding/voiceAnswer";

/** Tells the learner what the avatar is doing: speaking, listening, or why tapping is the way. */
export function VoiceStatus({
  state,
  heard,
  retry,
}: {
  state: VoiceState;
  heard: string;
  retry: () => void;
}) {
  const { t } = useTranslation();
  if (state === "idle") return null;
  const off = state === "unsupported" || state === "denied";
  return (
    <p className="ob-voice" data-state={state} role="status" aria-live="polite">
      {off ? (
        <MicOff size={16} aria-hidden="true" />
      ) : (
        <Mic size={16} aria-hidden="true" />
      )}
      <span>
        {state === "speaking" && t("start.voice.speaking")}
        {state === "listening" && t("start.voice.listening")}
        {state === "nomatch" &&
          (heard
            ? t("start.voice.nomatchHeard", { heard })
            : t("start.voice.nomatch"))}
        {state === "unsupported" && t("start.voice.unsupported")}
        {state === "denied" && t("start.voice.denied")}
      </span>
      {state === "nomatch" && (
        <button type="button" className="ob-link" onClick={retry}>
          {t("start.voice.retry")}
        </button>
      )}
    </p>
  );
}
