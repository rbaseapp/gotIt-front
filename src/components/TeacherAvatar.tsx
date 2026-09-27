import type { CSSProperties } from "react";
import tutorFemaleListening from "../assets/private-lesson/tutor-female-listening.png";
import tutorFemaleSpeaking from "../assets/private-lesson/tutor-female-speaking.png";
import tutorMaleListening from "../assets/private-lesson/tutor-listening.png";
import tutorMaleSpeaking from "../assets/private-lesson/tutor-speaking.png";

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
  const level = active ? Math.max(0, Math.min(1, audioLevel)) : 0;
  const speechFrame =
    level > 0.48 ? "speaking-strong" : level > 0.12 ? "speaking-soft" : "";
  const visualActivity = speechFrame ? "speaking" : activity;
  const listeningImage =
    variant === "female" ? tutorFemaleListening : tutorMaleListening;
  const speakingImage =
    variant === "female" ? tutorFemaleSpeaking : tutorMaleSpeaking;

  return (
    <div
      className={`teacher-avatar ${variant} ${visualActivity}${active ? " active" : ""}${speechFrame ? ` ${speechFrame}` : ""}`}
      style={
        {
          "--tutor-ring-size": `${5 + level * 13}px`,
          "--tutor-ring-alpha": 0.08 + level * 0.12,
          "--tutor-ring-scale": 1 + level * 0.025,
          "--tutor-bar-small": `${7 + level * 15}px`,
          "--tutor-bar-medium": `${11 + level * 10}px`,
          "--tutor-bar-large": `${15 + level * 8}px`,
          "--tutor-speech-lift": `${-Math.max(0.5, level * 2.2)}px`,
        } as CSSProperties
      }
      role="img"
      aria-label={label}
    >
      <span className="teacher-avatar-ring" aria-hidden="true" />
      <span className="teacher-avatar-portrait" aria-hidden="true">
        <img src={listeningImage} alt="" />
        <img className="teacher-avatar-speaking" src={speakingImage} alt="" />
        <span className="teacher-avatar-blink" />
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
