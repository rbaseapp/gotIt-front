import { describe, expect, it } from "vitest";
import {
  canonicalLanguage,
  parseProfile,
  parseTokens,
  parseUser,
  profilePayload,
  validateProfile,
} from "../src/lib/contracts";
import { seedProfile } from "../src/data/seed";

describe("documented Core and Profile contracts", () => {
  it("accepts only a valid active scoped identity", () => {
    const user = {
      id: "11111111-1111-4111-8111-111111111111",
      applicationId: "22222222-2222-4222-8222-222222222222",
      email: "test@example.com",
      emailVerified: false,
      status: "active",
    };
    expect(parseUser({ user })).toEqual(user);
    expect(() =>
      parseUser({ user: { ...user, status: "disabled" } }),
    ).toThrow();
    expect(() =>
      parseUser({ user: { ...user, applicationId: "gotit" } }),
    ).toThrow();
  });
  it("requires both tokens and a positive expiry", () => {
    expect(
      parseTokens({ accessToken: "a", refreshToken: "r", expiresIn: 900 })
        .expiresIn,
    ).toBe(900);
    for (const expiresIn of [0, -1, "900", 1.2])
      expect(() =>
        parseTokens({ accessToken: "a", refreshToken: "r", expiresIn }),
      ).toThrow();
  });
  it("allowlists PATCH fields, excluding identity and system estimates", () => {
    const input = {
      ...seedProfile,
      languages: [
        {
          languageCode: "EN-us",
          selfAssessedLevel: "C2" as const,
          systemEstimatedLevel: "A1",
        },
      ],
      interests: ["  Space   science  "],
    };
    const result = profilePayload(input);
    expect(result).not.toHaveProperty("name");
    expect(result).not.toHaveProperty("email");
    expect(result.languages).toEqual([
      { languageCode: "en-US", selfAssessedLevel: "C2" },
    ]);
    expect(result.interests).toEqual(["Space science"]);
  });
  it("enforces all six CEFR levels and supported boundary values", () => {
    for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"] as const)
      expect(
        validateProfile({
          ...seedProfile,
          languages: [{ languageCode: "fr", selfAssessedLevel: level }],
        }),
      ).toBeNull();
    expect(
      validateProfile({
        ...seedProfile,
        dailyGoal: { type: "attempts", value: 100000 },
        defaultNewItemsPerDay: 0,
      }),
    ).toBeNull();
    expect(
      validateProfile({
        ...seedProfile,
        dailyGoal: { type: "minutes", value: 0 },
      }),
    ).not.toBeNull();
    expect(
      validateProfile({ ...seedProfile, timezone: "Unknown/Place" }),
    ).not.toBeNull();
    expect(
      validateProfile({ ...seedProfile, interests: [" Space ", "space"] }),
    ).not.toBeNull();
    expect(
      validateProfile({
        ...seedProfile,
        languages: [
          { languageCode: "en", selfAssessedLevel: null },
          { languageCode: "EN", selfAssessedLevel: null },
        ],
      }),
    ).not.toBeNull();
    expect(canonicalLanguage("pt-br")).toBe("pt-BR");
  });
  it("validates the profile response envelope and does not inject defaults", () => {
    expect(parseProfile({ profile: seedProfile }).dailyGoal).toEqual(
      seedProfile.dailyGoal,
    );
    expect(() => parseProfile({ profile: {} })).toThrow();
    expect(() => parseProfile(seedProfile)).toThrow();
  });
});
