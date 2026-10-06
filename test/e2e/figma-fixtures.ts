import { type Page } from "@playwright/test";
import { seedProfile } from "../../src/data/seed";
import { courseWithPlan } from "../course-fixtures";

const itemId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const date = "2026-10-05T00:00:00.000Z";
const session = {
  id: sessionId,
  sessionType: "recall",
  status: "active",
  startedAt: date,
  endedAt: null,
  durationSeconds: null,
  itemCount: 1,
  attemptCount: 0,
  correctCount: 0,
  xpEarned: 0,
  algorithmVersion: "fixture",
};
const dashboard = {
  counts: {
    total: 1,
    new: 1,
    learning: 0,
    reviewing: 0,
    mastered: 0,
    due: 0,
    difficult: 0,
    highPriority: 0,
    awaitingRecall: 0,
  },
  skills: [],
  modes: [],
  recentActivity: [],
  recentActivityPagination: {
    page: 1,
    pageCount: 1,
    totalCount: 0,
    pageSize: 6,
  },
  dailyGoal: {
    type: "items",
    value: 5,
    current: 0,
    completed: false,
    date: "2026-10-05",
  },
  gamification: {
    totalXp: 10,
    level: 1,
    nextLevelXp: 100,
    todayXp: 0,
    dailyXpCap: 200,
    dailyXpRemaining: 200,
    dailyXpCapReached: false,
    postDailyCapPercent: 25,
    currentStreakDays: 1,
    longestStreakDays: 1,
    lastActivityDate: "2026-10-04",
  },
  weeklyActivity: { timezone: "Asia/Jerusalem", days: [] },
};
export async function figmaFixtures(page: Page, locale: string) {
  await page.addInitScript((locale) => {
    localStorage.removeItem("gotit.mode");
    localStorage.setItem("gotit.uiLocale.v1", locale);
    sessionStorage.setItem("gotit.refresh", "fixture-refresh");
  }, locale);
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    let payload: unknown;
    if (path.endsWith("/auth/refresh"))
      payload = {
        accessToken: "fixture-access",
        refreshToken: "fixture-refresh",
        expiresIn: 3600,
      };
    else if (path.endsWith("/auth/me"))
      payload = {
        user: {
          id: itemId,
          applicationId: sessionId,
          email: "learner@example.test",
          emailVerified: true,
          status: "active",
          role: "user",
        },
      };
    else if (path.endsWith("/profile"))
      payload = {
        profile: {
          ...seedProfile,
          defaultSourceLanguage: "he",
          defaultTranslationLanguage: "fr",
        },
      };
    else if (path.endsWith("/billing/status"))
      payload = {
        tier: "paid",
        access: true,
        plan: { key: "paid", name: "Paid", kind: "paid" },
        entitlements: ["practice.play"],
        subscription: null,
        trial: null,
      };
    else if (path.endsWith("/dashboard/languages"))
      payload = {
        languages: [
          { code: "he", count: 1 },
          { code: "fr", count: 1 },
        ],
      };
    else if (path.endsWith("/dashboard")) payload = dashboard;
    else if (path.endsWith("/courses"))
      payload = {
        courses: [courseWithPlan(true)],
        homework: [],
        available: true,
      };
    else if (path.endsWith("/word-packs")) payload = { packs: [] };
    else if (path.endsWith("/private-lessons")) payload = { lessons: [] };
    else if (path.endsWith("/learning-items"))
      payload = { items: [], nextCursor: null };
    else if (path.endsWith("/capabilities"))
      payload = {
        configured: {
          library: true,
          practice: true,
          dashboard: true,
          readingGeneration: true,
          speech: false,
        },
        learningLanguages: [
          {
            languageCode: "he",
            enabledSkills: ["recognition", "recall", "spelling"],
          },
        ],
      };
    else if (path.endsWith("/learning/queue"))
      payload = {
        items: [
          {
            id: itemId,
            sourceText: "בית",
            sourceLanguageCode: "he",
            translationLanguageCode: "fr",
            primaryTranslation: "maison",
            learningStatus: "new",
            nextReviewAt: null,
            queueScore: 1,
          },
        ],
        algorithmVersion: "fixture",
      };
    else if (path.endsWith("/practice/sessions"))
      payload =
        method === "POST" ? { session } : { items: [], nextCursor: null };
    else if (path.endsWith("/exercises"))
      payload = {
        exercises: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            learningItemId: itemId,
            exerciseType: "recall",
            kind: "typed",
            direction: "translation_to_source",
            prompt: {
              text: "maison",
              languageCode: "fr",
              context: null,
              letterCount: 3,
              wordLengths: [3],
            },
            expiresAt: "2030-10-01T00:00:00.000Z",
          },
        ],
        algorithmVersion: "fixture",
      };
    else if (path.endsWith("/study"))
      payload = {
        cards: [
          {
            learningItemId: itemId,
            sourceText: "בית",
            translationText: "maison",
            sourceLanguageCode: "he",
            translationLanguageCode: "fr",
            context: null,
            audioUrl: null,
          },
        ],
      };
    else if (path.endsWith("/practice/attempts"))
      payload = {
        attempt: {
          id: itemId,
          learningItemId: itemId,
          sessionId,
          sequence: 1,
          result: "correct",
          score: 100,
          expectedAnswer: "בית",
          xpEarned: 5,
        },
        progress: {
          status: "learning",
          stage: 0,
          masteryScore: 10,
          masterySource: "system",
          nextReviewAt: date,
        },
        skills: [],
        algorithmVersion: "fixture",
        replayed: false,
      };
    else if (path.endsWith(`/${sessionId}`))
      payload = {
        session: {
          ...session,
          status: "completed",
          endedAt: date,
          durationSeconds: 10,
          attemptCount: 1,
          correctCount: 1,
          xpEarned: 5,
        },
      };
    if (payload) await route.fulfill({ json: payload });
    else
      await route.fulfill({
        status: 404,
        json: { error: { code: "TEST_UNHANDLED_ROUTE" } },
      });
  });
}
