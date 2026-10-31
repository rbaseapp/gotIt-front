import { expect, it } from "vitest";
import {
  SPEECH_FLOOR,
  lookFor,
  mouthFor,
  nextGesture,
} from "../src/lib/moochiMotion";

it("keeps the mouth closed in silence and opens it with the voice", () => {
  expect(mouthFor(0, 0)).toBeNull();
  expect(mouthFor(SPEECH_FLOOR - 0.01, 3)).toBeNull();
  expect(mouthFor(Number.NaN, 0)).toBeNull();
  expect(mouthFor(0.1, 0)).toBe("soft");
  expect(mouthFor(0.2, 0)).toBe("mid");
  expect(mouthFor(0.6, 0)).toBe("wide");
});

it("varies the shape from one syllable to the next", () => {
  const shapes = [0, 1, 2].map((syllable) => mouthFor(0.6, syllable));
  expect(new Set(shapes).size).toBe(3);
  expect(shapes).toEqual(["wide", "round", "ee"]);
});

it("moves the hands while speaking and returns to rest between gestures", () => {
  const seen = new Set<string>();
  let pose = "rest" as ReturnType<typeof nextGesture>;
  for (let step = 1; step <= 8; step++) {
    pose = nextGesture(pose, step);
    seen.add(pose);
  }
  expect(seen.has("rest")).toBe(true);
  expect(seen.has("explain")).toBe(true);
  expect(seen.has("idea")).toBe(true);
});

it("chooses a look from the tutor's state", () => {
  expect(lookFor("thinking", true, true)).toBe("thinking");
  expect(lookFor("listening", true, false)).toBe("blink");
  expect(lookFor("listening", false, true)).toBe("encouraging");
  expect(lookFor("idle", false, false)).toBeNull();
});
