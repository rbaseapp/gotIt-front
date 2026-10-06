import { expect, test } from "@playwright/test";
import { figmaFixtures } from "./figma-fixtures";
import { courseWithPlan } from "../course-fixtures";
import he from "../../src/locales/he/translation.json" with { type: "json" };

const ownerKey =
  "gotit.selectedProgram.v1.22222222-2222-4222-8222-222222222222.11111111-1111-4111-8111-111111111111";
const packId = "d3000000-0000-4000-8000-000000000001";
const personalItem = "33333333-3333-4333-8333-333333333333";
const sessionId = "22222222-2222-4222-8222-222222222222";

for (const width of [390, 1440])
  for (const program of ["prepared", "uninstalled", "personal"] as const)
    test(`vocabulary and the latest ${program} program have independent smart scopes at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await figmaFixtures(page, "he");
      const course = courseWithPlan(true);
      course.preferences.targetLanguageCode = "ar";
      const chosen = program === "personal" ? course.id : "english-path";
      await page.addInitScript(
        ({ ownerKey, chosen }) => {
          if (!localStorage.getItem(ownerKey)) {
            localStorage.setItem(ownerKey, chosen);
            localStorage.setItem(ownerKey + ".language", "fr");
          }
        },
        { ownerKey, chosen },
      );
      const pack = {
        id: packId,
        slug: "daily-english-basic-01-en-he",
        title: "Current program unit",
        description: "",
        moduleNumber: 1,
        version: 1,
        wordCount: 1,
        installed: program !== "uninstalled",
        installedVersion: program === "uninstalled" ? null : 1,
        topic: {
          id: packId,
          slug: "english-learning-path-en-he",
          title: "English",
        },
        track: {
          id: packId,
          slug: "basic",
          title: "Basic",
          levelCode: "beginner",
          cefrFrom: "A1",
          cefrTo: "A2",
          sourceLanguageCode: "en",
          translationLanguageCode: "he",
        },
        progress: {
          linked: 0,
          new: 0,
          learning: 0,
          reviewing: 0,
          mastered: 0,
          known: 0,
          completed: 0,
          introduced: 0,
          due: 0,
        },
        teacherStations: [],
      };
      const inputs: Record<string, unknown>[] = [];
      let currentInput: Record<string, unknown> = {};
      await page.route("**/api/v1/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const method = route.request().method();
        if (path.endsWith("/billing/status")) {
          return route.fulfill({
            json: {
              tier: "paid",
              access: true,
              plan: { key: "paid", name: "Paid", kind: "paid" },
              entitlements: ["practice.play", "vocabulary.write"],
              subscription: null,
              trial: null,
            },
          });
        }
        if (path.endsWith("/courses"))
          return route.fulfill({
            json: { courses: [course], homework: [], available: true },
          });
        if (path.endsWith("/word-packs"))
          return route.fulfill({ json: { packs: [pack] } });
        if (path.endsWith(`/word-packs/${packId}`))
          return route.fulfill({
            json: {
              pack,
              entries: [
                {
                  id: personalItem,
                  sourceText: "I",
                  translationText: "אני",
                  itemType: "word",
                  partOfSpeech: null,
                  exampleText: null,
                  learningItemId: null,
                  excludedAt: null,
                  known: false,
                },
              ],
            },
          });
        if (path.endsWith(`/word-packs/${packId}/add`)) {
          pack.installed = true;
          pack.installedVersion = 1;
          return route.fulfill({
            json: {
              packId,
              added: 1,
              linkedExisting: 0,
              restored: 0,
              excluded: 0,
              total: 1,
            },
          });
        }
        if (
          path.includes(`/courses/${course.id}/units/`) &&
          path.endsWith("/words")
        )
          return route.fulfill({
            json: {
              title: "Arabic unit",
              unitKey: course.nextLesson!.unitKey,
              targetLanguageCode: "ar",
              supportLanguageCode: "he",
              words: [
                {
                  sourceText: "مرحبا",
                  choices: [{ id: personalItem, translationText: "שלום" }],
                },
              ],
            },
          });
        if (path.endsWith("/practice/sessions") && method === "POST") {
          currentInput = route.request().postDataJSON();
          inputs.push(currentInput);
          return route.fulfill({
            json: {
              session: {
                id: sessionId,
                sessionType: "smart_review",
                status: "active",
                startedAt: "2026-10-07T00:00:00.000Z",
                endedAt: null,
                durationSeconds: null,
                itemCount: 1,
                attemptCount: 0,
                correctCount: 0,
                xpEarned: 0,
                algorithmVersion: "fixture",
                ...(currentInput.scope
                  ? {
                      scope: {
                        ...(currentInput.scope as object),
                        title: pack.title,
                      },
                    }
                  : {}),
              },
            },
          });
        }
        if (path.endsWith(`/practice/sessions/${sessionId}/study`)) {
          const word = currentInput.scope
            ? "I"
            : currentInput.learningItemIds
              ? "مرحبا"
              : "bonjour";
          return route.fulfill({
            json: {
              cards: [
                {
                  learningItemId: personalItem,
                  sourceText: word,
                  translationText: "שלום",
                  sourceLanguageCode: currentInput.sourceLanguageCode,
                  translationLanguageCode: "he",
                  context: null,
                  audioUrl: null,
                },
              ],
            },
          });
        }
        if (path.includes("/study/") && path.endsWith("/image"))
          return route.fulfill({ json: { image: null } });
        if (path.endsWith("/practice/sessions") && method === "GET")
          return route.fulfill({ json: { items: [], nextCursor: null } });
        return route.fallback();
      });
      await page.goto("/dashboard");
      const vocabulary = page.getByRole("link", {
        name: he.ux.vocabularyReview,
        exact: true,
      });
      const programButton = page.getByRole("link", {
        name: he.ux.programSmartReview,
        exact: true,
      });
      await expect(programButton).toHaveAttribute("aria-disabled", "false");
      const libraryUrl = new URL(
        (await vocabulary.getAttribute("href"))!,
        "http://local.test",
      );
      expect(libraryUrl.searchParams.has("pack")).toBe(false);
      expect(libraryUrl.searchParams.has("items")).toBe(false);
      await page.screenshot({
        path: info.outputPath(`two-practice-scopes-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      await vocabulary.click();
      await page
        .getByRole("link", { name: he.smartUi.start, exact: true })
        .click();
      await expect(page.locator(".memorization-copy h1")).toHaveText("bonjour");
      expect(inputs[0]).toMatchObject({
        sessionType: "smart_review",
        sourceLanguageCode: "fr",
      });
      expect(inputs[0]).not.toHaveProperty("scope");
      expect(inputs[0]).not.toHaveProperty("learningItemIds");

      await page.goto("/dashboard");
      await expect(programButton).toHaveAttribute("aria-disabled", "false");
      await programButton.click();
      await expect(page.locator(".memorization-copy h1")).toHaveText(
        program === "personal" ? "مرحبا" : "I",
      );
      await expect(
        page.locator(".session-launch, .ux-smart-ready, .ux-game-hub"),
      ).toHaveCount(0);
      expect(inputs).toHaveLength(2);
      if (program === "personal") {
        expect(inputs[1]).toMatchObject({
          sessionType: "smart_review",
          sourceLanguageCode: "ar",
          learningItemIds: [personalItem],
        });
        expect(inputs[1]).not.toHaveProperty("scope");
        await page.goto(
          `/courses/${course.id}/units/${course.nextLesson!.unitKey}/words`,
        );
        await expect(page.locator(".course-word-choice input")).toBeChecked();
        await page
          .getByRole("link", { name: he.dashboard.smartPractice, exact: true })
          .click();
        await expect(page.locator(".memorization-copy h1")).toHaveText("مرحبا");
        expect(inputs[2]).toMatchObject({
          sessionType: "smart_review",
          sourceLanguageCode: "ar",
          learningItemIds: [personalItem],
        });
      } else {
        expect(inputs[1]).toMatchObject({
          sessionType: "smart_review",
          sourceLanguageCode: "en",
          scope: { type: "pack", id: packId },
        });
        expect(inputs[1]).not.toHaveProperty("learningItemIds");
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    });
