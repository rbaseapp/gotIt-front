import { test, expect, type Page } from "@playwright/test";
import { figmaFixtures } from "./figma-fixtures";
import he from "../../src/locales/he/translation.json" with { type: "json" };
import { seedProfile } from "../../src/data/seed";
const itemId = "11111111-1111-4111-8111-111111111111";
const largeProfile = {
  ...seedProfile,
  learningPreferences: {
    enabledSkills: [
      "recognition",
      "recall",
      "listening",
      "spelling",
      "pronunciation",
    ],
    uiLocale: "he",
    textScale: "large",
  },
};
async function game(
  page: Page,
  kind: "typed" | "provider" | "self_rating",
  letters = false,
) {
  await figmaFixtures(page, "he");
  await page.addInitScript(() => {
    (window as unknown as { audioPlays: number }).audioPlays = 0;
    HTMLMediaElement.prototype.play = async function () {
      (window as unknown as { audioPlays: number }).audioPlays++;
    };
    HTMLMediaElement.prototype.pause = () => {};
    document.documentElement.style.setProperty("--text-scale", "1.2");
  });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile"))
      return route.fulfill({ json: { profile: largeProfile } });
    if (path.endsWith("/exercises"))
      return route.fulfill({
        json: {
          exercises: [
            {
              id: "33333333-3333-4333-8333-333333333333",
              learningItemId: itemId,
              exerciseType:
                kind === "provider"
                  ? "pronunciation"
                  : kind === "self_rating"
                    ? "flashcards"
                    : "recall",
              kind,
              direction:
                kind === "typed"
                  ? "translation_to_source"
                  : "source_to_translation",
              prompt: {
                text: kind === "typed" ? "גלידה" : "ice cream",
                languageCode: kind === "typed" ? "he" : "en",
                context: null,
                letterCount: 9,
                wordLengths: [3, 5],
                ...(kind === "provider"
                  ? { audioUrl: `/api/v1/learning-items/${itemId}/audio` }
                  : {}),
                ...(kind === "self_rating" ? { answer: "גלידה" } : {}),
              },
              expiresAt: "2030-01-01T00:00:00.000Z",
            },
          ],
          algorithmVersion: "fixture",
        },
      });
    if (path.endsWith("/study"))
      return route.fulfill({
        json: {
          cards: [
            {
              learningItemId: itemId,
              sourceText: "ice cream",
              translationText: "גלידה",
              sourceLanguageCode: "en",
              translationLanguageCode: "he",
              context: null,
              audioUrl: null,
            },
          ],
        },
      });
    if (path.endsWith("/audio"))
      return route.fulfill({ contentType: "audio/mpeg", body: "fixture" });
    return route.fallback();
  });
  const mode =
    kind === "provider"
      ? "pronunciation"
      : kind === "self_rating"
        ? "flashcards"
        : "recall";
  await page.goto(
    `/learn/session/${mode}?items=${itemId}&ready=1${letters ? "&input=letters" : ""}`,
  );
  await expect(page.locator(".live-exercise")).toBeVisible();
}
for (const width of [320, 390, 1487]) {
  test(`clear translations and ordered colored ratings at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await game(page, "self_rating");
    await page
      .getByRole("button", { name: he.game.revealAnswer, exact: true })
      .click();
    const answer = page.locator(".live-revealed");
    await expect(answer).toHaveText("גלידה");
    expect(await answer.evaluate((el) => getComputedStyle(el).textAlign)).toBe(
      "center",
    );
    expect(
      await answer.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(32);
    const ratings = page.locator(".recall-ratings button");
    await expect(ratings).toHaveText([
      he.game.ratings.good,
      he.game.ratings.hard,
      he.game.ratings.again,
    ]);
    const boxes = await ratings.evaluateAll((els) =>
      els.map((el) => ({
        y: el.getBoundingClientRect().y,
        color: getComputedStyle(el).backgroundColor,
      })),
    );
    expect(boxes[0].y).toBeLessThan(boxes[1].y);
    expect(boxes[1].y).toBeLessThan(boxes[2].y);
    expect(new Set(boxes.map((box) => box.color)).size).toBe(3);
    await page.screenshot({
      path: test.info().outputPath("ratings.png"),
      fullPage: true,
    });
    let rating = "";
    await page.route("**/practice/attempts", async (route) => {
      rating = route.request().postDataJSON().selfRating;
      await route.fallback();
    });
    await page.keyboard.press("1");
    await expect.poll(() => rating).toBe("good");
  });
  test(`pronunciation auto plays, translates and fits its hold label at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await game(page, "provider");
    await expect(page.locator(".practice-translation")).toHaveText("גלידה");
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { audioPlays: number }).audioPlays,
        ),
      )
      .toBe(1);
    await page.locator(".listen-button").click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { audioPlays: number }).audioPlays,
        ),
      )
      .toBe(2);
    const fits = await page
      .locator(".hold-to-talk")
      .evaluate(
        (el) =>
          el.scrollHeight <= el.clientHeight &&
          el.scrollWidth <= el.clientWidth,
      );
    expect(fits).toBe(true);
    await page.screenshot({
      path: test.info().outputPath("pronunciation.png"),
      fullPage: true,
    });
  });
  test(`large phrase boxes separate words and recall stays distinct at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await game(page, "typed", true);
    expect(
      await page
        .locator(".live-exercise > h1")
        .evaluate((el) => getComputedStyle(el).textAlign),
    ).toBe("center");
    expect(
      await page
        .locator(".live-exercise > h1")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(32);
    await expect(page.locator(".letter-box-word")).toHaveCount(2);
    expect(
      await page
        .locator(".letter-box")
        .first()
        .evaluate((el) => el.getBoundingClientRect().width),
    ).toBeGreaterThanOrEqual(48);
    expect(
      await page
        .locator(".letter-tile")
        .first()
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(52);
    const gaps = await page.locator(".letter-boxes").evaluate((el) => ({
      between: parseFloat(getComputedStyle(el).columnGap),
      inside: parseFloat(getComputedStyle(el.firstElementChild!).gap),
    }));
    expect(gaps.between).toBeGreaterThan(gaps.inside * 2);
    for (const letter of "icecream")
      await page
        .locator(".letter-tile")
        .getByText(letter, { exact: true })
        .click();
    await expect(
      page.getByRole("textbox", { name: he.game.yourAnswer }),
    ).toHaveValue("ice cream");
    await page.screenshot({
      path: test.info().outputPath("letters.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    await page.goto(`/learn/session/recall?items=${itemId}&ready=1`);
    await expect(
      page.getByRole("textbox", { name: he.game.yourAnswer }),
    ).toBeVisible();
    await expect(page.locator(".letter-keyboard")).toHaveCount(0);
    await expect(page.locator(".letter-box")).toHaveCount(0);
  });
}
for (const width of [320, 1487]) {
  test(`library puts a generated native reading guide under source and meaning alongside at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await figmaFixtures(page, "he");
    let guideCalls = 0;
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/profile"))
        return route.fulfill({ json: { profile: largeProfile } });
      if (path.endsWith("/billing/status"))
        return route.fulfill({
          json: {
            tier: "paid",
            access: true,
            plan: { key: "paid", name: "Paid", kind: "paid" },
            entitlements: ["practice.play", "vocabulary.write"],
            subscription: null,
            trial: null,
          },
        });
      if (path.endsWith("/reading-guides")) {
        guideCalls++;
        expect(route.request().postDataJSON()).toEqual({ ids: [itemId] });
        return route.fulfill({
          json: {
            guides: [
              {
                id: itemId,
                phoneticText: "אַייס קְרִים",
                phoneticScheme: "transliteration:he",
              },
            ],
          },
        });
      }
      if (path.endsWith("/learning-items"))
        return route.fulfill({
          json: {
            items: [
              {
                id: itemId,
                sourceText: "ice cream",
                sourceLanguageCode: "en",
                translationLanguageCode: "he",
                phoneticText: null,
                phoneticScheme: null,
                itemType: "phrase",
                userStatus: "active",
                learningStatus: "new",
                userPriority: "normal",
                manualHard: false,
                overallMasteryScore: 0,
                nextReviewAt: null,
                createdAt: "2026-10-06T00:00:00.000Z",
                updatedAt: "2026-10-06T00:00:00.000Z",
                primaryTranslation: "גלידה",
              },
            ],
            nextCursor: null,
            totalCount: 1,
            page: 1,
            pageCount: 1,
          },
        });
      if (path.endsWith("/tags")) return route.fulfill({ json: { tags: [] } });
      return route.fallback();
    });
    await page.goto("/vocabulary");
    await expect(page.locator(".live-word-transliteration")).toHaveText(
      "אַייס קְרִים",
    );
    const geometry = await page.locator(".live-word-button").evaluate((el) => {
      const source = el.querySelector("strong")!.getBoundingClientRect();
      const guide = el
        .querySelector(".live-word-transliteration")!
        .getBoundingClientRect();
      const meaning = el
        .querySelector(".live-word-translation")!
        .getBoundingClientRect();
      return {
        source: { x: source.x, y: source.y, bottom: source.bottom },
        guide: { x: guide.x, y: guide.y },
        meaning: { x: meaning.x, y: meaning.y },
      };
    });
    expect(geometry.guide.y).toBeGreaterThanOrEqual(geometry.source.bottom);
    expect(Math.abs(geometry.meaning.y - geometry.source.y)).toBeLessThan(3);
    expect(Math.abs(geometry.meaning.x - geometry.source.x)).toBeGreaterThan(
      30,
    );
    expect(guideCalls).toBe(1);
    await page.screenshot({
      path: test.info().outputPath("library.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
  });
}
