import { expect, test } from "@playwright/test";

/**
 * The first-entry flow at phone widths: every screen fits, nothing scrolls sideways,
 * and the main controls are reachable. Signed out, so it runs on the demo server.
 */
for (const width of [320, 390]) {
  test(`start flow fits a ${width}px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("gotit.uiLocale.v1", "he");
    });
    const noSideScroll = async () =>
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);

    await page.goto("/start");
    await expect(page.getByText("איזו שפה לומדים?")).toBeVisible();
    await noSideScroll();
    await page.getByRole("button", { name: "המשך" }).click();

    // One tap on a level moves on.
    await expect(page.getByText("מה רמת האנגלית שלך?")).toBeVisible();
    await noSideScroll();
    await page.getByRole("button", { name: /בינוני/ }).click();

    await expect(page.getByText("על מה אתם אוהבים לקרוא ולדבר?")).toBeVisible();
    await noSideScroll();
    await page.getByRole("button", { name: "טיולים" }).click();
    await page.getByRole("button", { name: "שטף בדיבור" }).click();
    await page.getByRole("button", { name: "המשך" }).click();

    // The check starts at once, with no intro screen.
    await expect(page.getByText(/שאלה 1 מתוך עד 10/)).toBeVisible();
    await noSideScroll();
    const answers = page.locator(".pocket-options .ob-btn");
    for (let question = 0; question < 10; question++) {
      if (!(await page.getByText(/מתוך עד 10/).isVisible())) break;
      await page.waitForTimeout(350);
      await answers.first().click();
    }
    await noSideScroll();
  });
}
