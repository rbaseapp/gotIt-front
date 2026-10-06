import { test, expect, type Page } from "@playwright/test";
import { figmaFixtures } from "./figma-fixtures";
import he from "../../src/locales/he/translation.json" with { type: "json" };

const packId = "d3000000-0000-4000-8000-000000000001";
const first = "d4000000-0000-4000-8000-000000000001";
const second = "d4000000-0000-4000-8000-000000000002";
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1sAAAAASUVORK5CYII=";
async function fixture(page: Page, allKnown = false) {
  await figmaFixtures(page, "he");
  const pack = {
    id: packId,
    slug: "unit-1",
    title: "יחידה 1: Building Your First Sentences",
    description: "",
    moduleNumber: 1,
    version: 4,
    wordCount: 2,
    installed: false,
    installedVersion: null as number | null,
    topic: {
      id: packId,
      slug: "english-learning-path-en-he",
      title: "English",
    },
    track: {
      id: packId,
      slug: "beginner",
      title: "Beginner",
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
      known: 0,
      completed: 0,
      introduced: 0,
      due: 0,
    },
  };
  const entries = [
    { id: first, sourceText: "I", translationText: "אני" },
    { id: second, sourceText: "you", translationText: "אתה; את" },
  ].map((entry) => ({
    ...entry,
    itemType: "word",
    partOfSpeech: "pronoun",
    exampleText: null,
    learningItemId: null,
    excludedAt: null,
    known: allKnown,
  }));
  const created: Record<string, unknown>[] = [];
  const added: string[][] = [];
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
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
    if (path.endsWith("/word-packs"))
      return route.fulfill({ json: { packs: [pack] } });
    if (path.endsWith(`/word-packs/${packId}`))
      return route.fulfill({ json: { pack, entries } });
    if (path.endsWith("/known")) {
      const body = route.request().postDataJSON();
      entries
        .filter((entry) => body.entryIds.includes(entry.id))
        .forEach((entry) => {
          entry.known = body.known;
        });
      return route.fulfill({
        json: {
          packId,
          knownCount: entries.filter((entry) => entry.known).length,
        },
      });
    }
    if (path.endsWith("/add")) {
      added.push(route.request().postDataJSON().entryIds);
      pack.installed = true;
      pack.installedVersion = 4;
      return route.fulfill({
        json: {
          packId,
          added: 2,
          linkedExisting: 0,
          restored: 0,
          excluded: 0,
          total: 2,
        },
      });
    }
    if (path.includes("/entries/") && path.endsWith("/image"))
      return route.fulfill({
        json: {
          image:
            method === "GET"
              ? null
              : {
                  url: png,
                  alt: path.includes(first) ? "I" : "you",
                  generated: true,
                  provider: "fixture",
                },
        },
      });
    if (path.endsWith("/example"))
      return route.fulfill({
        json: {
          exampleText: path.includes(first)
            ? "I am happy."
            : "You are my friend.",
          generated: true,
        },
      });
    if (path.endsWith("/practice/sessions") && method === "POST")
      created.push(route.request().postDataJSON());
    return route.fallback();
  });
  return { created, added };
}

for (const width of [320, 1487])
  test(`unit media, known explanation and game scope at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1058 });
    const { created, added } = await fixture(page);
    await page.goto(`/english-learning?unit=${packId}&tab=words`);
    await expect(page.locator(".unit-word-example blockquote")).toHaveText(
      "I am happy.",
    );
    await expect(page.locator(".unit-word-picture img")).toHaveAttribute(
      "alt",
      "I",
    );
    await expect(page.getByText(he.unitStudy.knownHelp)).toBeVisible();
    expect(created).toHaveLength(0);
    expect(added).toHaveLength(0);
    await page
      .getByRole("checkbox", { name: he.unitStudy.knownLabel, exact: true })
      .click();
    await expect(
      page.getByRole("checkbox", {
        name: he.unitStudy.knownLabel,
        exact: true,
      }),
    ).toBeChecked();
    await page
      .locator(".unit-browser-row")
      .nth(1)
      .locator("button")
      .first()
      .click();
    await expect(page.locator(".unit-word-example blockquote")).toHaveText(
      "You are my friend.",
    );
    await expect(page.locator(".unit-word-picture img")).toHaveAttribute(
      "alt",
      "you",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    await page.getByRole("button", { name: he.unitStudy.chooseGame }).click();
    await expect(page).toHaveURL(new RegExp(`/learn\\?pack=${packId}`));
    await expect(page.getByText(he.unitStudy.scopeHelp)).toBeVisible();
    expect(added).toEqual([[second]]);
    const links = await page
      .locator('a[href*="/learn/session/"]')
      .evaluateAll((elements) =>
        elements.map((e) => (e as HTMLAnchorElement).href),
      );
    expect(links.length).toBeGreaterThanOrEqual(4);
    for (const link of links) {
      const params = new URL(link).searchParams;
      expect(params.get("pack")).toBe(packId);
      expect(params.get("language")).toBe("en");
      expect(params.get("return")).toContain(`unit=${packId}&tab=words`);
    }
    await page.locator('a[href*="/learn/session/recall"]').first().click();
    await expect(page.getByTestId("unit-session-context")).toContainText(
      "יחידה 1: Building Your First Sentences",
    );
    await expect(page.getByTestId("unit-session-context")).toContainText(
      he.unitStudy.scopeHelp,
    );
    await page
      .getByRole("button", { name: he.game.start, exact: true })
      .click();
    await expect.poll(() => created.length).toBe(1);
    expect(created[0]).toMatchObject({
      sessionType: "recall",
      sourceLanguageCode: "en",
      scope: { type: "pack", id: packId },
    });
    await expect(page.getByTestId("unit-session-context")).toBeVisible();
  });

test("all-known units do not launch general practice", async ({ page }) => {
  const { created, added } = await fixture(page, true);
  await page.goto(`/english-learning?unit=${packId}&tab=words`);
  await expect(
    page.getByRole("button", { name: he.unitStudy.chooseGame }),
  ).toBeDisabled();
  await expect(page.getByText(he.unitStudy.allKnown)).toBeVisible();
  expect(created).toHaveLength(0);
  expect(added).toHaveLength(0);
});

test("study provider failure is visible and can be retried without losing unit words", async ({
  page,
}) => {
  await fixture(page);
  let fail = true;
  await page.route("**/entries/*/image", (route) =>
    fail
      ? route.fulfill({
          status: 503,
          json: { error: { code: "INTERNAL_ERROR", message: "Unavailable" } },
        })
      : route.fulfill({
          json: {
            image: { url: png, alt: "I", generated: true, provider: "fixture" },
          },
        }),
  );
  await page.goto(`/english-learning?unit=${packId}&tab=words`);
  await expect(
    page.locator(".unit-word-detail").getByRole("alert"),
  ).toBeVisible();
  await expect(page.locator(".unit-word-example blockquote")).toHaveText(
    "I am happy.",
  );
  fail = false;
  await page
    .locator(".unit-word-detail")
    .getByRole("button", { name: he.common.tryAgain })
    .click();
  await expect(page.locator(".unit-word-picture img")).toBeVisible();
});
