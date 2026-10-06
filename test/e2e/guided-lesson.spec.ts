import { expect, test, type Page } from "@playwright/test";
import { guidedSession, guidedReport } from "../guided-lesson-fixtures";
import { seedProfile } from "../../src/data/seed";
import he from "../../src/locales/he/translation.json" with { type: "json" };

const id = guidedSession.lesson.id;
const activity = {
  ...guidedSession.activity!,
  title: "עכשיו ננסה לבקש קפה.",
  stage: "try" as const,
  tutorText: "אפשר להתחיל עם ⁦I want...⁩",
  question: "איך תבקשו תה?",
  example: { targetText: "I want coffee.", meaningAndReason: "אני רוצה קפה." },
};
const lesson = {
  ...guidedSession.lesson,
  targetLanguageCode: "en",
  topic: "לבקש משהו",
  targetWords: [
    { learningItemId: id, sourceText: "coffee", translationText: "קפה" },
  ],
};
async function fixture(page: Page) {
  const commands: Array<Record<string, unknown>> = [];
  await page.addInitScript(() => {
    localStorage.removeItem("gotit.mode");
    localStorage.setItem("gotit.uiLocale.v1", "he");
    sessionStorage.setItem("gotit.refresh", "fixture-refresh");
    let microphoneCaptures = 0;
    Object.defineProperty(window, "gotitTestMicrophoneCaptures", {
      get: () => microphoneCaptures,
    });
    navigator.mediaDevices.getUserMedia = async () => {
      microphoneCaptures += 1;
      throw new DOMException("Denied", "NotAllowedError");
    };
    class Channel extends EventTarget {
      readyState = "connecting";
      send(raw: string) {
        if (JSON.parse(raw).type !== "response.create") return;
        queueMicrotask(() => {
          for (const event of [
            { type: "response.created" },
            { type: "response.done", response: { status: "completed" } },
            { type: "output_audio_buffer.stopped" },
          ])
            this.dispatchEvent(
              new MessageEvent("message", { data: JSON.stringify(event) }),
            );
        });
      }
      close() {
        this.readyState = "closed";
      }
    }
    class Peer {
      channel = new Channel();
      connectionState = "connected";
      createDataChannel() {
        return this.channel;
      }
      addTransceiver() {
        return { sender: { replaceTrack: async () => {} } };
      }
      addEventListener() {}
      async createOffer() {
        return { type: "offer", sdp: "fixture-offer" };
      }
      async setLocalDescription() {}
      async setRemoteDescription() {
        this.channel.readyState = "open";
        queueMicrotask(() => this.channel.dispatchEvent(new Event("open")));
      }
      close() {
        this.channel.close();
      }
    }
    Object.defineProperty(window, "RTCPeerConnection", { value: Peer });
  });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let payload: unknown;
    if (path.endsWith("/auth/refresh"))
      payload = {
        accessToken: "fixture",
        refreshToken: "fixture",
        expiresIn: 3600,
      };
    else if (path.endsWith("/auth/me"))
      payload = {
        user: {
          id,
          applicationId: id,
          email: "guided@example.test",
          emailVerified: true,
          status: "active",
          role: "user",
        },
      };
    else if (path.endsWith("/profile"))
      payload = {
        profile: {
          ...seedProfile,
          defaultSourceLanguage: "en",
          defaultTranslationLanguage: "he",
        },
      };
    else if (path.endsWith("/billing/status"))
      payload = {
        tier: "paid",
        access: true,
        entitlements: ["practice.play"],
        plan: null,
        subscription: null,
        trial: null,
      };
    else if (path.endsWith("/private-lessons/setup"))
      payload = {
        preferences: null,
        roadmap: null,
        curriculum: {
          recommended: {
            goalKind: "grammar",
            goalKey: "foundation",
            reason: "fixture",
          },
          grammarTopics: [],
          communicationGoals: [],
        },
        interactionCapabilities: {
          guidedTasks: true,
          textAnswers: true,
          billingPause: false,
        },
      };
    else if (path.endsWith(`/private-lessons/units/${id}`))
      payload = {
        unit: {
          packId: id,
          title: "לבקש משהו",
          moduleNumber: 2,
          targetLanguageCode: "en",
          supportLanguageCode: "he",
          level: "A1",
          station: "supported",
          completed: 1,
          total: 6,
          words: [
            {
              sourceText: "coffee",
              translationText: "קפה",
              exampleText: null,
              introduced: true,
            },
          ],
        },
      };
    else if (path.endsWith("/private-lessons/realtime-sessions"))
      payload = { ...guidedSession, lesson, activity };
    else if (path.endsWith("/realtime/connect")) {
      await route.fulfill({ body: "fixture-answer" });
      return;
    } else if (path.endsWith("/private-lessons")) payload = { lessons: [] };
    else if (path.endsWith("/complete")) payload = { lesson: guidedReport };
    else if (path.endsWith(`/courses/homework/${id}`))
      payload = {
        homework: {
          id,
          lessonId: id,
          courseId: null,
          unitKey: null,
          title: "תרגול המשך",
          targetLanguageCode: "en",
          supportLanguageCode: "he",
          createdAt: "2026-10-06T00:00:00Z",
          status: "pending",
          taskCount: 0,
          completedCount: 0,
          revision: 0,
          objective: null,
          estimatedMinutes: null,
          tasks: [],
        },
      };
    else if (
      path.endsWith("/activity") &&
      route.request().method() === "POST"
    ) {
      commands.push(route.request().postDataJSON());
      if (commands.length === 1) {
        await route.fulfill({
          status: 503,
          json: { error: { code: "PROVIDER_UNAVAILABLE" } },
        });
        return;
      }
      payload = {
        activity: {
          ...activity,
          revision: 1,
          stage: "chat",
          tutorText: "יפה, ננסה בקשה חדשה.",
          turns: [...activity.turns, { role: "learner", text: "I want tea." }],
        },
        tutorEvent: guidedSession.realtime.openingEvent,
      };
    }
    await route.fulfill(
      payload
        ? { json: payload }
        : { status: 404, json: { error: { code: "FIXTURE_ROUTE_MISSING" } } },
    );
  });
  return commands;
}
for (const width of [320, 390, 1487])
  test(`guided lesson ${width}: canonical geometry, text without microphone, stable retry`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1487 ? 1058 : 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const commands = await fixture(page);
    await page.goto(`/private-lesson?pack=${id}`);
    await page.getByLabel(he.lessonUi.answerMode).selectOption("text");
    await page
      .getByRole("button", { name: he.privateLesson.start, exact: true })
      .click();
    await expect(page.locator(".lesson-session")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() =>
        Reflect.get(window, "gotitTestMicrophoneCaptures"),
      ),
    ).toBe(0);
    const portrait = await page
      .locator(".lesson-teacher-profile .teacher-avatar")
      .boundingBox();
    expect(portrait?.width).toBe(width === 1487 ? 204 : 48);
    await expect(page.locator(".lesson-tutor-turn h1")).toHaveCSS(
      "font-size",
      width === 1487 ? "56px" : "20px",
    );
    const mic = await page.locator(".lesson-microphone").boundingBox();
    expect(mic?.width).toBe(width === 1487 ? 160 : 88);
    if (width === 1487)
      expect(
        (await page.locator(".lesson-tutor-turn").boundingBox())?.width,
      ).toBe(882);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/guided-lesson-${width}.png`,
      animations: "disabled",
    });
    await page
      .locator(width === 1487 ? ".lesson-text-action" : ".lesson-mobile-text")
      .click();
    await page.getByLabel(he.lessonUi.yourAnswer).fill("I want tea.");
    await page
      .getByRole("button", { name: he.lessonUi.send, exact: true })
      .click();
    await expect(page.getByLabel(he.lessonUi.yourAnswer)).toHaveValue(
      "I want tea.",
    );
    await expect(page.locator(".modal .form-error")).toBeVisible();
    await page
      .getByRole("button", { name: he.lessonUi.send, exact: true })
      .click();
    await expect(page.locator(".lesson-tutor-turn p")).toHaveText(
      "יפה, ננסה בקשה חדשה.",
    );
    expect(commands).toHaveLength(2);
    expect(commands[1]).toEqual(commands[0]);
    await page.locator(".lesson-exit").click();
    await page
      .getByRole("button", { name: he.lessonUi.finishAndSave, exact: true })
      .click();
    await expect(page.locator(".lesson-summary")).toBeVisible();
    await expect(
      page.getByText("בקשת תה במשפט עצמאי.", { exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByText("בקשת קפה בעזרת דוגמה.", { exact: true }),
    ).toHaveCount(1);
    await expect(page.locator(".lesson-summary > header p")).toContainText(
      "3 דקות",
    );
    const homework = page.locator(".lesson-summary .lesson-homework-card");
    await expect(homework).toBeVisible();
    const contrast = await homework.evaluate((card) => {
      const luminance = (color: string) => {
        const rgb = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const background = luminance(getComputedStyle(card).backgroundColor);
      const foreground = luminance(
        getComputedStyle(card.querySelector("small")!).color,
      );
      return (
        (Math.max(background, foreground) + 0.05) /
        (Math.min(background, foreground) + 0.05)
      );
    });
    expect(
      contrast,
      "homework helper text must be readable on the canonical green card",
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/lesson-summary-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(errors).toEqual([]);
  });
