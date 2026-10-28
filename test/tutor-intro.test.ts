import { describe, expect, it } from "vitest";
import { canMeetTutor } from "../src/lib/onboarding/tutorIntro";
import type { PlacementResult } from "../src/lib/placement/types";

const base = {
  theta: 20,
  knownEstimate: 400,
  literacy: "reader",
  skills: { vocabulary: "ok", reading: "ok", listening: "ok" },
} as unknown as PlacementResult;

describe("first conversation with the teacher", () => {
  it("is offered to a learner who can hold a short conversation", () => {
    expect(canMeetTutor(base)).toBe(true);
  });
  it("is not offered to a beginner", () => {
    expect(canMeetTutor({ ...base, theta: 3, knownEstimate: 50 })).toBe(false);
  });
  it("needs enough known words even at A1", () => {
    expect(canMeetTutor({ ...base, theta: 8, knownEstimate: 100 })).toBe(false);
  });
  it("is not offered when listening is weak or reading is just starting", () => {
    expect(
      canMeetTutor({
        ...base,
        skills: { ...base.skills, listening: "weak" },
      }),
    ).toBe(false);
    expect(canMeetTutor({ ...base, literacy: "starting" })).toBe(false);
  });
  it("is not offered without a result", () => {
    expect(canMeetTutor(null)).toBe(false);
  });
});
