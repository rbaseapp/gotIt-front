import { expect, test } from "@playwright/test";
import { figmaFixtures } from "./figma-fixtures";
import { courseWithPlan } from "../course-fixtures";
import he from "../../src/locales/he/translation.json" with { type: "json" };
const course = courseWithPlan(true);
const item = "11111111-1111-4111-8111-111111111111";
for (const width of [320, 390, 1487])
  test(`canonical account, course, scope and history flows at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width > 760 ? 1058 : 844 });
    await figmaFixtures(page, "he");
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/private-lesson-minutes"))
        return route.fulfill({
          json: {
            secondsTotal: 900,
            secondsRemaining: 720,
            secondsUsed: 180,
            expiresAt: null,
          },
        });
      if (path.endsWith(`/courses/${course.id}`))
        return route.fulfill({ json: { course } });
      if (path.endsWith("/private-lessons/setup"))
        return route.fulfill({
          json: {
            preferences: null,
            roadmap: null,
            interactionCapabilities: {
              guidedTasks: true,
              textAnswers: true,
              billingPause: false,
            },
            curriculum: {
              recommended: {
                goalKind: "grammar",
                goalKey: "foundation",
                reason: "fixture",
              },
              communicationGoals: [],
              grammarTopics: [],
            },
          },
        });
      if (path.endsWith("/words") && path.includes("/units/"))
        return route.fulfill({
          json: {
            title: "Words from my plan",
            unitKey: "foundation",
            targetLanguageCode: "en",
            supportLanguageCode: "ar",
            words: [
              {
                sourceText: "water",
                choices: [{ id: item, translationText: "ماء" }],
              },
              { sourceText: "coffee", choices: [] },
            ],
          },
        });
      return route.fallback();
    });
    const cases = [
      ["library", "/vocabulary", ".vocabulary-page"],
      ["account", "/account", ".account-page"],
      ["settings", "/settings", ".settings-page"],
      ["minutes", "/billing/minutes", ".minutes-page"],
      ["personal-map", `/courses/${course.id}`, ".personal-map"],
      [
        "personal-prep",
        `/private-lesson?course=${course.id}`,
        ".unit-lesson-prep",
      ],
      [
        "unit-words",
        `/courses/${course.id}/units/foundation/words`,
        ".course-unit-words",
      ],
      [
        "smart-ready",
        `/learn/smart?items=${item}&language=en`,
        ".ux-smart-ready",
      ],
      ["games", `/learn?items=${item}&language=en`, ".ux-game-hub"],
      ["history", "/history?language=fr&view=lessons", ".ux-history"],
      ["programs", "/courses", ".programs-page"],
    ] as const;
    for (const [name, url, selector] of cases) {
      await page.goto(url);
      await expect(page.locator(selector)).toBeVisible();
      await expect(page.locator(selector).locator("[role=status]")).toHaveCount(
        0,
      );
      if (name === "personal-map" && width === 1487) {
        const geometry = await page.evaluate(() => {
          const box = (s: string) =>
            document.querySelector(s)!.getBoundingClientRect();
          const main = box(".personal-map"),
            bubble = box(".personal-map-word-preview"),
            button = box(".course-plan-overview > .button");
          return {
            width: main.width,
            overlap:
              Math.min(bubble.right, button.right) -
              Math.max(bubble.left, button.left),
          };
        });
        expect(geometry.width).toBeGreaterThanOrEqual(1158);
        expect(geometry.overlap).toBeLessThanOrEqual(0);
      }
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        )
        .toBe(true);
      expect(await page.locator(selector).innerText()).not.toMatch(/\?{3}/);
      await page.screenshot({
        path: testInfo.outputPath(`${name}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      if (name === "unit-words") {
        await page.getByRole("checkbox", { name: "ماء" }).check();
        await expect(
          page.getByRole("link", {
            name: he.dashboard.smartPractice,
            exact: true,
          }),
        ).toHaveAttribute("href", new RegExp(`items=${item}.*language=en`));
        await page
          .locator(".unit-browser-row")
          .filter({ hasText: "coffee" })
          .getByRole("button")
          .first()
          .click();
        await page
          .getByRole("button", { name: he.capture.title, exact: true })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(
          page.getByRole("textbox", { name: he.capture.sourceText }),
        ).toHaveValue("coffee");
      }
      if (name === "library") {
        const sourceLanguage = await page
          .locator(".learning-language-select select")
          .inputValue();
        await page
          .getByRole("link", { name: he.ux.startSmart, exact: true })
          .click();
        await expect(page.locator(".ux-smart-ready")).toBeVisible();
        expect(new URL(page.url()).searchParams.get("language")).toBe(
          sourceLanguage,
        );
        await expect(
          page.getByRole("link", { name: he.smartUi.start, exact: true }),
        ).toHaveAttribute("href", new RegExp(`language=${sourceLanguage}`));
      }
      if (name === "personal-prep") {
        if (width < 861) {
          expect(
            (await page.locator(".unit-lesson-prep").boundingBox())?.width,
          ).toBe(width - 40);
          expect(
            (
              await page
                .locator(".unit-lesson-prep > .ux-card")
                .first()
                .boundingBox()
            )?.width,
          ).toBe(width - 40);
        }
        await page
          .getByRole("button", { name: he.ux.chooseTeacher, exact: true })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page
          .getByRole("button", {
            name: he.privateLesson.voiceOptions.male,
            exact: true,
          })
          .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await page
          .getByRole("button", { name: he.ux.warmup, exact: true })
          .click();
        await expect(page).toHaveURL(
          new RegExp(
            `/courses/${course.id}/units/${course.nextLesson!.unitKey}/words\\?return=`,
          ),
        );
        await expect(page.locator(".course-unit-words")).toBeVisible();
      }
      if (name === "smart-ready") {
        await page.getByRole("button", { name: he.smartUi.changePace }).click();
        await page
          .getByRole("button", { name: he.smartUi.reviewChoose })
          .click();
        await expect(
          page.getByRole("link", { name: he.smartUi.start, exact: true }),
        ).toHaveAttribute("href", /includeNew=0/);
      }
      if (name === "history")
        await expect(page.getByRole("combobox")).toHaveValue("fr");
    }
  });
