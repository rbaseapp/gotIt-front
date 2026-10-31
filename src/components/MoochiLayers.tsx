import { useEffect, useRef, useState } from "react";
import {
  SPEECH_FLOOR,
  lookFor,
  mouthFor,
  nextGesture,
  type Look,
  type Mouth,
  type Pose,
} from "../lib/moochiMotion";
import "../moochi-avatar.css";
import poseRest from "../assets/moochi/pose-rest.webp";
import poseWave from "../assets/moochi/pose-wave.webp";
import poseExplain from "../assets/moochi/pose-explain.webp";
import poseIdea from "../assets/moochi/pose-idea.webp";
import poseThumbs from "../assets/moochi/pose-thumbs.webp";
import poseThink from "../assets/moochi/pose-think.webp";
import mouthSoft from "../assets/moochi/mouth-soft.webp";
import mouthMid from "../assets/moochi/mouth-mid.webp";
import mouthWide from "../assets/moochi/mouth-wide.webp";
import mouthRound from "../assets/moochi/mouth-round.webp";
import mouthEe from "../assets/moochi/mouth-ee.webp";
import lookBlink from "../assets/moochi/look-blink.webp";
import lookHappy from "../assets/moochi/look-happy.webp";
import lookThinking from "../assets/moochi/look-thinking.webp";
import lookSurprised from "../assets/moochi/look-surprised.webp";
import lookEncouraging from "../assets/moochi/look-encouraging.webp";
import lookEmpathetic from "../assets/moochi/look-empathetic.webp";

const POSES: Record<Pose, string> = {
  rest: poseRest,
  wave: poseWave,
  explain: poseExplain,
  idea: poseIdea,
  thumbs: poseThumbs,
  think: poseThink,
};
const MOUTHS: Record<Mouth, string> = {
  soft: mouthSoft,
  mid: mouthMid,
  wide: mouthWide,
  round: mouthRound,
  ee: mouthEe,
};
const LOOKS: Record<Look, string> = {
  blink: lookBlink,
  happy: lookHappy,
  thinking: lookThinking,
  surprised: lookSurprised,
  encouraging: lookEncouraging,
  empathetic: lookEmpathetic,
};

const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Moochi's frames: the body in a pose, the mouth for the voice, the eyes and brows for a
 * look. Layers cross-fade, so the mouth and the hands move smoothly.
 */
export function MoochiLayers({
  activity,
  audioLevel,
  active,
}: {
  activity: "idle" | "listening" | "thinking";
  audioLevel: number;
  active: boolean;
}) {
  const level = active ? audioLevel : 0;
  const speaking = level >= SPEECH_FLOOR;
  const calm = reducedMotion();

  // A new syllable starts whenever the voice rises after a quiet moment.
  const [syllable, setSyllable] = useState(0);
  const wasQuiet = useRef(true);
  useEffect(() => {
    if (level < SPEECH_FLOOR) wasQuiet.current = true;
    else if (wasQuiet.current && level > 0.08) {
      wasQuiet.current = false;
      setSyllable((count) => count + 1);
    }
  }, [level]);
  const mouth = mouthFor(level, syllable);

  // Blinks every few seconds, and a warm look now and then while the learner talks.
  const [blinking, setBlinking] = useState(false);
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    if (!active || calm) return;
    let blinkTimer: ReturnType<typeof setTimeout>;
    let closeTimer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      blinkTimer = setTimeout(
        () => {
          setBlinking(true);
          closeTimer = setTimeout(() => setBlinking(false), 140);
          schedule();
        },
        2600 + Math.random() * 3400,
      );
    };
    schedule();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(closeTimer);
    };
  }, [active, calm]);
  useEffect(() => {
    if (!active || calm || activity !== "listening" || speaking) {
      setWarm(false);
      return;
    }
    let on: ReturnType<typeof setTimeout>;
    let off: ReturnType<typeof setTimeout>;
    const schedule = () => {
      on = setTimeout(
        () => {
          setWarm(true);
          off = setTimeout(() => {
            setWarm(false);
            schedule();
          }, 2200);
        },
        9000 + Math.random() * 5000,
      );
    };
    schedule();
    return () => {
      clearTimeout(on);
      clearTimeout(off);
      setWarm(false);
    };
  }, [active, calm, activity, speaking]);

  // The hands: a wave when the lesson opens, gestures while Moochi explains, a thinking pose.
  const [pose, setPose] = useState<Pose>("rest");
  const greeted = useRef(false);
  useEffect(() => {
    if (!active || calm) {
      setPose("rest");
      return;
    }
    if (activity === "thinking") {
      setPose("think");
      return;
    }
    if (!greeted.current) {
      greeted.current = true;
      setPose("wave");
      const done = setTimeout(() => setPose("rest"), 2400);
      return () => clearTimeout(done);
    }
    if (!speaking) {
      setPose("rest");
      return;
    }
    let step = 0;
    const move = setInterval(() => {
      step += 1;
      setPose((previous) => nextGesture(previous, step));
    }, 2800);
    return () => clearInterval(move);
  }, [active, calm, activity, speaking]);

  const look = mouth ? null : lookFor(activity, blinking, warm);
  return (
    <span className="moochi-layers" aria-hidden="true">
      {(Object.keys(POSES) as Pose[]).map((name) => (
        <img
          key={name}
          className="moochi-pose"
          data-on={pose === name || undefined}
          src={POSES[name]}
          alt=""
        />
      ))}
      {(Object.keys(MOUTHS) as Mouth[]).map((name) => (
        <img
          key={name}
          className="moochi-mouth"
          data-on={mouth === name || undefined}
          src={MOUTHS[name]}
          alt=""
        />
      ))}
      {(Object.keys(LOOKS) as Look[]).map((name) => (
        <img
          key={name}
          className="moochi-look"
          data-look={name}
          data-on={look === name || undefined}
          src={LOOKS[name]}
          alt=""
        />
      ))}
    </span>
  );
}
