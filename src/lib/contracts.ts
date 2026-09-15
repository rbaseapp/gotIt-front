import type { AuthTokens, AuthUser, ProfilePatch } from '../types';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid API response');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('Invalid API response');
  return value;
}
function integer(value: unknown, min = 0): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) throw new Error('Invalid API response');
  return value;
}
export function parseUser(payload: unknown): AuthUser {
  const user = object(object(payload).user);
  const id = text(user.id); const applicationId = text(user.applicationId);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(id) || !uuid.test(applicationId) || typeof user.emailVerified !== 'boolean') throw new Error('Invalid API response');
  const status = text(user.status);
  if (status !== 'active') throw new Error('Inactive user');
  return { id, applicationId, email: text(user.email), emailVerified: user.emailVerified, status };
}
export function parseTokens(payload: unknown): AuthTokens {
  const value = object(payload);
  return { accessToken: text(value.accessToken), refreshToken: text(value.refreshToken), expiresIn: integer(value.expiresIn, 1) };
}
export function canonicalLanguage(value: string): string {
  return Intl.getCanonicalLocales(value.trim())[0] || '';
}
export function validateProfile(profile: ProfilePatch): string | null {
  try {
    if (profile.defaultTranslationLanguage !== null && !canonicalLanguage(profile.defaultTranslationLanguage)) return 'יש לבחור קוד שפה תקין';
    new Intl.DateTimeFormat('en', { timeZone: profile.timezone }).format();
    if (!['items', 'minutes', 'attempts'].includes(profile.dailyGoal.type) || !Number.isInteger(profile.dailyGoal.value) || profile.dailyGoal.value < 1 || profile.dailyGoal.value > 100000) return 'היעד היומי חייב להיות מספר שלם בין 1 ל־100,000';
    if (!Number.isInteger(profile.defaultNewItemsPerDay) || profile.defaultNewItemsPerDay < 0 || profile.defaultNewItemsPerDay > 10000) return 'מספר המילים החדשות חייב להיות בין 0 ל־10,000';
    if (profile.translationMethodPreference !== null && !['auto', 'dictionary', 'ai'].includes(profile.translationMethodPreference)) return 'שיטת התרגום אינה תקינה';
    if (profile.languages.length > 100 || profile.interests.length > 100) return 'ניתן לשמור עד 100 שפות ותחומי עניין';
    const codes = profile.languages.map(language => {
      if (language.selfAssessedLevel !== null && !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(language.selfAssessedLevel)) throw new Error();
      return canonicalLanguage(language.languageCode).toLowerCase();
    });
    if (codes.some(code => !code) || new Set(codes).size !== codes.length) return 'שפות חייבות להיות תקינות וללא כפילויות';
    const interests = profile.interests.map(value => value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase());
    if (interests.some(value => !value || value.length > 100) || new Set(interests).size !== interests.length) return 'תחומי עניין חייבים להיות ייחודיים ובאורך 1–100 תווים';
    return null;
  } catch { return 'קוד שפה, רמה או אזור זמן אינם תקינים'; }
}
export function parseProfile(payload: unknown): ProfilePatch {
  const value = object(object(payload).profile); const goal = object(value.dailyGoal);
  if (!Array.isArray(value.languages) || !Array.isArray(value.interests)) throw new Error('Invalid API response');
  const profile = {
    defaultTranslationLanguage: value.defaultTranslationLanguage === null ? null : text(value.defaultTranslationLanguage),
    timezone: text(value.timezone),
    dailyGoal: { type: text(goal.type), value: integer(goal.value, 1) },
    defaultNewItemsPerDay: integer(value.defaultNewItemsPerDay),
    translationMethodPreference: value.translationMethodPreference,
    languages: value.languages.map(input => { const language = object(input); return { languageCode: text(language.languageCode), selfAssessedLevel: language.selfAssessedLevel }; }),
    interests: value.interests.map(text),
  } as ProfilePatch;
  if (validateProfile(profile)) throw new Error('Invalid API response');
  return profile;
}
export function profilePayload(profile: ProfilePatch): ProfilePatch {
  return {
    defaultTranslationLanguage: profile.defaultTranslationLanguage,
    timezone: profile.timezone,
    dailyGoal: { ...profile.dailyGoal },
    defaultNewItemsPerDay: profile.defaultNewItemsPerDay,
    translationMethodPreference: profile.translationMethodPreference,
    languages: profile.languages.map(({ languageCode, selfAssessedLevel }) => ({ languageCode: canonicalLanguage(languageCode), selfAssessedLevel })),
    interests: profile.interests.map(value => value.normalize('NFKC').replace(/\s+/gu, ' ').trim()),
  };
}
