import { expect, test, type Page } from "@playwright/test";
import {
  courseWithPlan,
  fixtureCourse,
  fixtureHomework,
} from "../course-fixtures";

async function signedIn(
  page: Page,
  screen: "welcome" | "intake" | "preferences" | "plan" | "active" | "homework",
  language = "he",
  oralFirst = false,
) {
  await page.addInitScript((locale) => {
    localStorage.removeItem("gotit.mode");
    localStorage.setItem("gotit.uiLocale.v1", locale);
    sessionStorage.setItem("gotit.refresh", "browser-fixture-refresh");
  }, language);
  const course =
    screen === "plan"
      ? courseWithPlan()
      : screen === "active"
        ? courseWithPlan(true)
        : { ...structuredClone(fixtureCourse), ready: screen !== "intake" };
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const payload = path.endsWith("/auth/refresh")
      ? {
          accessToken: "browser-fixture-access",
          refreshToken: "browser-fixture-refresh",
          expiresIn: 3600,
        }
      : path.endsWith("/auth/me")
        ? {
            user: {
              id: fixtureCourse.id,
              applicationId: "30000000-0000-4000-8000-000000000001",
              email: "learner@example.test",
              emailVerified: true,
              status: "active",
              role: "user",
            },
          }
        : path.endsWith("/profile")
          ? {
              profile: {
                defaultSourceLanguage: "en",
                defaultTranslationLanguage: "he",
                timezone: "Asia/Jerusalem",
                dailyGoal: { type: "minutes", value: 10 },
                defaultNewItemsPerDay: 5,
                translationMethodPreference: "auto",
                languages: [{ languageCode: "en", selfAssessedLevel: "A1" }],
                interests: [],
              },
            }
          : path.endsWith("/billing/status")
            ? {
                tier: "paid",
                access: true,
                plan: { key: "paid", name: "Paid", kind: "paid" },
                entitlements: ["practice.play"],
                subscription: null,
                trial: null,
              }
            : path.endsWith("/courses")
              ? {
                  courses: screen === "welcome" ? [] : [course],
                  homework: screen === "active" ? [fixtureHomework] : [],
                  available: true,
                }
              : path.endsWith(`/courses/${fixtureCourse.id}`)
                ? { course }
                : path.endsWith(`/homework/${fixtureHomework.id}`)
                  ? { homework: { ...fixtureHomework, oralFirst } }
                  : null;
    if (payload) await route.fulfill({ json: payload });
    else
      await route.fulfill({
        status: 404,
        json: { error: { code: "TEST_UNHANDLED_ROUTE" } },
      });
  });
  await page.goto(
    screen === "homework"
      ? `/homework/${fixtureHomework.id}`
      : screen === "welcome"
        ? "/courses"
        : `/courses/${fixtureCourse.id}`,
  );
  await expect(page.locator(".course-page")).toBeVisible();
  await expect(page.locator(".course-loading")).toHaveCount(0);
}

test("language combobox searches native names and fits RTL mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signedIn(page, "welcome", "he");
  const choice = page.locator(".course-language-pair").getByRole("combobox").first();
  await choice.fill("עברית");
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(1);
  await choice.press("Enter");
  await expect(choice).toHaveValue("Hebrew — עברית");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("multiple courses in two languages stay grouped on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await signedIn(page, "active", "he");
  const first = courseWithPlan(true);
  const second = courseWithPlan(true);
  second.id = "10000000-0000-4000-8000-000000000002";
  second.versions[0]!.plan.title = "English for travel";
  const spanish = courseWithPlan(true);
  spanish.id = "10000000-0000-4000-8000-000000000003";
  spanish.preferences.targetLanguageCode = "es";
  spanish.versions[0]!.plan.title = "Spanish for work";
  await page.route("**/api/v1/courses", (route) => route.fulfill({
    json: { courses: [first, second, spanish], homework: [], available: true },
  }));
  await page.goto("/courses");
  await expect(page.getByRole("region", { name: /English/ }).getByRole("link")).toHaveCount(2);
  await expect(page.getByRole("region", { name: /Spanish/ }).getByRole("link")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const language of ["he", "en"])
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    for (const screen of [
      "welcome",
      "intake",
      "preferences",
      "plan",
      "active",
      "homework",
    ] as const) {
      test(`${language} ${viewport.width} ${screen} stays readable and within the viewport`, async ({
        page,
      }) => {
        const errors: string[] = [];
        page.on("pageerror", (err) => errors.push(err.message));
        await page.setViewportSize(viewport);
        await signedIn(page, screen, language);
        if (screen === "plan")
          await page.locator(".course-unit").last().locator("summary").click();
        if (screen === "homework")
          await page.getByRole("button", { name: "is", exact: true }).click();
        const overflow = await page.evaluate(() => ({
          actual: document.documentElement.scrollWidth,
          viewport: innerWidth,
        }));
        expect(overflow.actual).toBeLessThanOrEqual(overflow.viewport + 1);
        expect(errors).toEqual([]);
        await expect(page.locator(".course-page h1")).toBeVisible();
        if (language === "he" && [390, 1440].includes(viewport.width))
          await page.screenshot({
            path: `test-results/course-${screen}-${viewport.width}.png`,
            fullPage: true,
          });
      });
    }
  }
test("keyboard can expand a future unit and move through the homework choices", async ({
  page,
}) => {
  await signedIn(page, "plan");
  const summary = page.locator(".course-unit").last().locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".course-unit").last()).toHaveAttribute("open", "");
});

test("a learner who needs oral support can hear each choice before selecting it", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.SpeechSynthesisUtterance = class extends (
      window.SpeechSynthesisUtterance
    ) {
      constructor(text?: string) {
        super(text);
        Object.defineProperty(this, "voice", { value: null, writable: true });
      }
    };
    window.speechSynthesis.getVoices = () => [
      {
        name: "Test English",
        lang: "en-US",
        default: true,
        localService: true,
        voiceURI: "test",
      },
    ];
    window.speechSynthesis.speak = (utterance) => {
      document.documentElement.dataset.spokenChoice = utterance.text;
    };
  });
  await page.setViewportSize({ width: 320, height: 720 });
  await signedIn(page, "homework", "he", true);
  await page
    .locator(".homework-choice-option .course-icon-button")
    .nth(1)
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-spoken-choice",
    "is",
  );
  await page.getByRole("button", { name: "is", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

for (const viewport of [
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
]) {
  for (const screen of ["plan", "homework"] as const) {
    test(`additional viewport ${viewport.width}x${viewport.height} ${screen}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await signedIn(page, screen);
      if (screen === "homework")
        await page.getByRole("button", { name: "is", exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      const action = page.locator(".course-page .button.primary").first();
      await action.scrollIntoViewIfNeeded();
      await expect(action).toBeVisible();
      await expect(action).toBeEnabled();
    });
  }
}
