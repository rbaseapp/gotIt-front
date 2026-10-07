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
async function fixture(
  page: Page,
  options: {
    allowMicrophone?: boolean;
    conversation?: boolean;
    legacy?: boolean;
  } = {},
) {
  const commands: Array<Record<string, unknown>> = [];
  await page.addInitScript(({ allowMicrophone, legacy }) => {
    localStorage.removeItem("gotit.mode");
    localStorage.setItem("gotit.uiLocale.v1", "he");
    sessionStorage.setItem("gotit.refresh", "fixture-refresh");
    let microphoneCaptures = 0;
    Object.defineProperty(window, "gotitTestMicrophoneCaptures", {
      get: () => microphoneCaptures,
    });
    navigator.mediaDevices.getUserMedia = async () => {
      microphoneCaptures += 1;
      if (!allowMicrophone) throw new DOMException("Denied", "NotAllowedError");
      const track = {
        enabled: true,
        readyState: "live",
        stop() {
          this.readyState = "ended";
        },
      };
      Reflect.set(window, "gotitTestTrack", track);
      return {
        getTracks: () => [track],
        getAudioTracks: () => [track],
      } as unknown as MediaStream;
    };
    class Channel extends EventTarget {
      readyState = "connecting";
      send(raw: string) {
        const event = JSON.parse(raw);
        if (event.type === "conversation.item.create") {
          queueMicrotask(() =>
            this.dispatchEvent(
              new MessageEvent("message", {
                data: JSON.stringify({
                  type: "conversation.item.added",
                  item: event.item,
                }),
              }),
            ),
          );
          return;
        }
        if (event.type !== "response.create") return;
        queueMicrotask(() => {
          for (const event of [
            { type: "response.created" },
            ...(legacy
              ? [
                  {
                    type: "response.output_audio_transcript.done",
                    transcript:
                      "Try using the present continuous for a temporary situation.",
                  },
                ]
              : []),
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
      addTrack() {
        return { replaceTrack: async () => {} };
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
  }, options);
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
        ...(options.legacy
          ? {}
          : {
              interactionCapabilities: {
                guidedTasks: true,
                textAnswers: true,
                billingPause: false,
              },
            }),
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
          introduced: 6,
          teacherStations: [
            {
              station: "supported",
              requiredWords: 6,
              durationMinutes: 5,
              available: true,
            },
          ],
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
      payload = {
        ...guidedSession,
        lesson,
        activity: options.legacy
          ? null
          : {
              ...activity,
              interactionMode: options.conversation ? "conversation" : "guided",
            },
      };
    else if (path.endsWith("/realtime/connect")) {
      await route.fulfill({ body: "fixture-answer" });
      return;
    } else if (path.endsWith("/private-lessons")) payload = { lessons: [] };
    else if (path.endsWith("/complete")) {
      if (options.legacy) commands.push(route.request().postDataJSON());
      payload = { lesson: guidedReport };
    } else if (path.endsWith(`/courses/homework/${id}`))
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
      .getByRole("button", {
        name: he.lessonPrep.startWithTeacher,
        exact: true,
      })
      .click();
    await expect(page.locator(".lesson-session")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() =>
        Reflect.get(window, "gotitTestMicrophoneCaptures"),
      ),
    ).toBe(0);
    const portrait = await page
      .locator(".lesson-room .teacher-avatar")
      .boundingBox();
    expect(portrait?.width).toBe(width === 1487 ? 300 : 52);
    await expect(page.locator(".lesson-room-topic h1")).toHaveCSS(
      "font-size",
      width === 1487 ? "24px" : "18px",
    );
    const composer = await page.locator(".lesson-room-composer").boundingBox();
    expect(composer!.y + composer!.height).toBeLessThanOrEqual(
      width === 1487 ? 1058 : 844,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/guided-lesson-${width}.png`,
      animations: "disabled",
    });
    await page.getByLabel(he.lessonUi.yourAnswer).fill("I want tea.");
    await page
      .getByRole("button", { name: he.lessonUi.send, exact: true })
      .click();
    await expect(page.getByLabel(he.lessonUi.yourAnswer)).toHaveValue(
      "I want tea.",
    );
    await expect(
      page.locator(".lesson-room-composer .form-error"),
    ).toBeVisible();
    await page
      .getByRole("button", { name: he.lessonUi.send, exact: true })
      .click();
    await expect(
      page
        .locator(".lesson-room-turn.tutor > p:not(.lesson-room-question)")
        .last(),
    ).toHaveText("יפה, ננסה בקשה חדשה.");
    expect(commands).toHaveLength(2);
    expect(commands[1]).toEqual(commands[0]);
    await page.locator(".lesson-room-exit").click();
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

test("input mode fallback preserves draft when microphone is denied and composer fits a keyboard-sized viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.goto(`/private-lesson?pack=${id}`);
  await page.getByLabel(he.lessonUi.answerMode).selectOption("text");
  await page
    .getByRole("button", { name: he.lessonPrep.startWithTeacher, exact: true })
    .click();
  const answer = page.getByLabel(he.lessonUi.yourAnswer);
  await answer.fill("A draft I want to keep.");
  await page
    .getByRole("button", { name: he.lessonRoom.voice, exact: true })
    .click();
  await expect(page.locator(".lesson-room-composer .form-error")).toBeVisible();
  await expect(answer).toHaveValue("A draft I want to keep.");
  expect(
    await page.evaluate(() =>
      Reflect.get(window, "gotitTestMicrophoneCaptures"),
    ),
  ).toBe(1);
  await page.setViewportSize({ width: 390, height: 430 });
  const composer = await page.locator(".lesson-room-composer").boundingBox();
  expect(composer!.y + composer!.height).toBeLessThanOrEqual(430);
  await expect(
    page.getByRole("button", { name: he.lessonUi.send, exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/lesson-room-keyboard.png",
    animations: "disabled",
  });
});

test("conversation lesson switches voice to writing, mutes the actual track, preserves drafts and resumes voice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await fixture(page, { allowMicrophone: true, conversation: true });
  await page.goto(`/private-lesson?pack=${id}`);
  await page
    .getByRole("button", { name: he.lessonPrep.startWithTeacher, exact: true })
    .click();
  await expect(page.locator(".lesson-room-voice")).toBeVisible();
  await expect(page.locator(".lesson-room-stages")).toHaveCount(0);
  await page
    .getByRole("button", { name: he.lessonUi.speak, exact: true })
    .click();
  expect(
    await page.evaluate(() => Reflect.get(window, "gotitTestTrack").enabled),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/lesson-room-voice.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: he.lessonUi.answerText, exact: true })
    .click();
  expect(
    await page.evaluate(() => Reflect.get(window, "gotitTestTrack").enabled),
  ).toBe(false);
  const answer = page.getByLabel(he.lessonUi.yourAnswer);
  await answer.fill("Keep my draft between modes.");
  await page
    .getByRole("button", { name: he.lessonRoom.voice, exact: true })
    .click();
  await expect(page.locator(".lesson-room-voice.recording")).toBeVisible();
  expect(
    await page.evaluate(() => Reflect.get(window, "gotitTestTrack").enabled),
  ).toBe(true);
  await page
    .getByRole("button", { name: he.lessonUi.stopSpeaking, exact: true })
    .click();
  expect(
    await page.evaluate(() => Reflect.get(window, "gotitTestTrack").enabled),
  ).toBe(false);
  await page
    .getByRole("button", { name: he.lessonUi.answerText, exact: true })
    .click();
  await expect(answer).toHaveValue("Keep my draft between modes.");
  expect(
    await page.evaluate(() =>
      Reflect.get(window, "gotitTestMicrophoneCaptures"),
    ),
  ).toBe(1);
});

test("deployed legacy session accepts a written answer without microphone and saves it in the report", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const commands = await fixture(page, { legacy: true });
  await page.goto(`/private-lesson?pack=${id}`);
  await page.getByLabel(he.lessonUi.answerMode).selectOption("text");
  await page
    .getByRole("button", { name: he.lessonPrep.startWithTeacher, exact: true })
    .click();
  const answer = page.getByLabel(he.lessonUi.yourAnswer);
  await answer.fill("I am working from home this week.");
  await answer.press("Enter");
  await expect(answer).toHaveValue("");
  await expect(page.locator(".lesson-room-turn.learner")).toHaveText(
    new RegExp("I am working from home this week"),
  );
  expect(
    await page.evaluate(() =>
      Reflect.get(window, "gotitTestMicrophoneCaptures"),
    ),
  ).toBe(0);
  await page.locator(".lesson-room-exit").click();
  await page
    .getByRole("button", { name: he.lessonUi.finishAndSave, exact: true })
    .click();
  await expect(page.locator(".lesson-summary")).toBeVisible({ timeout: 15000 });
  expect(commands).toHaveLength(1);
  expect(commands[0].turns).toContainEqual({
    role: "learner",
    text: "I am working from home this week.",
  });
});
