/**
 * Moochi's motion rules: which mouth, which gesture, which look. Pure functions, so they can be
 * tested without a browser. The frames themselves are in src/assets/moochi.
 */
export type Mouth = "soft" | "mid" | "wide" | "round" | "ee";
export type Pose = "rest" | "wave" | "explain" | "idea" | "thumbs" | "think";
export type Look =
  "blink" | "happy" | "thinking" | "surprised" | "encouraging" | "empathetic";

/** Below this level the tutor is silent and the mouth is closed. */
export const SPEECH_FLOOR = 0.04;

/**
 * The mouth follows the voice level. Syllables alternate the shapes a little (round, wide,
 * "ee") so the mouth does not just open and shut.
 */
export function mouthFor(level: number, syllable: number): Mouth | null {
  if (!Number.isFinite(level) || level < SPEECH_FLOOR) return null;
  const turn = syllable % 3;
  if (level < 0.14) return "soft";
  if (level < 0.34) return turn === 1 ? "round" : "mid";
  return turn === 2 ? "ee" : turn === 1 ? "round" : "wide";
}

/** Gestures used while explaining; the pose returns to rest between them. */
export const SPEAKING_GESTURES: Pose[] = ["explain", "idea", "rest", "explain"];

export function nextGesture(previous: Pose, step: number): Pose {
  const next = SPEAKING_GESTURES[step % SPEAKING_GESTURES.length]!;
  return next === previous ? "rest" : next;
}

/** The face that goes with the tutor's state when no mouth is moving. */
export function lookFor(
  activity: "idle" | "listening" | "thinking",
  blinking: boolean,
  warm: boolean,
): Look | null {
  if (activity === "thinking") return "thinking";
  if (blinking) return "blink";
  return warm ? "encouraging" : null;
}
