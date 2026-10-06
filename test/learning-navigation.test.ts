import { describe, expect, it } from "vitest";
import {
  chooseProgram,
  selectedProgram,
  learningReturn,
  practiceLink,
  unitPracticeLink,
  selectedProgramKey,
} from "../src/lib/learningNavigation";
import { seedProfile } from "../src/data/seed";

describe("learning context navigation", () => {
  it.each([10, 15, 20])(
    "opens a direct unit batch using the daily preference %i",
    (count) => {
      const url = new URL(
        unitPracticeLink("unit", "en", {
          ...seedProfile,
          defaultNewItemsPerDay: count,
        }),
        "https://local.test",
      );
      expect(url.pathname).toBe("/learn/session/smart");
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        pack: "unit",
        language: "en",
        count: String(count),
        ready: "1",
        batch: "1",
        includeNew: "1",
        return: "/english-learning?unit=unit&tab=words",
      });
    },
  );
  it.each([
    ["short", "10", "1"],
    ["long", "20", "1"],
    ["review", "10", "0"],
  ])(
    "uses the saved %s pace for this user and language",
    (pace, count, includeNew) => {
      const user = { id: "first", applicationId: "gotit" };
      localStorage.setItem(`${selectedProgramKey(user)}.practicePace.en`, pace);
      const url = new URL(
        unitPracticeLink("unit", "en", seedProfile, user),
        "https://local.test",
      );
      expect(url.searchParams.get("count")).toBe(count);
      expect(url.searchParams.get("includeNew")).toBe(includeNew);
      expect(
        new URL(
          unitPracticeLink(
            "unit",
            "fr",
            { ...seedProfile, defaultNewItemsPerDay: 15 },
            user,
          ),
          "https://local.test",
        ).searchParams.get("count"),
      ).toBe("15");
    },
  );
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
