import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
const sections = [
  "profile",
  "languages",
  "private-lessons",
  "learning",
  "interface",
  "extension",
  "notifications",
  "security",
  "subscription",
];
for (const width of [1920, 320]) {
  test(`all nine settings sections render and remain usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 320 ? 780 : 1080 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const section of sections) {
      await page.goto(`/test/fixtures/settings-preview.html#${section}`);
      await expect(page.locator(".sd-heading h1")).toBeVisible();
      await expect(page.locator(".sd-panel [role=status]")).toHaveCount(0);
      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(widths.scroll, section).toBeLessThanOrEqual(widths.client + 1);
      await expect(page.locator(".sd-sidebar nav a")).toHaveCount(9);
      await expect(page.locator(".sd-panel")).not.toContainText(
        /settingsLive\.|privateLesson\.(?:focusAreas|speechRates)|common\.(?:add|remove|cancel)/,
      );
      await page.screenshot({
        path: `output/playwright/settings-${section}-${width}.png`,
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
  });
}
test("actual browser decodes an uploaded PNG and saves it to the demo profile", async ({
  page,
}) => {
  await page.goto("/test/fixtures/settings-preview.html#profile");
  await page.getByRole("button", { name: "שינוי", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles(resolve("src/assets/settings/google.png"));
  await expect(page.getByRole("dialog").locator("img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "שמירת שינויים", exact: true })
    .click();
  await expect(page.locator(".user-button .avatar img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  await page.screenshot({
    path: "output/playwright/settings-avatar-saved.png",
    fullPage: true,
  });
});
test("reminder days and master switch respond to keyboard and explicit save", async ({
  page,
}) => {
  await page.goto("/test/fixtures/settings-preview.html#notifications");
  const master = page.getByRole("switch", { name: "קבלת התראות", exact: true });
  await expect(master).toHaveAttribute("aria-checked", "true");
  await master.focus();
  await page.keyboard.press("Space");
  await expect(master).toHaveAttribute("aria-checked", "false");
  await expect(
    page.getByRole("button", { name: "יום ראשון", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "שמירת שינויים", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("השינויים נשמרו");
});
