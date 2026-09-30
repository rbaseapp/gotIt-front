import { expect, test } from "@playwright/test";
import { seedProfile } from "../../src/data/seed";

const itemId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const exerciseId = "33333333-3333-4333-8333-333333333333";

test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });
test.setTimeout(90_000);

test("press to talk stays in place through hold, release and cancellation", async ({
  page,
}) => {
  let assessmentCalls = 0;
  await page.addInitScript(() => {
    const voiceState = window as Window & {
      __voiceStops: number;
      __talkPointerId: number;
    };
    voiceState.__voiceStops = 0;
    document.addEventListener(
      "pointerdown",
      (event) => {
        if ((event.target as Element).closest(".hold-to-talk"))
          voiceState.__talkPointerId = event.pointerId;
      },
      true,
    );
    localStorage.setItem("gotit.uiLocale.v1", "en");
    sessionStorage.setItem("gotit.refresh", "browser-fixture-refresh");
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => ({
        getTracks: () => [
          {
            stop: () => {
              voiceState.__voiceStops++;
            },
          },
        ],
      }),
    });
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: class {
        static isTypeSupported() {
          return false;
        }
        state = "inactive";
        mimeType = "audio/webm";
        ondataavailable: ((event: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        start() {
          this.state = "recording";
        }
        stop() {
          this.state = "inactive";
          this.ondataavailable?.({ data: new Blob() });
          this.onstop?.();
        }
      },
    });
  });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const response = path.endsWith("/auth/refresh")
      ? {
          accessToken: "browser-fixture-access",
          refreshToken: "browser-fixture-refresh",
          expiresIn: 3600,
        }
      : path.endsWith("/auth/me")
        ? {
            user: {
              id: itemId,
              applicationId: sessionId,
              email: "learner@example.test",
              emailVerified: true,
              status: "active",
              role: "user",
            },
          }
        : path.endsWith("/profile")
          ? { profile: seedProfile }
          : path.endsWith("/billing/status")
            ? {
                tier: "paid",
                access: true,
                plan: { key: "paid", name: "Paid", kind: "paid" },
                entitlements: ["practice.play"],
                subscription: null,
                trial: null,
              }
            : path.endsWith("/practice/sessions")
              ? {
                  session: {
                    id: sessionId,
                    sessionType: "pronunciation",
                    status: "active",
                    startedAt: "2026-09-15T10:00:00.000Z",
                    endedAt: null,
                    durationSeconds: null,
                    itemCount: 1,
                    attemptCount: 0,
                    correctCount: 0,
                    xpEarned: 0,
                    algorithmVersion: "server-v1",
                  },
                }
              : path.endsWith(`/practice/sessions/${sessionId}`)
                ? {
                    session: {
                      id: sessionId,
                      sessionType: "pronunciation",
                      status: "abandoned",
                      startedAt: "2026-09-15T10:00:00.000Z",
                      endedAt: "2026-09-15T10:01:00.000Z",
                      durationSeconds: 60,
                      itemCount: 1,
                      attemptCount: 0,
                      correctCount: 0,
                      xpEarned: 0,
                      algorithmVersion: "server-v1",
                    },
                  }
                : path.endsWith("/exercises")
                  ? {
                      exercises: [
                        {
                          id: exerciseId,
                          learningItemId: itemId,
                          exerciseType: "pronunciation",
                          kind: "provider",
                          direction: "source_to_translation",
                          prompt: {
                            text: "remember",
                            languageCode: "en",
                            context: null,
                            letterCount: 8,
                          },
                          expiresAt: "2026-10-01T10:00:00.000Z",
                        },
                      ],
                      algorithmVersion: "server-v1",
                    }
                  : null;
    if (path.endsWith("/pronunciation/assessments")) assessmentCalls++;
    if (response) await route.fulfill({ json: response });
    else
      await route.fulfill({
        status: 404,
        json: { error: { code: "TEST_UNHANDLED_ROUTE" } },
      });
  });

  await page.goto("/learn/session/pronunciation", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const talk = page.locator(".hold-to-talk");
  await expect(talk).toBeVisible();
  await page.locator(".provider-exercise").evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
  const position = async () =>
    talk.evaluate((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    });
  const idle = await position();
  const expectStable = async () => {
    const current = await position();
    expect(Math.abs(current.y - idle.y)).toBeLessThanOrEqual(1.1);
    expect(Math.abs(current.height - idle.height)).toBeLessThanOrEqual(1.1);
  };
  await page.mouse.move(idle.x + idle.width / 2, idle.y + idle.height / 2);
  await page.mouse.down();
  await expect(talk).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Cancel recording" }),
  ).toBeVisible();
  await expectStable();
  await page.waitForTimeout(650);
  await expectStable();
  await page.mouse.up();
  await expect(talk).toHaveAttribute("aria-pressed", "false");
  await expectStable();

  await page.mouse.move(idle.x + idle.width / 2, idle.y + idle.height / 2);
  await page.mouse.down();
  await expect(talk).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Cancel recording" }).click();
  await expect(talk).toHaveAttribute("aria-pressed", "false");
  await expectStable();
  expect(assessmentCalls).toBe(0);

  await page.mouse.move(idle.x + idle.width / 2, idle.y + idle.height / 2);
  await page.mouse.down();
  await expect(talk).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    const voiceState = window as Window & { __talkPointerId: number };
    document.querySelector(".hold-to-talk")?.dispatchEvent(
      new PointerEvent("pointercancel", {
        bubbles: true,
        pointerId: voiceState.__talkPointerId,
        isPrimary: true,
      }),
    );
  });
  await page.mouse.up();
  await expect(talk).toHaveAttribute("aria-pressed", "false");
  await expectStable();
  expect(assessmentCalls).toBe(0);

  await page.mouse.move(idle.x + idle.width / 2, idle.y + idle.height / 2);
  await page.mouse.down();
  await expect(talk).toHaveAttribute("aria-pressed", "true");
  const stopsBeforeExit = await page.evaluate(
    () => (window as Window & { __voiceStops: number }).__voiceStops,
  );
  await page
    .getByRole("button", { name: "Exit", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await page
    .getByRole("button", { name: "Exit practice", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page).toHaveURL(/\/learn$/);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __voiceStops: number }).__voiceStops,
      ),
    )
    .toBeGreaterThan(stopsBeforeExit);
  expect(assessmentCalls).toBe(0);
});
