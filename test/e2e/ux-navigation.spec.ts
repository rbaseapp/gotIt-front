import { expect, test, type Page } from "@playwright/test";
import { seedProfile } from "../../src/data/seed";
import he from "../../src/locales/he/translation.json" with { type: "json" };
import en from "../../src/locales/en/translation.json" with { type: "json" };
import ar from "../../src/locales/ar/translation.json" with { type: "json" };
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
async function fixtures(page: Page, locale: string) {
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
async function withinViewport(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
test("Figma words dashboard keeps its illustration and desktop hierarchy", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1487, height: 1058 });
  await fixtures(page, "he");
  await page.goto("/dashboard");
  await expect(page.locator(".ux-home-next h2")).toHaveText(
    he.ux.wordsYourPace,
  );
  await expect(
    page.locator(".ux-home-next .ux-primary-word-illustration"),
  ).toBeVisible();
  await expect(page.locator(".ux-home-next h2")).toHaveCSS("font-size", "32px");
  await withinViewport(page);
  await page.screenshot({
    path: testInfo.outputPath("figma-words-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
});
for (const width of [390, 1487])
  test(`an explicitly chosen program appears even before words exist in its language at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width > 860 ? 1058 : 844 });
    await fixtures(page, "he");
    await page.addInitScript(
      ({ ownerKey, courseId }) => {
        if (!localStorage.getItem(ownerKey)) {
          localStorage.setItem(ownerKey, courseId);
          localStorage.setItem(ownerKey + ".en", courseId);
          localStorage.setItem(ownerKey + ".language", "en");
        }
      },
      {
        ownerKey: `gotit.selectedProgram.v1.${sessionId}.${itemId}`,
        courseId: courseWithPlan(true).id,
      },
    );
    await page.goto("/dashboard");
    await expect(page.locator(".ux-home")).toHaveClass(/with-program/);
    await expect(page.locator(".ux-home-next h2")).toHaveText(
      he.ux.teacherMeeting,
    );
    if (width > 860) {
      const art = await page.locator(".ux-home-illustration").boundingBox();
      const copy = await page.locator(".ux-home-next-copy").boundingBox();
      expect((art?.x ?? 0) + (art?.width ?? 0)).toBeLessThanOrEqual(
        copy?.x ?? 0,
      );
      await expect(page.locator(".ux-home-illustration img")).toBeVisible();
    }
    await withinViewport(page);
    await page.screenshot({
      path: testInfo.outputPath(`figma-program-home-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    const languages = page.locator(".ux-home-heading select");
    await expect(languages).toHaveValue("en");
    await languages.selectOption("fr");
    await expect(page.locator(".ux-home")).toHaveClass(/words-home/);
    await expect(languages).toHaveValue("fr");
    await page.reload();
    await expect(languages).toHaveValue("fr");
    await expect(page.locator(".ux-home")).toHaveClass(/words-home/);
  });
for (const [locale, text] of [
  ["he", he],
  ["en", en],
  ["ar", ar],
] as const)
  for (const width of [320, 390, 1440]) {
    test(`${locale} ${width} live UX keeps context from home through letter writing`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1000 : 844,
      });
      await fixtures(page, locale);
      await page.goto("/dashboard");
      await expect(page.locator(".ux-home-next h2")).toHaveText(
        text.ux.wordsYourPace,
      );
      await expect(page.locator(".dashboard-more")).not.toHaveAttribute("open");
      await withinViewport(page);
      if (width < 860) {
        await expect(page.locator(".mobile-brand")).toBeVisible();
        await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
        await page.getByRole("button", { name: text.shell.openMenu }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.locator(".mobile-menu")).toBeFocused();
        await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
        await expect(page.locator(".mobile-tabs a")).toHaveCount(4);
      }
      await page
        .locator(".ux-home-next")
        .getByRole("link", { name: text.ux.chooseGame })
        .click();
      await expect(page.locator(".ux-game-grid")).toBeVisible();
      await page.getByRole("button", { name: text.ux.changeWords }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await withinViewport(page);
      await page.keyboard.press("Escape");
      const spelling = page.getByRole("link", {
        name: new RegExp(text.ux.spelling),
      });
      await expect(spelling).toHaveAttribute(
        "href",
        /return=%2Fdashboard.*input=letters|input=letters.*return=%2Fdashboard/,
      );
      await spelling.click();
      await page.locator(".launch-button").click();
      const keys = page.getByRole("group", { name: text.ux.letterKeyboard });
      for (const letter of ["ב", "י", "ת"])
        await keys.getByRole("button", { name: letter, exact: true }).click();
      await expect(page.getByLabel(text.game.yourAnswer)).toHaveValue("בית");
      await expect(page.locator(".letter-answer")).toHaveAttribute(
        "lang",
        "he",
      );
      await expect(page.locator(".letter-answer")).toHaveAttribute(
        "dir",
        "rtl",
      );
      await withinViewport(page);
      if (locale === "he")
        await page.screenshot({
          path: testInfo.outputPath(`letters-${width}.png`),
          fullPage: true,
        });
      await page.getByRole("button", { name: text.game.checkAnswer }).click();
      await expect(page.locator(".live-feedback")).toBeVisible();
      await page.locator(".feedback-next-action").click();
      await expect(page.locator(".session-results")).toBeVisible();
      await page.locator(".finish-actions a").click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await page.goto("/courses");
      await expect(page.locator(".program-card")).toHaveCount(1);
      if (width === 1440) {
        const card = await page.locator(".program-card").boundingBox();
        const grid = await page.locator(".program-grid").boundingBox();
        expect(card?.width).toBeCloseTo(grid?.width ?? 0, 0);
      }
      await page.getByRole("button", { name: text.ux.newProgram }).click();
      await expect(
        page
          .locator(".new-program-page")
          .getByRole("link", { name: new RegExp(text.ux.wordsOnly) }),
      ).toBeVisible();
      await withinViewport(page);
      await page.goto("/courses");
      if (locale === "he")
        await page.screenshot({
          path: testInfo.outputPath(`programs-${width}.png`),
          fullPage: true,
        });
      await page.goto("/achievements?return=%2Fdashboard");
      await expect(page.locator(".achievement-overview")).toContainText("10");
      await withinViewport(page);
    });
  }
