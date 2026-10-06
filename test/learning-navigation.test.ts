import { describe, expect, it } from "vitest";
import {
  chooseProgram,
  selectedProgram,
  learningReturn,
  practiceLink,
} from "../src/lib/learningNavigation";

describe("learning context navigation", () => {
  it("preserves explicit word, pack and reading scope when choosing a game", () => {
    const scope = new URLSearchParams({
      items: "a,b",
      pack: "pack-id",
      reading: "reading-id",
      language: "ar",
      return: "/vocabulary?topic=travel",
    });
    const url = new URL(
      practiceLink("spelling", scope, "en"),
      "https://local.test",
    );
    expect(url.pathname).toBe("/learn/session/recall");
    expect(url.searchParams.get("input")).toBe("letters");
    for (const [key, value] of scope)
      expect(url.searchParams.get(key)).toBe(value);
  });
  it("never adds a conflicting default language to a scoped exercise", () => {
    expect(practiceLink("matching", new URLSearchParams("items=a"), "en")).toBe(
      "/learn/session/matching?items=a",
    );
    expect(practiceLink("smart", new URLSearchParams(), "fr")).toBe(
      "/learn/smart?language=fr",
    );
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/dashboard\n",
    "/billing",
    "/dashboard/../billing",
  ])("rejects an unsafe return destination %s", (destination) => {
    expect(learningReturn(destination)).toBe("/learn");
  });
  it("returns to the actual originating map or library", () => {
    expect(learningReturn("/courses/a?unit=b")).toBe("/courses/a?unit=b");
    expect(learningReturn("/word-packs")).toBe("/word-packs");
    expect(learningReturn("/reading")).toBe("/reading");
  });
  it("keeps selected programs separate for users and applications", () => {
    const first = { id: "first", applicationId: "gotit" };
    chooseProgram("course-a", first);
    expect(selectedProgram(first)).toBe("course-a");
    expect(
      selectedProgram({ id: "second", applicationId: "gotit" }),
    ).toBeNull();
    expect(
      selectedProgram({ id: "first", applicationId: "another" }),
    ).toBeNull();
  });
  it("keeps explicit selections for multiple languages without picking a default course", () => {
    const owner = { id: "multi", applicationId: "gotit" };
    expect(selectedProgram(owner, "fr")).toBeNull();
    chooseProgram("english-path", owner, "en");
    chooseProgram("french-course", owner, "fr");
    expect(selectedProgram(owner, "en")).toBe("english-path");
    expect(selectedProgram(owner, "fr")).toBe("french-course");
  });
});
