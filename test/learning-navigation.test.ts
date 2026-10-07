import { describe, expect, it } from "vitest";
import {
  chooseProgram,
  selectedProgram,
  learningReturn,
  practiceLink,
  unitPracticeLink,
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

describe("unit daily batch launch", () => {
  it.each([5, 10, 20])("uses a saved profile batch of %s words", (count) => {
    const owner = { id: "batch-" + count, applicationId: "gotit" };
    const url = new URL(
      unitPracticeLink(
        "unit",
        "en",
        { defaultNewItemsPerDay: count } as never,
        owner,
      ),
      "http://local.test",
    );
    expect(url.pathname).toBe("/learn/session/smart");
    expect(url.searchParams.get("count")).toBe(String(count));
    expect(url.searchParams.get("pack")).toBe("unit");
    expect(url.searchParams.get("ready")).toBe("1");
    expect(url.searchParams.get("batch")).toBe("1");
  });
  it("keeps an explicitly selected long pace local to its user and language", () => {
    const owner = { id: "pace", applicationId: "gotit" };
    localStorage.setItem(
      "gotit.selectedProgram.v1.gotit.pace.practicePace.en",
      "long",
    );
    const profile = { defaultNewItemsPerDay: 5 } as never;
    expect(
      new URL(
        unitPracticeLink("unit", "en", profile, owner),
        "http://local.test",
      ).searchParams.get("count"),
    ).toBe("20");
    expect(
      new URL(
        unitPracticeLink("unit", "fr", profile, owner),
        "http://local.test",
      ).searchParams.get("count"),
    ).toBe("5");
  });
});
