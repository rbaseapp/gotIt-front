import { expect, test } from "@playwright/test";

test.use({ hasTouch: true });

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 568, height: 320 },
  { width: 1440, height: 900 },
]) {
  test(`vocabulary filters and language list remain usable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      localStorage.removeItem("gotit.mode");
      localStorage.setItem("gotit.uiLocale.v1", "he");
      sessionStorage.setItem("gotit.refresh", "fixture-refresh");
    });
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const payload = path.endsWith("/auth/refresh")
        ? {
            accessToken: "fixture-access",
            refreshToken: "fixture-refresh",
            expiresIn: 3600,
          }
        : path.endsWith("/auth/me")
          ? {
              user: {
                id: "11111111-1111-4111-8111-111111111111",
                applicationId: "22222222-2222-4222-8222-222222222222",
                email: "learner@example.test",
                emailVerified: true,
                status: "active",
              },
            }
          : path.endsWith("/profile")
            ? {
                profile: {
                  name: "Learner",
                  defaultSourceLanguage: "en",
                  defaultTranslationLanguage: "he",
                  timezone: "Asia/Jerusalem",
                  dailyGoal: { type: "items", value: 5 },
                  languages: [],
                  interests: [],
                },
              }
            : path.endsWith("/dashboard/languages")
              ? {
                  languages: [
                    { code: "en", count: 2 },
                    { code: "fr", count: 1 },
                  ],
                }
              : path.endsWith("/learning-items")
                ? {
                    items: [],
                    nextCursor: null,
                    totalCount: 0,
                    page: 1,
                    pageCount: 1,
                  }
                : path.endsWith("/tags")
                  ? {
                      tags: [
                        {
                          id: "33333333-3333-4333-8333-333333333333",
                          name: "Travel",
                        },
                      ],
                      nextCursor: null,
                    }
                  : path.endsWith("/word-packs")
                    ? { packs: [] }
                    : null;
      await route.fulfill(
        payload
          ? { json: payload }
          : { status: 404, json: { error: { code: "TEST_UNHANDLED_ROUTE" } } },
      );
    });
    await page.goto("/vocabulary");
    const filters = page.locator(".vocabulary-advanced-filters");
    await expect(filters).toBeVisible();
    if (!(await filters.evaluate((element) => element.hasAttribute("open"))))
      await filters.locator("summary").click();
    const selects = filters.locator("select");
    await expect(selects).toHaveCount(4);
    await selects.nth(0).selectOption("paused");
    await selects.nth(1).selectOption("learning");
    await selects.nth(2).selectOption("recent");
    await selects.nth(3).selectOption({ label: "Travel" });
    await expect(selects.nth(0)).toHaveValue("paused");
    await expect(selects.nth(1)).toHaveValue("learning");
    await expect(selects.nth(2)).toHaveValue("recent");
    await expect(selects.nth(3)).toHaveValue(
      "33333333-3333-4333-8333-333333333333",
    );

    const input = filters.locator('input[role="combobox"]');
    await input.scrollIntoViewIfNeeded();
    await input.click();
    const list = filters.getByRole("listbox");
    await expect(list).toBeVisible();
    const geometry = await list.evaluate((element) => {
      const list = element.getBoundingClientRect();
      const viewport = window.visualViewport;
      return {
        left: list.left,
        right: list.right,
        top: list.top,
        bottom: list.bottom,
        viewportTop: viewport?.offsetTop ?? 0,
        viewportBottom:
          (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight),
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.top).toBeGreaterThanOrEqual(geometry.viewportTop - 1);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
    expect(geometry.documentWidth).toBeLessThanOrEqual(
      geometry.viewportWidth + 1,
    );
    expect(
      await filters.evaluate((element) => getComputedStyle(element).overflow),
    ).toBe("visible");
    await list.getByRole("option", { name: /English/ }).tap();
    await expect(input).toHaveValue("English");
    await expect(input).toHaveAttribute("aria-expanded", "false");

    const sourceLanguage = page.locator(".learning-language-select select");
    await sourceLanguage.selectOption("fr");
    await expect(sourceLanguage).toHaveValue("fr");
    const bulkAction = page.locator(".live-toolbar select");
    await bulkAction.selectOption("archive");
    await expect(bulkAction).toHaveValue("archive");
  });
}
