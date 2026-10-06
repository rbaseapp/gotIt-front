import { expect, test } from "@playwright/test";
import { courseWithPlan } from "../course-fixtures";
import { figmaFixtures } from "./figma-fixtures";

const ownerKey =
  "gotit.selectedProgram.v1.22222222-2222-4222-8222-222222222222.11111111-1111-4111-8111-111111111111";
const packId = "d3000000-0000-4000-8000-000000000001";
const pack = {
  id: packId,
  slug: "daily-english-basic-01-en-he",
  title: "יחידה 1: Building Your First Sentences",
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
    known: 3,
    completed: 3,
    introduced: 3,
    due: 0,
  },
  teacherStations: [],
};

for (const width of [320, 860, 1440])
  for (const arabicFirst of [true, false])
    test(`program cards have equal widths and separate selection labels at ${width}px, Arabic first: ${arabicFirst}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await figmaFixtures(page, "he");
      const english = courseWithPlan(true);
      english.versions[0]!.plan.title =
        "אנגלית מהיסודות: שיחה, קריאה ודקדוק בהקשר";
      const arabic = courseWithPlan(true);
      arabic.id = "10000000-0000-4000-8000-000000000002";
      arabic.preferences.targetLanguageCode = "ar";
      arabic.versions[0]!.plan.title =
        "ערבית מדוברת פלסטינית לשיחות עם משפחה וחברים";
      await page.route("**/api/v1/courses", (route) =>
        route.fulfill({
          json: {
            courses: arabicFirst ? [arabic, english] : [english, arabic],
            homework: [],
            available: true,
          },
        }),
      );
      await page.route("**/api/v1/word-packs", (route) =>
        route.fulfill({ json: { packs: [pack] } }),
      );
      await page.goto("/courses");
      await expect(page.locator(".program-card")).toHaveCount(3);

      for (const selected of ["english-path", english.id, arabic.id]) {
        await page.evaluate(
          ({ ownerKey, selected }) => localStorage.setItem(ownerKey, selected),
          { ownerKey, selected },
        );
        await page.reload();
        await expect(page.locator(".program-card")).toHaveCount(3);
        await expect(page.locator(".program-selected")).toHaveCount(1);
        await page.evaluate(() => document.fonts.ready);

        const chosen = page.locator(".program-card:has(.program-selected)");
        const badge = await chosen.locator(".program-selected").boundingBox();
        const title = await chosen.locator("h3").boundingBox();
        expect(badge).not.toBeNull();
        expect(title).not.toBeNull();
        expect(badge!.y + badge!.height).toBeLessThanOrEqual(title!.y);

        const widths: number[] = [];
        for (const card of await page.locator(".program-card").all()) {
          const bounds = await card.boundingBox();
          widths.push(bounds!.width);
          const remove = card.locator(".program-delete");
          if (await remove.count()) {
            const deleteBox = await remove.boundingBox();
            const titleBox = await card.locator("h3").boundingBox();
            const openBox = await card.locator(".button").boundingBox();
            expect(deleteBox!.y + deleteBox!.height).toBeLessThanOrEqual(
              Math.min(titleBox!.y, openBox!.y),
            );
            expect(deleteBox!.width).toBeGreaterThanOrEqual(43.9);
          }
        }
        expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
        if (width > 860)
          for (const card of await page.locator(".program-card").all()) {
            const bounds = await card.boundingBox();
            expect(bounds!.width).toBeGreaterThan(bounds!.height * 2);
          }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        if (selected === "english-path" && arabicFirst)
          await page.screenshot({
            path: testInfo.outputPath(`program-cards-${width}.png`),
            fullPage: true,
            animations: "disabled",
          });
      }
      await page.locator(".program-delete").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await page.locator(".program-card.structured .button").click();
      await expect(page).toHaveURL(/\/english-learning$/);
    });
