import { describe, expect, it } from "vitest";
import {
  practiceDesignEnabled,
  recentPracticeLink,
} from "../src/lib/practiceDesign";

describe("practice design rollout", () => {
  it("is on everywhere unless the build turns it off", () => {
    expect(practiceDesignEnabled("")).toBe(true);
    expect(practiceDesignEnabled("true")).toBe(true);
    expect(practiceDesignEnabled("false")).toBe(false);
  });
  it("resumes the actual active session with its language and pack", () => {
    const link = recentPracticeLink(
      {
        id: "session",
        sessionType: "smart_review",
        status: "active",
        scope: { type: "pack", id: "pack" },
      },
      "ar",
      "/learn?language=ar",
    );
    expect(link).toContain("/learn/session/smart?");
    const params = new URL(link, "http://localhost").searchParams;
    expect(Object.fromEntries(params)).toEqual({
      language: "ar",
      return: "/learn?language=ar",
      resume: "session",
      pack: "pack",
    });
  });
  it("opens history for completed sessions instead of replaying a consumed session", () => {
    expect(
      recentPracticeLink(
        { id: "session", sessionType: "recall", status: "completed" },
        "en",
        "/learn",
      ),
    ).toBe("/history?language=en");
  });
});
