import type { CSSProperties } from "react";
import tutorFemaleBlink from "../assets/private-lesson/tutor-female-blink.png";
import tutorFemaleListening from "../assets/private-lesson/tutor-female-listening.png";
import tutorFemaleSpeaking from "../assets/private-lesson/tutor-female-speaking.png";
import tutorFemaleSpeakingWide from "../assets/private-lesson/tutor-female-speaking-wide.png";
import tutorFemaleThinking from "../assets/private-lesson/tutor-female-thinking.png";
import tutorMaleBlink from "../assets/private-lesson/tutor-blink.png";
import tutorMaleListening from "../assets/private-lesson/tutor-listening.png";
import tutorMaleSpeaking from "../assets/private-lesson/tutor-speaking.png";
import tutorMaleSpeakingWide from "../assets/private-lesson/tutor-speaking-wide.png";
import tutorMaleThinking from "../assets/private-lesson/tutor-thinking.png";

type TeacherAvatarProps = {
  activity: "idle" | "listening" | "thinking";
  audioLevel: number;
  active: boolean;
  label: string;
  variant: "female" | "male";
};

export function TeacherAvatar({
  activity,
  audioLevel,
  active,
  label,
  variant,
}: TeacherAvatarProps) {
  const level =
    active && Number.isFinite(audioLevel)
      ? Math.max(0, Math.min(1, audioLevel))
      : 0;
  // The remote audio meter already smooths its samples and updates every ~70 ms.
  // Blend just the mouth region so the rest of the portrait stays still.
  const mouthOpen = Math.max(0, Math.min(1, (level - 0.025) / 0.13));
  const wideMouth = Math.max(0, Math.min(1, (level - 0.2) / 0.55));
  const visualActivity = mouthOpen > 0 ? "speaking" : activity;
  const listeningImage =
    variant === "female" ? tutorFemaleListening : tutorMaleListening;
  const speakingImage =
    variant === "female" ? tutorFemaleSpeaking : tutorMaleSpeaking;
  const speakingWideImage =
    variant === "female" ? tutorFemaleSpeakingWide : tutorMaleSpeakingWide;
  const blinkImage = variant === "female" ? tutorFemaleBlink : tutorMaleBlink;
  const thinkingImage =
    variant === "female" ? tutorFemaleThinking : tutorMaleThinking;

  return (
    <div
      className={`teacher-avatar ${variant} ${visualActivity}${active ? " active" : ""}`}
      style={
        {
          "--tutor-ring-size": `${5 + level * 13}px`,
          "--tutor-ring-alpha": 0.08 + level * 0.12,
          "--tutor-ring-scale": 1 + level * 0.025,
          "--tutor-bar-small": `${7 + level * 15}px`,
          "--tutor-bar-medium": `${11 + level * 10}px`,
          "--tutor-bar-large": `${15 + level * 8}px`,
          "--tutor-speech-lift": `${-Math.max(0.5, level * 2.2)}px`,
          "--tutor-mouth-soft": mouthOpen * (1 - wideMouth),
          "--tutor-mouth-wide": mouthOpen * wideMouth,
        } as CSSProperties
      }
      role="img"
      aria-label={label}
    >
      <span className="teacher-avatar-ring" aria-hidden="true" />
      <span className="teacher-avatar-portrait" aria-hidden="true">
        <img src={listeningImage} alt="" />
        <img
          className="teacher-avatar-thinking-frame"
          src={thinkingImage}
          alt=""
        />
        <img className="teacher-avatar-speaking" src={speakingImage} alt="" />
        <img
          className="teacher-avatar-speaking-wide"
          src={speakingWideImage}
          alt=""
        />
        <img className="teacher-avatar-blink" src={blinkImage} alt="" />
      </span>
      <span className="teacher-avatar-thinking" aria-hidden="true">
        <i /> <i /> <i />
      </span>
      <span className="teacher-avatar-level" aria-hidden="true">
        <i /> <i /> <i /> <i /> <i />
      </span>
    </div>
  );
}
