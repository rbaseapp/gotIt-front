import type { AuthTokens, AuthUser, ProfilePatch } from "../types";
import i18n from "../i18n";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid API response");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value)
    throw new Error("Invalid API response");
  return value;
}
function integer(value: unknown, min = 0): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min)
    throw new Error("Invalid API response");
  return value;
}
export function parseUser(payload: unknown): AuthUser {
  const user = object(object(payload).user);
  const id = text(user.id);
  const applicationId = text(user.applicationId);
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    !uuid.test(id) ||
    !uuid.test(applicationId) ||
    typeof user.emailVerified !== "boolean"
  )
    throw new Error("Invalid API response");
  const status = text(user.status);
  if (status !== "active") throw new Error("Inactive user");
  return {
    id,
    applicationId,
    email: text(user.email),
    emailVerified: user.emailVerified,
    status,
  };
}
export function parseTokens(payload: unknown): AuthTokens {
  const value = object(payload);
  return {
    accessToken: text(value.accessToken),
    refreshToken: text(value.refreshToken),
    expiresIn: integer(value.expiresIn, 1),
  };
}
export function canonicalLanguage(value: string): string {
  return Intl.getCanonicalLocales(value.trim())[0] || "";
}
export function validateProfile(profile: ProfilePatch): string | null {
  try {
    if (
      profile.learningPreferences &&
      (!profile.learningPreferences.enabledSkills.length ||
        profile.learningPreferences.enabledSkills.length > 5 ||
        new Set(profile.learningPreferences.enabledSkills).size !==
          profile.learningPreferences.enabledSkills.length ||
        profile.learningPreferences.enabledSkills.some(
          (s) =>
            ![
              "recognition",
              "recall",
              "listening",
              "spelling",
              "pronunciation",
            ].includes(s),
        ))
    )
      return i18n.t("validation.skills");
    if (
      profile.defaultSourceLanguage !== null &&
      !canonicalLanguage(profile.defaultSourceLanguage)
    )
      return i18n.t("validation.sourceLanguage");
    if (
      profile.defaultTranslationLanguage !== null &&
      !canonicalLanguage(profile.defaultTranslationLanguage)
    )
      return i18n.t("validation.translationLanguage");
    new Intl.DateTimeFormat("en", { timeZone: profile.timezone }).format();
    if (
      !["items", "minutes", "attempts"].includes(profile.dailyGoal.type) ||
      !Number.isInteger(profile.dailyGoal.value) ||
      profile.dailyGoal.value < 1 ||
      profile.dailyGoal.value > 100000
    )
      return i18n.t("validation.dailyGoal");
    if (
      !Number.isInteger(profile.defaultNewItemsPerDay) ||
      profile.defaultNewItemsPerDay < 0 ||
      profile.defaultNewItemsPerDay > 10000
    )
      return i18n.t("validation.newWords");
    if (
      profile.translationMethodPreference !== null &&
      !["auto", "dictionary", "ai"].includes(
        profile.translationMethodPreference,
      )
    )
      return i18n.t("validation.translationMethod");
    if (profile.languages.length > 100 || profile.interests.length > 100)
      return i18n.t("validation.profileLimits");
    const codes = profile.languages.map((language) => {
      if (
        language.selfAssessedLevel !== null &&
        !["A1", "A2", "B1", "B2", "C1", "C2"].includes(
          language.selfAssessedLevel,
        )
      )
        throw new Error();
      return canonicalLanguage(language.languageCode).toLowerCase();
    });
    if (codes.some((code) => !code) || new Set(codes).size !== codes.length)
      return i18n.t("validation.languages");
    const interests = profile.interests.map((value) =>
      value.normalize("NFKC").replace(/\s+/gu, " ").trim().toLowerCase(),
    );
    if (
      interests.some((value) => !value || value.length > 100) ||
      new Set(interests).size !== interests.length
    )
      return i18n.t("validation.interests");
    return null;
  } catch {
    return i18n.t("validation.profileFields");
  }
}
export function parseProfile(payload: unknown): ProfilePatch {
  const value = object(object(payload).profile);
  const goal = object(value.dailyGoal);
  if (!Array.isArray(value.languages) || !Array.isArray(value.interests))
    throw new Error("Invalid API response");
  const profile = {
    ...(value.learningPreferences !== undefined
      ? { learningPreferences: object(value.learningPreferences) }
      : {}),
    defaultSourceLanguage:
      value.defaultSourceLanguage === undefined ||
      value.defaultSourceLanguage === null
        ? null
        : text(value.defaultSourceLanguage),
    defaultTranslationLanguage:
      value.defaultTranslationLanguage === null
        ? null
        : text(value.defaultTranslationLanguage),
    timezone: text(value.timezone),
    dailyGoal: { type: text(goal.type), value: integer(goal.value, 1) },
    defaultNewItemsPerDay: integer(value.defaultNewItemsPerDay),
    translationMethodPreference: value.translationMethodPreference,
    languages: value.languages.map((input) => {
      const language = object(input);
      const level = (field: string) =>
        language[field] === undefined || language[field] === null
          ? (language[field] as undefined | null)
          : text(language[field]);
      for (const field of ["systemEstimatedLevel", "effectiveLevel"])
        if (
          language[field] !== undefined &&
          language[field] !== null &&
          !["A1", "A2", "B1", "B2", "C1", "C2"].includes(
            String(language[field]),
          )
        )
          throw new Error("Invalid API response");
      if (
        language.lastEvaluatedAt !== undefined &&
        language.lastEvaluatedAt !== null &&
        Number.isNaN(Date.parse(text(language.lastEvaluatedAt)))
      )
        throw new Error("Invalid API response");
      const confidence = language.systemConfidence;
      if (
        confidence !== undefined &&
        confidence !== null &&
        (typeof confidence !== "number" || confidence < 0 || confidence > 1)
      )
        throw new Error("Invalid API response");
      return {
        languageCode: text(language.languageCode),
        selfAssessedLevel: language.selfAssessedLevel,
        ...(language.systemEstimatedLevel !== undefined
          ? { systemEstimatedLevel: level("systemEstimatedLevel") }
          : {}),
        ...(language.effectiveLevel !== undefined
          ? { effectiveLevel: level("effectiveLevel") }
          : {}),
        ...(confidence !== undefined
          ? { systemConfidence: confidence as number | null }
          : {}),
        ...(language.lastEvaluatedAt !== undefined
          ? {
              lastEvaluatedAt:
                language.lastEvaluatedAt === null
                  ? null
                  : text(language.lastEvaluatedAt),
            }
          : {}),
      };
    }),
    interests: value.interests.map(text),
  } as ProfilePatch;
  if (validateProfile(profile)) throw new Error("Invalid API response");
  return profile;
}
export function profilePayload(profile: ProfilePatch): ProfilePatch {
  return {
    ...(profile.learningPreferences
      ? {
          learningPreferences: {
            enabledSkills: [...profile.learningPreferences.enabledSkills],
          },
        }
      : {}),
    defaultSourceLanguage: profile.defaultSourceLanguage,
    defaultTranslationLanguage: profile.defaultTranslationLanguage,
    timezone: profile.timezone,
    dailyGoal: { ...profile.dailyGoal },
    defaultNewItemsPerDay: profile.defaultNewItemsPerDay,
    translationMethodPreference: profile.translationMethodPreference,
    languages: profile.languages.map(({ languageCode, selfAssessedLevel }) => ({
      languageCode: canonicalLanguage(languageCode),
      selfAssessedLevel,
    })),
    interests: profile.interests.map((value) =>
      value.normalize("NFKC").replace(/\s+/gu, " ").trim(),
    ),
  };
}
