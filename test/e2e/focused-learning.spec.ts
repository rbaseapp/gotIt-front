import { expect, test } from "@playwright/test";
import { figmaFixtures } from "./figma-fixtures";
import he from "../../src/locales/he/translation.json" with { type: "json" };
const id = "11111111-1111-4111-8111-111111111111";
for (const width of [320, 390, 1487])
  test(`focused study, clickable recall and auth at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width > 760 ? 1058 : 844 });
    await figmaFixtures(page, "he");
    await page.goto(`/learn/session/smart?items=${id}&language=he&ready=1`);
    await expect(page.locator(".session-screen-title")).toHaveText(
      he.gameUi.studyTitle,
    );
    await expect(
      page.getByRole("heading", { name: "בית", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`study-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    const studyLayout = await page
      .locator(".session-study")
      .evaluate((main) => ({
        content: main.scrollHeight,
        height: main.clientHeight,
        controls: [
          ".study-skip",
          ".study-evidence-note",
          ".session-extra > summary",
        ].map((selector) => {
          const box = main.querySelector(selector)!.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom };
        }),
      }));
    expect(studyLayout.content).toBeLessThanOrEqual(studyLayout.height + 1);
    for (const box of studyLayout.controls) {
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(width > 760 ? 1058 : 844);
    }
    await page.locator(".session-extra > summary").click();
    await expect(
      page.locator(".session-extra[open] .session-hud"),
    ).toBeVisible();
    const detailsBox = await page.locator(".session-extra[open]").boundingBox();
    expect(detailsBox!.y).toBeGreaterThanOrEqual(0);
    expect(detailsBox!.y + detailsBox!.height).toBeLessThanOrEqual(
      width > 760 ? 1058 : 844,
    );
    await page.locator(".session-extra > summary").click();
    await page.goto(`/learn/session/recall?items=${id}&language=he`);
    await page.locator(".session-launch > .button.primary").click();
    await expect(page.locator(".session-screen-title")).toHaveText(
      he.gameUi.recallTitle,
    );
    await page.screenshot({
      path: info.outputPath(`recall-initial-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "ב", exact: true }).click();
    await page.getByRole("button", { name: "י", exact: true }).click();
    await page.getByRole("button", { name: "ת", exact: true }).click();
    await expect(page.locator(".letter-box-input")).toHaveValue("בית");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`recall-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.addInitScript(() => sessionStorage.clear());
    await page.route("**/api/v1/auth/refresh", (route) =>
      route.fulfill({
        status: 401,
        json: { error: { code: "UNAUTHENTICATED" } },
      }),
    );
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".auth-review")).toBeVisible();
    await expect(
      page.getByRole("button", { name: he.auth.loginSubmit, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`auth-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
  });
