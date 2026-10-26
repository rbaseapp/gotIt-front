import { useEffect, useRef, useState } from "react";
import loop from "../assets/ux/moochi-loop.mp4";
import poster from "../assets/ux/moochi-loop-poster.webp";
import { MOOCHI_CARD_TRACK } from "../lib/moochiLoopTrack";

/** The word on his card changes every loop; the same six greetings as in the design. */
const GREETINGS = [
  { text: "hola", lang: "es" },
  { text: "hello", lang: "en" },
  { text: "bonjour", lang: "fr", small: true },
  { text: "ciao", lang: "it" },
  { text: "hallo", lang: "de" },
  { text: "שלום", lang: "he", dir: "rtl" },
] as const;

const FPS = 24;
const FRAMES = MOOCHI_CARD_TRACK.length;

/** How visible the word is at a frame: it is hidden while he writes and while he turns the card. */
function wordShape(frame: number) {
  let opacity = 1;
  let scaleX = 1;
  if (frame >= 53 && frame < 57) opacity = 1 - (frame - 53) / 4;
  else if (frame >= 57 && frame < 198) opacity = 0;
  else if (frame >= 198 && frame < 206)
    scaleX = Math.max(0.02, Math.sin(((frame - 198) / 8) * (Math.PI / 2)));
  else if (frame >= 262 && frame < 265) opacity = 1 - (frame - 262) / 3;
  else if (frame >= 265 && frame < 268) opacity = 0;
  else if (frame >= 268 && frame < 271) opacity = (frame - 268) / 3;
  return { opacity, scaleX };
}

/**
 * Moochi tossing his marker, from the approved design: a looping video with a greeting
 * written on his card that follows the card frame by frame. Falls back to the still
 * picture for people who ask for less motion.
 */
export function MoochiLoop({ label }: { label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const card = useRef<HTMLSpanElement>(null);
  const [still, setStill] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const change = () => setStill(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    if (still) return;
    let frame = 0;
    let loops = 0;
    let last = 0;
    const tick = () => {
      const node = video.current;
      const holder = card.current;
      if (node && holder) {
        const time = node.currentTime || 0;
        const position = time * FPS;
        const index = Math.floor(position) % FRAMES;
        const next = (index + 1) % FRAMES;
        const part = position - Math.floor(position);
        if (time + 0.5 < last) loops += 1;
        last = time;
        const a = MOOCHI_CARD_TRACK[index]!;
        const b = MOOCHI_CARD_TRACK[next]!;
        const at = (i: 0 | 1 | 2 | 3) => a[i] + (b[i] - a[i]) * part;
        const shown = index + 1 + part;
        // A new greeting each time he has written one.
        const which = (loops + (shown >= 133 ? 1 : 0)) % GREETINGS.length;
        const { opacity, scaleX } = wordShape(shown);
        holder.style.left = `${at(0)}%`;
        holder.style.top = `${at(1)}%`;
        holder.style.transform = `translate(-50%,-50%) rotate(${at(3)}deg) scaleX(${scaleX.toFixed(3)})`;
        holder.style.fontSize = `${(at(2) * 0.25).toFixed(2)}cqw`;
        holder.style.opacity = String(opacity);
        Array.from(holder.children).forEach((word, i) => {
          (word as HTMLElement).style.display = i === which ? "flex" : "none";
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [still]);

  return (
    <span className="moochi-loop" role="img" aria-label={label}>
      {still ? (
        <img src={poster} alt="" />
      ) : (
        <video
          ref={video}
          src={loop}
          poster={poster}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      )}
      {!still && (
        <span className="moochi-loop-card" ref={card} aria-hidden="true">
          {GREETINGS.map((greeting) => (
            <span
              key={greeting.lang}
              className="moochi-loop-word"
              lang={greeting.lang}
              dir={"dir" in greeting ? greeting.dir : undefined}
            >
              <b className={"small" in greeting ? "small" : undefined}>
                {greeting.text}
              </b>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
