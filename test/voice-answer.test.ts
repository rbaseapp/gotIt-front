import { describe, expect, it } from "vitest";
import { matchSpoken } from "../src/lib/onboarding/voiceAnswer";

describe("spoken answers", () => {
  const hebrew = ["לדון", "מלחמה", "מקצועי", "סרט קולנוע"];
  it("picks the choice that was said", () => {
    expect(matchSpoken(["מלחמה"], hebrew, "he")).toEqual({
      kind: "choice",
      index: 1,
    });
  });
  it("tolerates a small recognition slip and extra words", () => {
    expect(matchSpoken(["אני חושב שזה לדון"], hebrew, "he")).toEqual({
      kind: "choice",
      index: 0,
    });
    expect(matchSpoken(["מקצועית"], hebrew, "he")).toEqual({
      kind: "choice",
      index: 2,
    });
  });
  it("uses the other recognition alternatives", () => {
    expect(matchSpoken(["blah", "סרט קולנוע"], hebrew, "he")).toEqual({
      kind: "choice",
      index: 3,
    });
  });
  it("hears 'I don't know' in the interface language and in English", () => {
    expect(matchSpoken(["לא יודע"], hebrew, "he")).toEqual({ kind: "dk" });
    expect(matchSpoken(["אין לי מושג"], hebrew, "he")).toEqual({ kind: "dk" });
    expect(matchSpoken(["I don't know"], hebrew, "he")).toEqual({ kind: "dk" });
    expect(matchSpoken(["ich weiß nicht"], ["a", "b"], "de")).toEqual({
      kind: "dk",
    });
  });
  it("gives up when nothing is close, instead of guessing", () => {
    expect(matchSpoken(["שלום עולם"], hebrew, "he")).toBeNull();
    expect(matchSpoken([], hebrew, "he")).toBeNull();
  });
  it("matches a whole English reply by its words", () => {
    const replies = [
      "I had two meetings.",
      "I did had two meetings.",
      "I have two meetings yesterday.",
    ];
    expect(matchSpoken(["I had two meetings"], replies, "en")).toEqual({
      kind: "choice",
      index: 0,
    });
  });
  it("does not pick between equally likely choices", () => {
    expect(
      matchSpoken(
        ["two meetings"],
        ["two meetings today", "two meetings tomorrow"],
        "en",
      ),
    ).toBeNull();
  });
});
