import { expect, test, type Page } from "@playwright/test";
import { seedProfile } from "../../src/data/seed";

const sessionId = "22222222-2222-4222-8222-222222222222";
const itemId = "11111111-1111-4111-8111-111111111111";
const words = ["רכישה עסקית", "עקירה", "דו־צדדי", "משתק", "מלאכה"];
const date = "2026-09-30T10:00:00.000Z";
const session = {
  id: sessionId,
  sessionType: "recall",
  status: "active",
  startedAt: date,
  endedAt: null,
  durationSeconds: null,
  itemCount: words.length,
  attemptCount: 0,
  correctCount: 0,
  xpEarned: 0,
  algorithmVersion: "server-v1",
};

// Render the real authenticated page and complete actual exercises. A static
// results fragment misses retained exercise state at the completion transition.
async function completeSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("gotit.uiLocale.v1", "he");
    sessionStorage.setItem("gotit.refresh", "browser-fixture-refresh");
  });
  let attempts = 0;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let response: unknown;
    if (path.endsWith("/auth/refresh"))
      response = {
        accessToken: "browser-fixture-access",
        refreshToken: "browser-fixture-refresh",
        expiresIn: 3600,
      };
    else if (path.endsWith("/auth/me"))
      response = {
        user: {
          id: itemId,
          applicationId: sessionId,
          email: "learner@example.test",
          emailVerified: true,
          status: "active",
          role: "user",
        },
      };
    else if (path.endsWith("/profile")) response = { profile: seedProfile };
    else if (path.endsWith("/dashboard/languages"))
      response = { languages: [{ code: "en", count: words.length }] };
    else if (path.endsWith("/billing/status"))
      response = {
        tier: "paid",
        access: true,
        plan: { key: "paid", name: "Paid", kind: "paid" },
        entitlements: ["practice.play"],
        subscription: null,
        trial: null,
      };
    else if (path.endsWith("/practice/sessions")) response = { session };
    else if (path.endsWith(`/practice/sessions/${sessionId}`))
      response = {
        session: {
          ...session,
          status: "completed",
          endedAt: date,
          durationSeconds: 60,
          attemptCount: 12,
          correctCount: 8,
          xpEarned: 34,
        },
      };
    else if (path.endsWith("/exercises"))
      response = {
        exercises: words.map((word, index) => ({
          id: `33333333-3333-4333-8333-33333333333${index}`,
          learningItemId: itemId,
          exerciseType: "recall",
          kind: "multiple_choice",
          direction: "source_to_translation",
          prompt: {
            text: `Word ${index + 1}`,
            languageCode: "en",
            context: null,
            choices: [{ id: itemId, text: word }],
            letterCount: 4,
          },
          expiresAt: "2030-10-01T10:00:00.000Z",
        })),
        algorithmVersion: "server-v1",
      };
    else if (path.endsWith("/practice/attempts")) {
      const index = attempts++;
      response = {
        attempt: {
          id: `44444444-4444-4444-8444-44444444444${index}`,
          learningItemId: itemId,
          sessionId,
          sequence: attempts,
          result: "correct",
          score: 100,
          expectedAnswer: words[index],
          xpEarned: 5,
        },
        progress: {
          status: "learning",
          stage: 0,
          masteryScore: 42,
          masterySource: "system",
          nextReviewAt: date,
        },
        skills: [],
        algorithmVersion: "server-v1",
        replayed: false,
      };
    }
    if (response) await route.fulfill({ json: response });
    else
      await route.fulfill({
        status: 404,
        json: { error: { code: "TEST_UNHANDLED_ROUTE" } },
      });
  });
  await page.goto("/learn/session/recall");
  await page.locator(".launch-button").click();
  for (const word of words) {
    await page
      .locator(".live-choice-grid button")
      .filter({ hasText: word })
      .click();
    await page.locator(".feedback-next-action").click();
  }
  await expect(page.locator(".session-results")).toBeVisible();
  await expect(page.locator(".session-learnings span")).toHaveCount(5);
}

async function expectActionsReachable(page: Page) {
  // Do not use scrollIntoView/click auto-scrolling: overflow:hidden still allows
  // programmatic scrolling, which concealed this regression in the old test.
  const main = page.locator(".live-session-main");
  await page.mouse.move(150, 250);
  await page.mouse.wheel(0, 1800);
  const actions = page.locator(".finish-actions");
  await expect(actions).toBeInViewport({ ratio: 1 });
  const dimensions = await main.evaluate((element) => ({
    scrollTop: element.scrollTop,
    overflow: getComputedStyle(element).overflowY,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.overflow).toBe("auto");
  expect(dimensions.documentWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth,
  );
  return dimensions;
}

test.use({ hasTouch: true });
test.setTimeout(60_000);

for (const viewport of [
  { width: 343, height: 762 }, // User's third report, including the learned words.
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 568, height: 320 },
  { width: 844, height: 390 },
]) {
  test(`real completion allows user scrolling at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await completeSession(page);
    await page.screenshot({
      path: testInfo.outputPath("completed-before-scroll.png"),
    });
    await expectActionsReachable(page);
    await page.screenshot({
      path: testInfo.outputPath("completed-after-scroll.png"),
    });
    // A coordinate click proves the user can activate the fully visible button.
    const button = await page.locator(".finish-actions button").boundingBox();
    await page.mouse.click(
      button!.x + button!.width / 2,
      button!.y + button!.height / 2,
    );
    await expect(page.locator(".session-launch")).toBeVisible();
    await expect(page.locator(".session-results")).toHaveCount(0);
  });
}

test("completed session remains scrollable with touch and changing viewport height", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 343, height: 762 });
  await completeSession(page);
  const cdp = await page.context().newCDPSession(page);
  for (const height of [590, 900, 640]) {
    await page.setViewportSize({ width: 343, height });
    // Native touch input exercises browser panning, not a DOM scroll assignment.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 170, y: height - 70 }],
    });
    for (let step = 1; step <= 12; step++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 170, y: height - 70 - step * 30 }],
      });
      await page.waitForTimeout(20);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(".finish-actions")).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: testInfo.outputPath(`touch-${height}.png`) });
  }
  const link = await page.locator(".finish-actions a").boundingBox();
  await page.touchscreen.tap(
    link!.x + link!.width / 2,
    link!.y + link!.height / 2,
  );
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("result actions clear the bottom safe area on a notched phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { top: 24, bottom: 34 },
  });
  await completeSession(page);
  await expectActionsReachable(page);
  const main = page.locator(".live-session-main");
  expect(
    await main.evaluate((element) =>
      parseFloat(getComputedStyle(element).paddingBottom),
    ),
  ).toBeGreaterThanOrEqual(34);
  const actions = await page.locator(".finish-actions").boundingBox();
  expect(actions!.y + actions!.height).toBeLessThanOrEqual(664 - 34);
  const topbar = page.locator(".session-topbar");
  expect(
    await topbar.evaluate((element) =>
      parseFloat(getComputedStyle(element).paddingTop),
    ),
  ).toBeGreaterThanOrEqual(24);
});
