import { expect, test, type Page } from "@playwright/test";
import { seedProfile } from "../../src/data/seed";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;
async function openBoard(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("gotit.uiLocale.v1", "he");
    sessionStorage.setItem("gotit.refresh", "fixture-refresh");
  });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown;
    if (path.endsWith("/auth/refresh"))
      body = {
        accessToken: "fixture",
        refreshToken: "fixture-refresh",
        expiresIn: 3600,
      };
    else if (path.endsWith("/auth/me"))
      body = {
        user: {
          id: id(1),
          applicationId: id(2),
          email: "fixture@example.test",
          emailVerified: true,
          status: "active",
        },
      };
    else if (path.endsWith("/profile")) body = { profile: seedProfile };
    else if (path.endsWith("/dashboard/languages"))
      body = { languages: [{ code: "en", count: 4 }] };
    else if (path.endsWith("/billing/status"))
      body = {
        tier: "paid",
        access: true,
        plan: { key: "paid", name: "Paid", kind: "paid" },
        entitlements: ["practice.play"],
        subscription: null,
        trial: null,
      };
    else if (path.endsWith("/practice/sessions"))
      body = {
        session: {
          id: id(2),
          sessionType: "matching",
          status: "active",
          startedAt: "2026-10-06T08:00:00Z",
          endedAt: null,
          durationSeconds: null,
          itemCount: 4,
          attemptCount: 0,
          correctCount: 0,
          xpEarned: 0,
          algorithmVersion: "fixture",
        },
      };
    else if (path.endsWith("/exercises")) {
      const choices = [
        "לזכור",
        "ללמוד",
        "משמעות ארוכה שממשיכה לשורה נוספת",
        "תפוח",
      ].map((text, i) => ({ id: id(10 + i), text }));
      body = {
        exercises: choices.map((_, i) => ({
          id: id(20 + i),
          learningItemId: id(30 + i),
          exerciseType: "matching",
          kind: "multiple_choice",
          direction: "source_to_translation",
          prompt: {
            text: ["remember", "learn", "understand", "apple"][i],
            languageCode: "en",
            context: null,
            choices,
          },
          expiresAt: "2030-01-01T00:00:00Z",
        })),
        algorithmVersion: "fixture",
      };
    }
    await route.fulfill({
      status: body ? 200 : 404,
      json: body ?? { error: { code: "UNHANDLED_FIXTURE" } },
    });
  });
  await page.goto("/learn/session/drag_drop");
  await page.locator(".launch-button").click();
  await expect(page.locator(".drag-drop-row")).toHaveCount(4);
}

test.use({ hasTouch: true });
for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1280, height: 900 },
]) {
  test(`touch card follows the finger across a transformed board at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await openBoard(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    const card = page.locator(".meaning-card").first();
    const slot = page.locator(".drag-drop-slot").first();
    await card.scrollIntoViewIfNeeded();
    // Keep the ancestor transform present throughout the drag: the original
    // inline fixed ghost incorrectly used this ancestor as its coordinate space.
    await page.locator(".practice-card").evaluate((el) => {
      (el as HTMLElement).style.transform = "translateY(12px)";
    });
    const start = (await card.boundingBox())!;
    const end = (await slot.boundingBox())!;
    const x = start.x + start.width / 2,
      y = start.y + start.height / 2;
    const tx = end.x + end.width / 2,
      ty = end.y + end.height / 2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: tx, y: ty, id: 1 }],
    });
    const ghost = page.locator("body > .meaning-drag-ghost");
    await expect(ghost).toBeVisible();
    const bounds = (await ghost.boundingBox())!;
    expect(Math.abs(bounds.x + bounds.width / 2 - tx)).toBeLessThan(2);
    expect(Math.abs(bounds.y + bounds.height / 2 - ty)).toBeLessThan(2);
    await page.screenshot({ path: info.outputPath("finger-alignment.png") });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(slot).toContainText("לזכור");
    await expect(ghost).toHaveCount(0);
    // All targets and the action remain reachable even with four rows and long copy.
    for (const row of await page.locator(".drag-drop-slot").all()) {
      await row.scrollIntoViewIfNeeded();
      await expect(row).toBeInViewport();
    }
    await page.locator(".drag-drop-actions button").scrollIntoViewIfNeeded();
    await expect(page.locator(".drag-drop-actions button")).toBeInViewport();
    await page.screenshot({ path: info.outputPath("board.png") });
  });
}
