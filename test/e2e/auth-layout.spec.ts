import { expect, test } from "@playwright/test";
import en from "../../src/locales/en/translation.json" with { type: "json" };
import he from "../../src/locales/he/translation.json" with { type: "json" };

for (const locale of ["he", "en"] as const) {
  for (const width of [320, 390, 1280]) {
    test(`production login layout ${locale} at ${width}px`, async ({
      page,
    }, info) => {
      const copy = locale === "he" ? he : en;
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript((language) => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem("gotit.uiLocale.v1", language);
        window.google = {
          accounts: {
            id: {
              initialize() {},
              disableAutoSelect() {},
              renderButton(host) {
                const button = document.createElement("button");
                button.textContent = "Google";
                host.append(button);
              },
            },
          },
        };
      }, locale);
      await page.goto("/login");
      await expect(page.locator(".auth-production")).toBeVisible();
      await expect(page.locator(".auth-card")).toBeVisible();
      await expect(page.locator(".auth-extra")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Google", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".facebook-button")).toBeVisible();
      if (width > 820)
        await expect(page.locator(".auth-showcase")).toBeVisible();
      else await expect(page.locator(".auth-mobile-logo")).toBeVisible();

      const geometry = await page.evaluate(() => {
        const card = document
          .querySelector(".auth-card")!
          .getBoundingClientRect();
        const submit = document.querySelector(".auth-submit")!;
        const form = submit.closest("form")!.getBoundingClientRect();
        const button = submit.getBoundingClientRect();
        return {
          cardWidth: card.width,
          position: getComputedStyle(submit).position,
          contained: button.top >= form.top && button.bottom <= form.bottom,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      expect(geometry.cardWidth).toBeLessThanOrEqual(431);
      expect(geometry.position).toBe("static");
      expect(geometry.contained).toBe(true);
      expect(geometry.overflow).toBe(false);
      await page
        .getByRole("button", { name: copy.auth.showPassword, exact: true })
        .click();
      await expect(
        page.getByLabel(copy.auth.password, { exact: true }),
      ).toHaveAttribute("type", "text");
      await page
        .getByRole("button", { name: copy.auth.hidePassword, exact: true })
        .click();
      await expect(
        page.getByLabel(copy.auth.password, { exact: true }),
      ).toHaveAttribute("type", "password");
      await page.screenshot({
        path: info.outputPath("login.png"),
        fullPage: true,
      });
    });
  }
}
