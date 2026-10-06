import { expect, test } from "@playwright/test";
import en from "../../src/locales/en/translation.json" with { type: "json" };
import he from "../../src/locales/he/translation.json" with { type: "json" };

for (const locale of ["en", "he"] as const) {
  for (const width of [320, 1280]) {
    test(`email verification and recovery ${locale} at ${width}px`, async ({
      page,
    }) => {
      const copy = locale === "en" ? en : he;
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript((language) => {
        localStorage.clear();
        localStorage.setItem("gotit.uiLocale.v1", language);
      }, locale);
      await page.route("**/core-api/api/v1/auth/*", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith("verify-email") || path.endsWith("reset-password")) {
          const input = route.request().postDataJSON();
          expect(input.code).toBe("123456");
          expect(input.password).toBe("new-password-123");
          await route.fulfill({ status: 204 });
        } else
          await route.fulfill({
            status: 202,
            json: { status: "accepted", expiresIn: 600, retryAfter: 60 },
          });
      });
      await page.goto("/?auth=register");
      await page
        .getByLabel(copy.auth.email, { exact: true })
        .fill("owner@example.com");
      await page
        .getByLabel(copy.auth.password, { exact: true })
        .fill("new-password-123");
      await page
        .getByRole("button", { name: copy.auth.registerSubmit, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: copy.auth.verifyTitle, exact: true }),
      ).toBeFocused();
      for (const submit of [copy.auth.verifySubmit, copy.auth.resetSubmit]) {
        await page
          .getByLabel(copy.auth.emailCode, { exact: true })
          .fill("123456");
        await page
          .getByLabel(copy.auth.newPassword, { exact: true })
          .fill("new-password-123");
        await page
          .getByLabel(copy.auth.confirmPassword, { exact: true })
          .fill("new-password-123");
        const size = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        expect(size.document).toBeLessThanOrEqual(size.viewport + 1);
        await page.getByRole("button", { name: submit, exact: true }).click();
        await expect(
          page.getByLabel(copy.auth.password, { exact: true }),
        ).toHaveValue("");
        if (submit === copy.auth.verifySubmit) {
          await page
            .getByRole("button", {
              name: copy.auth.forgotPassword,
              exact: true,
            })
            .click();
          await page
            .getByRole("button", { name: copy.auth.sendCode, exact: true })
            .click();
        }
      }
      await expect(page.getByRole("status")).toHaveText(
        copy.auth.passwordReset,
      );
      expect(
        await page.evaluate(() => localStorage.getItem("gotit.refresh")),
      ).toBeNull();
    });
  }
}
