import { expect, test } from "@playwright/test";
import { courseWithPlan } from "../course-fixtures";
import { seedProfile } from "../../src/data/seed";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1024, height: 600 },
  { width: 1024, height: 720 },
  { width: 1280, height: 600 },
  { width: 1366, height: 640 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]) {
  test(`home separates word practice and private lessons at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      localStorage.removeItem("gotit.mode");
      localStorage.setItem("gotit.uiLocale.v1", "he");
      sessionStorage.setItem("gotit.refresh", "browser-fixture-refresh");
    });
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
                id: "11111111-1111-4111-8111-111111111111",
                applicationId: "22222222-2222-4222-8222-222222222222",
                email: "learner@example.test",
                emailVerified: true,
                status: "active",
              },
            }
          : path.endsWith("/profile")
            ? {
                profile: seedProfile,
              }
            : path.endsWith("/dashboard/languages")
              ? { languages: [{ code: "en", count: 20 }] }
              : path.endsWith("/dashboard")
                ? {
                    counts: {
                      total: 20,
                      new: 3,
                      learning: 7,
                      reviewing: 5,
                      mastered: 5,
                      due: 4,
                      difficult: 1,
                      highPriority: 1,
                      awaitingRecall: 2,
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
                      current: 2,
                      completed: false,
                      date: "2026-09-30",
                    },
                    gamification: {
                      totalXp: 100,
                      level: 1,
                      nextLevelXp: 500,
                      todayXp: 10,
                      dailyXpCap: 100,
                      dailyXpRemaining: 90,
                      dailyXpCapReached: false,
                      postDailyCapPercent: 20,
                      currentStreakDays: 1,
                      longestStreakDays: 2,
                      lastActivityDate: "2026-09-30",
                    },
                    weeklyActivity: { timezone: "Asia/Jerusalem", days: [] },
                  }
                : path.endsWith("/courses")
                  ? {
                      courses:
                        viewport.width > 1000 ? [courseWithPlan(true)] : [],
                      homework: [],
                      available: true,
                    }
                  : path.endsWith("/learning-items")
                    ? { items: [], nextCursor: null }
                    : null;
      if (payload) await route.fulfill({ json: payload });
      else
        await route.fulfill({
          status: 404,
          json: { error: { code: "TEST_UNHANDLED_ROUTE" } },
        });
    });
    await page.goto("/dashboard");
    const words = page.getByRole("link", { name: "מתחילים תרגול חכם" });
    const lesson = page
      .locator(".ux-explore")
      .getByRole("link", { name: "שיחה עם מורה" });
    await expect(words).toHaveAttribute(
      "href",
      "/learn/smart?language=en&return=%2Fdashboard",
    );
    await expect(lesson).toHaveAttribute(
      "href",
      "/private-lesson?practice=free",
    );
    await expect(page.locator(".ux-home-next")).toBeVisible();
    await expect(page.locator(".ux-home-heading h1")).toHaveText(
      "היי, learner",
    );
    await expect(page.locator(".ux-home-options .ux-card")).toHaveCount(2);
    if (viewport.width > 860) {
      await expect(page.locator(".ux-home-illustration img")).toBeVisible();
      await expect(
        page.locator(".ux-home-words .ux-word-illustration"),
      ).toBeVisible();
      await expect(page.locator(".ux-home-other-program img")).toBeVisible();
      const primary = await page
        .locator(".ux-home-next-copy .button.primary")
        .boundingBox();
      const hero = await page.locator(".ux-home-next").boundingBox();
      expect(primary!.width).toBeLessThan(hero!.width * 0.55);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight + 1,
          ),
        )
        .toBe(true);
      const footer = await page.locator(".ux-home-footer").boundingBox();
      expect(footer!.y + footer!.height).toBeLessThanOrEqual(viewport.height);
      const padding = await page
        .locator(".page-content")
        .evaluate((element) =>
          parseFloat(getComputedStyle(element).paddingBottom),
        );
      expect(
        Math.abs(viewport.height - footer!.y - footer!.height - padding),
      ).toBeLessThan(2);
      const options = await page.locator(".ux-home-options").boundingBox();
      expect(options!.y).toBeGreaterThanOrEqual(hero!.y + hero!.height);
      expect(options!.width).toBeCloseTo(hero!.width, 0);
      expect(
        await page
          .locator(".sidebar")
          .evaluate(
            (element) => element.scrollHeight <= element.clientHeight + 1,
          ),
      ).toBe(true);
    }
    await expect(page.locator(".dashboard-more")).not.toHaveAttribute("open");
    // An unselected course never takes over the user's vocabulary-first home.
    await expect(
      page.locator('.ux-home-next-copy a[href^="/private-lesson"]'),
    ).toHaveCount(0);
    if (viewport.width < 860)
      await expect(page.locator(".mobile-tabs a")).toHaveCount(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/dashboard-${viewport.width}-${viewport.height}.png`,
      fullPage: true,
    });
  });
}
