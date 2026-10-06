import { test, expect, type Page } from "@playwright/test";
import { figmaFixtures } from "./figma-fixtures";
import he from "../../src/locales/he/translation.json" with { type: "json" };
const packId = "d3000000-0000-4000-8000-000000000001";
async function pathFixture(page: Page, introduced = 0) {
  await figmaFixtures(page, "he");
  const pack = {
    id: packId,
    slug: "daily-english-basic-01-en-he",
    title: "יחידה 1 · מילים ראשונות",
    description: "",
    moduleNumber: 1,
    version: 1,
    wordCount: 50,
    installed: false,
    installedVersion: null,
    topic: {
      id: packId,
      slug: "english-learning-path-en-he",
      title: "English",
    },
    track: {
      id: packId,
      slug: "basic",
      title: "Basic",
      levelCode: "beginner",
      cefrFrom: "A1",
      cefrTo: "A2",
      sourceLanguageCode: "en",
      translationLanguageCode: "he",
    },
    progress: {
      linked: 0,
      new: 0,
      learning: 0,
      reviewing: 0,
      mastered: 0,
      known: introduced,
      completed: introduced,
      introduced,
      due: 0,
    },
    teacherStations: [
      {
        station: "supported",
        requiredWords: 10,
        durationMinutes: 5,
        available: introduced >= 10,
      },
      {
        station: "midpoint",
        requiredWords: 25,
        durationMinutes: 5,
        available: introduced >= 25,
      },
      {
        station: "review",
        requiredWords: 50,
        durationMinutes: 10,
        available: introduced >= 50,
      },
    ],
  };
  const entries = [
    "water",
    "coffee",
    "please",
    "want",
    "need",
    "help",
    ...Array.from({ length: 44 }, (_, i) => `word ${i + 7}`),
  ].map((sourceText, i) => ({
    id: `11111111-1111-4111-8111-${String(i + 1).padStart(12, "0")}`,
    sourceText,
    translationText:
      ["מים", "קפה", "בבקשה", "רוצה", "צריך", "עזרה"][i] ?? "מילה",
    itemType: "word",
    partOfSpeech: null,
    exampleText: i === 0 ? "Water, please." : null,
    learningItemId: null,
    excludedAt: null,
    known: false,
  }));
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/word-packs"))
      return route.fulfill({ json: { packs: [pack] } });
    if (path.endsWith(`/word-packs/${packId}`))
      return route.fulfill({ json: { pack, entries } });
    if (path.includes("/entries/") && path.endsWith("/image"))
      return route.fulfill({ json: { image: null } });
    if (path.endsWith("/practice/sessions"))
      return route.fulfill({
        json: { items: [], nextCursor: null, totalCount: 0 },
      });
    return route.fallback();
  });
}
for (const width of [320, 390, 768, 1487])
  test(`program map, full-page words, levels and activity at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1058 });
    await pathFixture(page);
    await page.goto("/courses");
    await page
      .getByRole("button", { name: he.ux.openMap, exact: true })
      .click();
    await expect(page.locator(".unit-roadmap-card")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".unit-word-station")).toContainText(
      he.pathUi.firstWords,
    );
    await expect(
      page.locator('.unit-roadmap-card a[href*="/private-lesson"]'),
    ).toHaveCount(0);
    await expect(page.locator(".path-stations > li")).toHaveCount(3);
    await page.screenshot({
      path: info.outputPath(`map-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: he.structuredUi.words, exact: true })
      .first()
      .click();
    await expect(page.locator(".unit-browser-list")).toBeVisible();
    await page
      .locator(".unit-browser-row")
      .nth(1)
      .locator("button")
      .first()
      .click();
    await expect(page.locator(".unit-word-detail h2")).toHaveText("coffee");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`words-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: he.structuredUi.map, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".unit-browser-list")).toHaveCount(0);
    await page
      .getByRole("button", { name: he.structuredUi.allUnits, exact: true })
      .click();
    await expect(page.locator(".path-level-tabs")).toBeVisible();
    await page.getByPlaceholder(he.pathUi.searchUnits).fill("אין יחידה");
    await expect(page.locator(".path-unit-row")).toHaveCount(0);
    await page.getByPlaceholder(he.pathUi.searchUnits).fill("");
    await page.screenshot({
      path: info.outputPath(`levels-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.locator(".path-unit-row").first().click();
    await page
      .getByRole("button", { name: he.structuredUi.activities, exact: true })
      .click();
    await expect(page.locator(".unit-activity-browser")).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`activities-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
  });
test("server midpoint availability selects the correct five-minute station", async ({
  page,
}) => {
  await pathFixture(page, 25);
  await page.goto("/english-learning");
  await expect(page.locator(".unit-teacher-station h3")).toHaveText(
    he.pathUi.midpoint,
  );
  await expect(page.locator(".unit-teacher-station > a")).toHaveAttribute(
    "href",
    /station=midpoint/,
  );
  await expect(page.locator(".path-stations").getByRole("link")).toHaveCount(2);
});
test("activity selection shows actual results and preserves resume scope", async ({
  page,
}, info) => {
  await pathFixture(page, 10);
  const base = {
    sessionType: "recall",
    status: "completed",
    startedAt: "2026-10-06T10:00:00.000Z",
    endedAt: "2026-10-06T10:05:00.000Z",
    durationSeconds: 300,
    itemCount: 5,
    attemptCount: 5,
    correctCount: 4,
    xpEarned: 32,
    algorithmVersion: "fixture",
  };
  await page.route("**/practice/sessions?**", (route) =>
    route.fulfill({
      json: {
        items: [
          { ...base, id: "22222222-2222-4222-8222-222222222222" },
          {
            ...base,
            id: "33333333-3333-4333-8333-333333333333",
            status: "active",
            startedAt: "2026-10-06T11:00:00.000Z",
            endedAt: null,
            attemptCount: 1,
            correctCount: 1,
            xpEarned: 8,
          },
        ],
        nextCursor: null,
        totalCount: 2,
      },
    }),
  );
  await page.goto(`/english-learning?unit=${packId}&tab=activities`);
  await expect(page.locator(".unit-activity-row")).toHaveCount(2);
  await expect(
    page.locator(".unit-activity-detail .button.primary"),
  ).toHaveAttribute("href", /resume=33333333.*pack=d3000000.*language=en/);
  await page.locator(".unit-activity-row").nth(1).click();
  await expect(page.locator(".unit-activity-detail")).toContainText("32");
  await expect(
    page.locator(".unit-activity-detail .button.primary"),
  ).toHaveAttribute("href", /\/learn\/smart\?pack=/);
  await page.screenshot({
    path: info.outputPath("populated-activities.png"),
    fullPage: true,
  });
});
test("new program preserves chosen languages and only offers a published prepared path", async ({
  page,
}) => {
  await pathFixture(page);
  await page.goto("/courses?choose=1");
  await expect(page.locator(".new-program-page")).toBeVisible();
  await expect(
    page.getByRole("button", { name: he.pathUi.openFromZero }),
  ).toBeEnabled();
  const target = page.getByRole("combobox").first();
  await target.fill("Spanish");
  await target.press("Enter");
  await expect(
    page.getByRole("button", { name: he.pathUi.openFromZero }),
  ).toBeDisabled();
  await page
    .locator(".new-program-page")
    .getByRole("link", { name: he.ux.personalProgram, exact: true })
    .click();
  await expect(page).toHaveURL(/new=1&language=es&support=he/);
  await expect(
    page.locator(".course-language-pair").getByRole("combobox").first(),
  ).toHaveValue(/Spanish.*espa\u00f1ol/u);
});
