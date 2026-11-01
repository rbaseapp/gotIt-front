import { useEffect, useRef } from "react";
import {
  GESTURE_THINK,
  GESTURE_WAVE,
  SPEECH_FLOOR,
  MoochiCanvasEngine,
} from "../lib/moochiCanvasEngine";
import "../moochi-avatar.css";

const FRAMES = import.meta.glob("../assets/moochi/canvas/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const ASSETS = Object.fromEntries(
  Object.entries(FRAMES).map(([path, url]) => [
    path.slice(path.lastIndexOf("/") + 1, -".webp".length),
    url,
  ]),
);

const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Moochi on a canvas: the layered frames are composed by MoochiCanvasEngine, which moves the
 * hands, head, eyes and mouth on their own. This component only feeds it the lesson's state.
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
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<MoochiCanvasEngine | null>(null);
  const greeted = useRef(false);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const created = new MoochiCanvasEngine(element, {
      reducedMotion: reducedMotion(),
    });
    engine.current = created;
    created.load(ASSETS).catch(() => {});
    return () => {
      created.destroy();
      engine.current = null;
    };
  }, []);

  const level = active && Number.isFinite(audioLevel) ? audioLevel : 0;
  const speaking = level >= SPEECH_FLOOR;
  useEffect(() => {
    engine.current?.setLevel(level, speaking);
  }, [level, speaking]);

  useEffect(() => {
    engine.current?.setRunning(active);
  }, [active]);

  // The face and hands that go with the tutor's state: a wave when the lesson opens, the hand
  // on the chin while thinking, the gesture cycle while explaining.
  useEffect(() => {
    const current = engine.current;
    if (!current) return;
    current.setEmotion(activity === "thinking" ? "thinking" : "neutral");
    if (!active) {
      current.holdArms(null);
      return;
    }
    if (activity === "thinking") {
      current.holdArms(GESTURE_THINK);
      return;
    }
    if (!greeted.current) {
      greeted.current = true;
      current.holdArms(GESTURE_WAVE);
      const done = setTimeout(() => current.holdArms(null), 2400);
      return () => clearTimeout(done);
    }
    current.holdArms(null);
  }, [active, activity]);

  return (
    <canvas className="moochi-canvas" ref={canvas} aria-hidden="true" />
  );
}
