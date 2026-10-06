import { describe, expect, it, vi } from "vitest";
import {
  readLessonDraft,
  saveLessonDraft,
  type LessonDraft,
} from "../src/lib/lessonDraft";

const owner = { id: "learner", applicationId: "gotit" };
const draft: LessonDraft = {
  topic: "Travel",
  grammarFocus: "Questions",
  level: "A1",
  courseTeachingLanguage: "support",
  preferences: {
    supportLanguageCode: "ar",
    lessonMode: "standard",
    teachingLanguage: "support",
    requestedDurationMinutes: 5,
    teacherVoice: "male",
    speechRate: "slow",
    focusAreas: ["speaking"],
    customFocus: null,
    correctionMode: "recast",
    vocabularyMode: "learned",
  },
};
describe("lesson preparation after independent warmup", () => {
  it("restores the chosen teacher, support language and topic in the same context", () => {
    saveLessonDraft(owner, "fr", null, draft);
    expect(readLessonDraft(owner, "fr", null)).toMatchObject(draft);
    expect(readLessonDraft(owner, "en", null)).toBeUndefined();
    expect(readLessonDraft(owner, "fr", "course")).toBeUndefined();
    expect(
      readLessonDraft({ ...owner, id: "another" }, "fr", null),
    ).toBeUndefined();
    expect(
      readLessonDraft({ ...owner, applicationId: "other" }, "fr", null),
    ).toBeUndefined();
  });
  it("ignores expired, future and invalid drafts", () => {
    const clock = vi.spyOn(Date, "now");
    clock.mockReturnValue(1_000_000);
    saveLessonDraft(owner, "fr", null, draft);
    clock.mockReturnValue(999_999);
    expect(readLessonDraft(owner, "fr", null)).toBeUndefined();
    clock.mockReturnValue(2_800_000);
    expect(readLessonDraft(owner, "fr", null)).toBeUndefined();
    const key = sessionStorage.key(0)!;
    sessionStorage.setItem(
      key,
      JSON.stringify({ ...draft, savedAt: Date.now(), level: "fluent" }),
    );
    expect(readLessonDraft(owner, "fr", null)).toBeUndefined();
    sessionStorage.setItem(key, "not-json");
    expect(readLessonDraft(owner, "fr", null)).toBeUndefined();
    clock.mockRestore();
  });
});
