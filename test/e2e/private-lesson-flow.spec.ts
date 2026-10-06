import { expect, test } from "@playwright/test";

const event = (instructions: string) => ({
  type: "response.create",
  response: { instructions },
});
const preferences = {
  supportLanguageCode: "he",
  lessonMode: "standard",
  requestedDurationMinutes: 5,
  teacherVoice: "female",
  speechRate: "normal",
  focusAreas: ["grammar"],
  customFocus: null,
  correctionMode: "deep_explanation",
  vocabularyMode: "none",
};
const session = {
  lesson: {
    ...preferences,
    id: "11111111-1111-4111-8111-111111111111",
    targetLanguageCode: "en",
    durationSeconds: 300,
    wrapUpAfterSeconds: 280,
    level: "B1",
    topic: "Daily routines",
    grammarFocus: "Present simple",
    continuesFromLessonId: null,
    targetWords: [],
  },
  realtime: {
    clientSecret: "fixture-secret",
    expiresAt: null,
    model: "fixture-realtime",
    connectionUrl: "https://api.openai.com/v1/realtime/calls",
    openingEvent: event("Opening"),
    continuationEvent: event("Continue"),
    wrapUpEvent: event("Wrap"),
    translationEvent: event("Translate"),
  },
};

for (const language of ["he", "en"])
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1440, height: 1000 },
  ]) {
    test(`${language} ${viewport.width} lesson resumes quietly without overflowing`, async ({
      page,
    }) => {
      // This case advances 76 seconds of provider/idle timers and captures
      // three screenshots. Allow that work under the two-worker CI load.
      test.setTimeout(60_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize(viewport);
      await page.clock.install();
      await page.addInitScript((locale) => {
        localStorage.removeItem("gotit.mode");
        localStorage.setItem("gotit.uiLocale.v1", locale);
        sessionStorage.setItem("gotit.refresh", "fixture-refresh");
        // Exercise the real connection adapter using deterministic provider events.
        // No microphone permission, provider traffic or generated voice is involved.
        const track = { enabled: true, readyState: "live", stop() {} };
        navigator.mediaDevices.getUserMedia = async () =>
          ({
            getTracks: () => [track],
            getAudioTracks: () => [track],
          }) as unknown as MediaStream;
        class Channel extends EventTarget {
          readyState = "connecting";
          count = 0;
          send(raw: string) {
            const message = JSON.parse(raw);
            if (message.type !== "response.create") return;
            this.count++;
            document.documentElement.dataset.lessonResponses = String(
              this.count,
            );
            queueMicrotask(() => {
              this.emit({ type: "response.created" });
              this.emit({ type: "output_audio_buffer.started" });
              this.emit({
                type: "response.output_audio_transcript.done",
                transcript: [
                  "We use the present simple for habits: I walk to work; she walks to work. Which sentence uses she correctly?",
                  "With she, add s to walk. Would you choose she walk or she walks?",
                  "Try completing this habit: every morning, she ... to work. What is the missing word?",
                ][Math.min(this.count - 1, 2)],
              });
              this.emit({
                type: "response.done",
                response: { status: "completed" },
              });
              // Keep the opening audio playing until the test releases it.
              if (this.count > 1)
                this.emit({ type: "output_audio_buffer.stopped" });
            });
          }
          emit(event: unknown) {
            this.dispatchEvent(
              new MessageEvent("message", { data: JSON.stringify(event) }),
            );
          }
          close() {
            this.readyState = "closed";
          }
        }
        class Peer {
          channel = new Channel();
          createDataChannel() {
            return this.channel;
          }
          addTrack() {}
          addEventListener() {}
          async createOffer() {
            return { type: "offer", sdp: "fixture-sdp" };
          }
          async setLocalDescription() {}
          async setRemoteDescription() {
            this.channel.readyState = "open";
            window.addEventListener("lesson-test-playback-end", () =>
              this.channel.emit({ type: "output_audio_buffer.stopped" }),
            );
            queueMicrotask(() => this.channel.dispatchEvent(new Event("open")));
          }
          close() {
            this.channel.close();
          }
        }
        Object.defineProperty(window, "RTCPeerConnection", { value: Peer });
      }, language);
      await page.route("https://api.openai.com/v1/realtime/calls", (route) =>
        route.fulfill({ body: "fixture-answer" }),
      );
      await page.route("**/api/v1/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const payload = path.endsWith("/auth/refresh")
          ? {
              accessToken: "fixture-access",
              refreshToken: "fixture-refresh",
              expiresIn: 3600,
            }
          : path.endsWith("/auth/me")
            ? {
                user: {
                  id: session.lesson.id,
                  applicationId: session.lesson.id,
                  email: "learner@example.test",
                  emailVerified: true,
                  status: "active",
                  role: "user",
                },
              }
            : path.endsWith("/profile")
              ? {
                  profile: {
                    defaultSourceLanguage: "en",
                    defaultTranslationLanguage: "he",
                    timezone: "Asia/Jerusalem",
                    dailyGoal: { type: "minutes", value: 10 },
                    defaultNewItemsPerDay: 5,
                    translationMethodPreference: "auto",
                    languages: [
                      { languageCode: "en", selfAssessedLevel: "B1" },
                    ],
                    interests: [],
                  },
                }
              : path.endsWith("/billing/status")
                ? {
                    tier: "paid",
                    access: true,
                    plan: { key: "paid", name: "Paid", kind: "paid" },
                    entitlements: ["practice.play"],
                    subscription: null,
                    trial: null,
                  }
                : path.endsWith("/private-lessons/setup")
                  ? {
                      preferences,
                      roadmap: null,
                      curriculum: {
                        recommended: {
                          goalKind: "grammar",
                          goalKey: "present-simple-continuous",
                          reason: "Continue learning",
                        },
                        grammarTopics: [],
                        communicationGoals: [],
                      },
                    }
                  : path.endsWith("/private-lessons/realtime-sessions")
                    ? session
                    : path.endsWith("/private-lessons")
                      ? { lessons: [] }
                      : null;
        await route.fulfill(
          payload
            ? { json: payload }
            : {
                status: 404,
                json: { error: { code: "TEST_UNHANDLED_ROUTE" } },
              },
        );
      });
      await page.goto("/private-lesson?practice=free");
      await expect(page.locator(".sidebar")).not.toBeVisible();
      const ready = await page.locator(".lesson-ready-card").boundingBox();
      const preferencesBox = await page
        .locator(".lesson-preferences-card")
        .boundingBox();
      expect((ready?.y ?? 0) + (ready?.height ?? 0)).toBeLessThan(
        preferencesBox?.y ?? 0,
      );
      await page.screenshot({
        path: `test-results/lesson-prep-${language}-${viewport.width}.png`,
        animations: "disabled",
      });
      await page
        .getByRole("button", {
          name: language === "he" ? "התחלת השיעור" : "Start lesson",
          exact: true,
        })
        .click();
      await expect(page.locator("html")).toHaveAttribute(
        "data-lesson-responses",
        "1",
      );
      await page.clock.runFor(30_000);
      await expect(page.locator("html")).toHaveAttribute(
        "data-lesson-responses",
        "1",
      );
      await page.evaluate(() =>
        window.dispatchEvent(new Event("lesson-test-playback-end")),
      );
      await page.clock.runFor(46_000);
      await expect(page.locator("html")).toHaveAttribute(
        "data-lesson-responses",
        "3",
      );
      const resume = page.getByRole("button", {
        name: language === "he" ? "נמשיך בשיעור" : "Continue the lesson",
        exact: true,
      });
      await expect(resume).toBeVisible();
      await expect(resume).toBeInViewport();
      await page.locator(".lesson-current-message").scrollIntoViewIfNeeded();
      await expect(page.locator(".lesson-current-message > p")).toBeInViewport({
        ratio: 1,
      });
      await expect(
        page.locator(".lesson-transcript-details"),
      ).not.toHaveAttribute("open");
      const layout = await page.evaluate(() => {
        const boxes = [
          ".private-lesson-session-header",
          ".private-lesson-words",
          ".private-lesson-tutor-stage",
          ".lesson-current-message",
          ".private-lesson-actions",
        ].map((selector) =>
          document.querySelector(selector)!.getBoundingClientRect(),
        );
        return {
          contained: boxes.every(
            (box) =>
              box.left >= -1 && box.right <= innerWidth + 1 && box.width > 0,
          ),
          scrollable:
            getComputedStyle(document.querySelector(".private-lesson-session")!)
              .overflowY === "auto",
        };
      });
      expect(layout).toEqual({ contained: true, scrollable: true });
      if (viewport.width === 1440) {
        const sessionBox = await page
          .locator(".private-lesson-session")
          .boundingBox();
        expect(sessionBox?.width).toBe(
          await page.evaluate(() => document.documentElement.clientWidth),
        );
        const portrait = await page
          .locator(".private-lesson-tutor-stage .teacher-avatar")
          .boundingBox();
        expect(portrait?.width).toBe(204);
        await expect(
          page.locator(".private-lesson-tutor-stage .teacher-avatar-level"),
        ).not.toBeVisible();
        await expect(page.locator(".lesson-current-message")).toHaveCSS(
          "background-color",
          "rgb(255, 255, 255)",
        );
        const bubble = await page
          .locator(".lesson-current-message")
          .boundingBox();
        expect(Math.abs((bubble?.y ?? 0) - (portrait?.y ?? 0))).toBeLessThan(
          60,
        );
        const mic = await page
          .locator(".private-lesson-actions .private-lesson-mute")
          .boundingBox();
        expect(
          Math.abs((mic?.x ?? 0) + (mic?.width ?? 0) / 2 - viewport.width / 2),
        ).toBeLessThan(2);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/lesson-resume-${language}-${viewport.width}.png`,
      });
      await resume.click();
      await expect(page.locator("html")).toHaveAttribute(
        "data-lesson-responses",
        "4",
      );
      expect(errors).toEqual([]);
    });
  }
