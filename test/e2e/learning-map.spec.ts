import { test, expect, type Page } from "@playwright/test";
import { figmaFixtures } from "./figma-fixtures";
import he from "../../src/locales/he/translation.json" with { type: "json" };
import { fixtureHomework } from "../course-fixtures";
const packId = "d3000000-0000-4000-8000-000000000001";
test("follow-up is prepared inline only after disclosure and a retry reuses its command", async ({
  page,
}) => {
  const pack = await pathFixture(page, 26, 1);
  const pending = {
    ...fixtureHomework,
    courseId: null,
    packId,
    station: "midpoint",
    status: "pending",
    tasks: [],
    taskCount: 0,
    completedCount: 0,
  };
  const commands: Array<{ eventId: string }> = [];
  await page.route("**/private-lessons/units/*/map", (route) =>
    route.fulfill({
      json: {
        path: {
          packId,
          words: [],
          stations: pack.teacherStations.map((station, index) => ({
            ...station,
            available: index < 2,
            meetingCompleted: index < 2,
            preparationComplete: index === 0,
            lessonId: index < 2 ? pending.lessonId : null,
            homework: index === 1 ? pending : null,
            lockReason: index < 2 ? null : "previous_preparation",
          })),
          nextAction: {
            kind: "homework",
            station: "midpoint",
            homeworkId: pending.id,
          },
        },
      },
    }),
  );
  await page.route("**/courses/homework/*/prepare", (route) => {
    commands.push(route.request().postDataJSON());
    return commands.length === 1
      ? route.fulfill({
          status: 400,
          json: {
            error: { code: "TEST_PREPARE_FAILED", message: "Try again" },
          },
        })
      : route.fulfill({
          json: {
            homework: {
              ...fixtureHomework,
              revision: 1,
              packId,
              courseId: null,
            },
          },
        });
  });
  await page.goto(`/english-learning?unit=${packId}`);
  await expect(page.locator(".unit-teacher-station h3")).toHaveText(
    he.unitMap.followUp,
  );
  expect(commands).toHaveLength(0);
  await page.getByRole("button", { name: he.unitMap.toggleExercises }).click();
  await expect(
    page.locator(".unit-activity-detail [role=alert]"),
  ).toBeVisible();
  await page
    .locator(".unit-activity-detail")
    .getByRole("button", { name: he.common.retry })
    .click();
  await expect(page.locator(".unit-follow-up-list > li")).toHaveCount(2);
  expect(commands).toHaveLength(2);
  expect(commands[0]!.eventId).toBe(commands[1]!.eventId);
  await expect(page).toHaveURL(/english-learning/);
});
test("words and follow-up disclosures stay closed, preserve entry actions and lock practice before a meeting", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1487, height: 1058 });
  await pathFixture(page, 26, 1);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/english-learning?unit=${packId}`);
  await expect(page.locator(".unit-activity-detail")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("approved-map-closed.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: he.unitMap.toggleWords }).click();
  await expect(page.locator(".unit-stage-words li")).toHaveCount(6);
  await expect(page).toHaveURL(/english-learning/);
  await page.getByRole("button", { name: he.unitMap.toggleExercises }).click();
  await expect(page.locator(".unit-practice-gate")).toHaveText(
    he.unitMap.practiceAfterMeeting,
  );
  await expect(page.locator(".unit-follow-up-list")).toHaveCount(0);
  await expect(
    page.locator(".unit-upcoming-row .unit-entry").last(),
  ).toHaveAttribute("href", /station=midpoint/);
  await expect(
    page.locator(".unit-upcoming-row .unit-entry").first(),
  ).toBeEnabled();
  await page.screenshot({
    path: info.outputPath("map-before-meeting-expanded.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await page.locator(".unit-upcoming-row .unit-entry").first().click();
  await expect(page.locator(".unit-browser-list")).toBeVisible();
});
for (const width of [320, 1487])
  test(`completed/current/future homework stays compact and routes to its own task at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1058 });
    const pack = await pathFixture(page, 26, 1);
    const homework = {
      ...fixtureHomework,
      courseId: null,
      packId,
      station: "midpoint",
      taskCount: 3,
      completedCount: 1,
      tasks: [
        { ...fixtureHomework.tasks[0], done: true },
        fixtureHomework.tasks[1],
        { ...fixtureHomework.tasks[1], objective: "תרגול המשך" },
      ],
    };
    await page.route("**/private-lessons/units/*/map", (route) =>
      route.fulfill({
        json: {
          path: {
            packId,
            words: [
              {
                sourceText: "today",
                translationText: "היום",
                exampleText: null,
                introduced: true,
              },
            ],
            stations: pack.teacherStations.map((station, index) => ({
              ...station,
              available: index < 2,
              meetingCompleted: index < 2,
              preparationComplete: index === 0,
              lessonId: index < 2 ? homework.lessonId : null,
              homework: index === 1 ? homework : null,
              lockReason: index < 2 ? null : "previous_preparation",
            })),
            nextAction: {
              kind: "homework",
              station: "midpoint",
              homeworkId: homework.id,
            },
          },
        },
      }),
    );
    await page.route("**/courses/homework/*", (route) =>
      route.fulfill({ json: { homework } }),
    );
    await page.goto(`/english-learning?unit=${packId}`);
    await expect(page.locator(".unit-teacher-station h3")).toHaveText(
      he.unitMap.followUp,
    );
    await expect(page.locator(".unit-follow-up-list")).toHaveCount(0);
    await page
      .getByRole("button", { name: he.unitMap.toggleExercises })
      .click();
    await page.getByRole("button", { name: he.unitMap.toggleWords }).click();
    await expect(page.locator(".unit-follow-up-list > li")).toHaveCount(3);
    await expect(
      page.locator(".unit-follow-up-list .is-completed a"),
    ).toHaveAttribute("href", /task=0&review=1/);
    await expect(
      page.locator(".unit-follow-up-list .is-available a"),
    ).toHaveAttribute("href", /task=1/);
    await expect(
      page.locator(
        ".unit-follow-up-list .is-locked a,.unit-follow-up-list .is-locked button",
      ),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: info.outputPath(`map-after-meeting-${width}.png`),
      fullPage: true,
    });
    await page.locator(".unit-follow-up-list .is-available a").click();
    await expect(page).toHaveURL(/homework.*task=1/);
    await expect(page.locator(".homework-task-card h2")).toHaveText(
      homework.tasks[1]!.prompt,
    );
    await expect(
      page.getByRole("link", { name: he.unitMap.backToMap }),
    ).toHaveAttribute("href", `/english-learning?unit=${packId}`);
  });
test("high word counts cannot skip meetings, and a failed map request disables teacher entry", async ({
  page,
}) => {
  await pathFixture(page, 50);
  await page.goto(`/english-learning?unit=${packId}`);
  await expect(
    page.locator(".unit-upcoming-row .unit-entry").last(),
  ).toHaveAttribute("href", /station=supported/);
  await page.route("**/private-lessons/units/*/map", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "TEST_FAILURE", message: "Please try again" } },
    }),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.locator(".unit-upcoming-row .unit-entry").last(),
  ).toBeDisabled();
  await expect(
    page.locator('.unit-roadmap-card a[href*="private-lesson"]'),
  ).toHaveCount(0);
});
async function pathFixture(page: Page, introduced = 0, preparedMeetings = 0) {
  await figmaFixtures(page, "he");
  const pack = {
    id: packId,
    slug: "daily-english-basic-01-en-he",
    title: "יחידה 1 · מילים ראשונות",
    description: "",
    moduleNumber: 1,
    version: 1,
    wordCount: 50,
    installed: false,
    installedVersion: null,
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
      known: introduced,
      completed: introduced,
      introduced,
      due: 0,
    },
    teacherStations: [
      {
        station: "supported",
        requiredWords: 10,
        durationMinutes: 5,
        available: introduced >= 10,
      },
      {
        station: "midpoint",
        requiredWords: 25,
        durationMinutes: 5,
        available: introduced >= 25,
      },
      {
        station: "review",
        requiredWords: 50,
        durationMinutes: 10,
        available: introduced >= 50,
      },
    ],
  };
  const entries = [
    "water",
    "coffee",
    "please",
    "want",
    "need",
    "help",
    ...Array.from({ length: 44 }, (_, i) => `word ${i + 7}`),
  ].map((sourceText, i) => ({
    id: `11111111-1111-4111-8111-${String(i + 1).padStart(12, "0")}`,
    sourceText,
    translationText:
      ["מים", "קפה", "בבקשה", "רוצה", "צריך", "עזרה"][i] ?? "מילה",
    itemType: "word",
    partOfSpeech: null,
    exampleText: i === 0 ? "Water, please." : null,
    learningItemId: null,
    excludedAt: null,
    known: false,
  }));
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (/\/private-lessons\/units\/[^/]+\/map$/.test(path))
      return route.fulfill({
        json: {
          path: {
            packId: path.split("/").at(-2),
            words: entries
              .slice(0, 6)
              .map((entry) => ({ ...entry, introduced: introduced > 0 })),
            stations: pack.teacherStations.map((station, index) => ({
              ...station,
              available: station.available && index <= preparedMeetings,
              meetingCompleted: index < preparedMeetings,
              preparationComplete: index < preparedMeetings,
              lessonId:
                index < preparedMeetings ? fixtureHomework.lessonId : null,
              homework:
                index < preparedMeetings
                  ? {
                      ...fixtureHomework,
                      status: "completed",
                      completedCount: 2,
                      tasks: fixtureHomework.tasks.map((task) => ({
                        ...task,
                        done: true,
                      })),
                    }
                  : null,
              lockReason:
                station.available && index <= preparedMeetings
                  ? null
                  : index > preparedMeetings
                    ? "previous_preparation"
                    : "words",
            })),
            nextAction: {
              kind: pack.teacherStations[preparedMeetings]?.available
                ? "meeting"
                : "words",
              station: pack.teacherStations[preparedMeetings]?.available
                ? pack.teacherStations[preparedMeetings]?.station
                : null,
              homeworkId: null,
            },
          },
        },
      });
    if (path.endsWith("/word-packs"))
      return route.fulfill({ json: { packs: [pack] } });
    if (path.endsWith(`/word-packs/${packId}`))
      return route.fulfill({ json: { pack, entries } });
    if (path.includes("/entries/") && path.endsWith("/image"))
      return route.fulfill({ json: { image: null } });
    if (path.endsWith("/practice/sessions"))
      return route.fulfill({
        json: { items: [], nextCursor: null, totalCount: 0 },
      });
    return route.fallback();
  });
  return pack;
}
for (const width of [320, 390, 768, 1487])
  test(`program map, full-page words, levels and activity at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1058 });
    await pathFixture(page);
    await page.goto("/courses");
    await page
      .getByRole("button", { name: he.ux.openMap, exact: true })
      .click();
    await expect(page.locator(".unit-roadmap-card")).toBeVisible();
    await expect(page.locator(".path-levels")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: he.structuredUi.allUnits, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".unit-map-selectors select")).toHaveValue(
      "beginner",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".unit-word-station")).toContainText(
      he.pathUi.firstWords,
    );
    await expect(
      page.locator('.unit-roadmap-card a[href*="/private-lesson"]'),
    ).toHaveCount(0);
    await expect(page.locator(".unit-upcoming-row")).toHaveCount(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    await page.screenshot({
      path: info.outputPath(`map-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: he.structuredUi.words, exact: true })
      .first()
      .click();
    await expect(page.locator(".unit-browser-list")).toBeVisible();
    await page
      .locator(".unit-browser-row")
      .nth(1)
      .locator("button")
      .first()
      .click();
    await expect(page.locator(".unit-word-detail h2")).toHaveText("coffee");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`words-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: he.structuredUi.map, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".unit-browser-list")).toHaveCount(0);
    await page
      .getByRole("button", { name: he.structuredUi.allUnits, exact: true })
      .click();
    await expect(page.locator(".path-level-tabs")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: he.structuredUi.allUnits,
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".path-level-featured")).toBeVisible();
    await expect(page.locator(".unit-roadmap-card")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    await expect(page.locator(".path-level-tabs > button")).toHaveCount(3);
    await expect(
      page.locator(".path-level-tabs > button").first(),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByPlaceholder(he.pathUi.searchUnits).fill("אין יחידה");
    await expect(page.locator(".path-unit-row")).toHaveCount(0);
    await page.getByPlaceholder(he.pathUi.searchUnits).fill("");
    await page.screenshot({
      path: info.outputPath(`levels-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.locator(".path-unit-row").first().click();
    await expect(page.locator(".path-level-featured")).toBeVisible();
    await expect(page.locator(".unit-roadmap-card")).toHaveCount(0);
    await page
      .getByRole("button", { name: he.pathUi.continueUnit, exact: true })
      .click();
    await expect(page.locator(".unit-roadmap-card")).toBeVisible();
    await page
      .getByRole("button", { name: he.structuredUi.activities, exact: true })
      .click();
    await expect(page.locator(".unit-activity-browser")).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`activities-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
  });
test("the current level and unit open automatically after completing the beginner level", async ({
  page,
}) => {
  const base = await pathFixture(page);
  const beginner = {
    ...base,
    progress: { ...base.progress, completed: base.wordCount },
  };
  const intermediate = {
    ...base,
    id: "d3000000-0000-4000-8000-000000000002",
    title: "Current intermediate unit",
    track: { ...base.track, levelCode: "intermediate" },
  };
  const advanced = {
    ...base,
    id: "d3000000-0000-4000-8000-000000000003",
    title: "Future advanced unit",
    track: { ...base.track, levelCode: "advanced" },
  };
  await page.route("**/api/v1/word-packs", (route) =>
    route.fulfill({ json: { packs: [beginner, intermediate, advanced] } }),
  );
  await page.goto("/english-learning");
  await expect(page.locator(".unit-map-selectors select")).toHaveValue(
    "intermediate",
  );
  await expect(page.locator(".unit-roadmap-heading h2")).toHaveText(
    "Current intermediate unit",
  );
  await page
    .getByRole("button", { name: he.structuredUi.allUnits, exact: true })
    .click();
  const levels = page.locator(".path-level-tabs > button");
  await expect(levels).toHaveCount(3);
  await expect(levels.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".path-unit-row[aria-current=step]")).toContainText(
    "Current intermediate unit",
  );
  await expect(page.locator(".path-level-featured h2")).toHaveText(
    "Current intermediate unit",
  );
  await expect(page.locator(".unit-map-selectors select")).toHaveCount(0);
  await levels.nth(2).click();
  await expect(page.locator(".path-unit-row")).toContainText(
    "Future advanced unit",
  );
  await expect(page.locator(".path-unit-row[aria-current=step]")).toHaveCount(
    0,
  );
});

test("unit browsing previews the selected unit without launching or recording practice", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1487, height: 1058 });
  const base = await pathFixture(page, 26, 1);
  const packs = Array.from({ length: 20 }, (_, i) => ({
    ...base,
    id:
      i === 1
        ? packId
        : `d3000000-0000-4000-8000-${String(i + 101).padStart(12, "0")}`,
    moduleNumber: i + 1,
    title: i === 1 ? "יחידה 2 · לבקש משהו ולהשיב" : `יחידה ${i + 1}`,
    progress: { ...base.progress, completed: i === 0 ? 50 : i === 1 ? 26 : 0 },
  }));
  await page.route("**/api/v1/word-packs", (route) =>
    route.fulfill({ json: { packs } }),
  );
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() !== "GET" &&
      /\/api\/v1\/(word-packs|practice)/.test(request.url())
    )
      writes.push(request.url());
  });
  await page.goto("/english-learning");
  await expect(page.locator(".unit-teacher-station h3")).toHaveText(
    he.pathUi.midpoint,
  );
  await page.screenshot({
    path: info.outputPath("map-midpoint-1487.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: he.structuredUi.allUnits, exact: true })
    .click();
  await expect(page.locator(".path-unit-row")).toHaveCount(20);
  await expect(page.locator(".path-level-featured h2")).toHaveText(
    "לבקש משהו ולהשיב",
  );
  await expect
    .poll(() =>
      page.locator(".path-artwork img").evaluateAll((images) =>
        images.flatMap((image) => {
          const img = image as HTMLImageElement;
          const rect = img.getBoundingClientRect();
          return rect.width &&
            (!img.complete ||
              !img.naturalWidth ||
              Math.abs(rect.width - img.naturalWidth) > 0.5 ||
              Math.abs(rect.height - img.naturalHeight) > 0.5)
            ? [img.getAttribute("src")]
            : [];
        }),
      ),
    )
    .toEqual([]);
  await page.screenshot({
    path: info.outputPath("levels-populated-1487.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.locator(".path-unit-row").nth(2).click();
  await expect(page.locator(".path-level-featured h2")).toHaveText("יחידה 3");
  await expect(page.locator(".path-unit-row[aria-current=step]")).toContainText(
    "יחידה 2",
  );
  await expect(page.locator(".unit-roadmap-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: he.pathUi.continueUnit, exact: true })
    .click();
  await expect(page.locator(".unit-roadmap-heading h2")).toHaveText("יחידה 3");
  expect(writes).toEqual([]);
});

test("server midpoint availability selects the correct five-minute station", async ({
  page,
}) => {
  await pathFixture(page, 25, 1);
  await page.goto("/english-learning");
  await expect(page.locator(".unit-teacher-station h3")).toHaveText(
    he.pathUi.midpoint,
  );
  await expect(page.locator(".unit-teacher-station > a")).toHaveAttribute(
    "href",
    /station=midpoint/,
  );
  await expect(
    page.locator(".unit-upcoming-row a[href*='station=midpoint']"),
  ).toHaveCount(1);
  await expect(
    page.locator(".unit-upcoming-row a[href*='tab=meetings']"),
  ).toHaveCount(0);
});
test("activity selection shows actual results and preserves resume scope", async ({
  page,
}, info) => {
  await pathFixture(page, 10);
  const base = {
    sessionType: "recall",
    status: "completed",
    startedAt: "2026-10-06T10:00:00.000Z",
    endedAt: "2026-10-06T10:05:00.000Z",
    durationSeconds: 300,
    itemCount: 5,
    attemptCount: 5,
    correctCount: 4,
    xpEarned: 32,
    algorithmVersion: "fixture",
  };
  await page.route("**/practice/sessions?**", (route) =>
    route.fulfill({
      json: {
        items: [
          { ...base, id: "22222222-2222-4222-8222-222222222222" },
          {
            ...base,
            id: "33333333-3333-4333-8333-333333333333",
            status: "active",
            startedAt: "2026-10-06T11:00:00.000Z",
            endedAt: null,
            attemptCount: 1,
            correctCount: 1,
            xpEarned: 8,
          },
        ],
        nextCursor: null,
        totalCount: 2,
      },
    }),
  );
  await page.goto(`/english-learning?unit=${packId}&tab=activities`);
  await expect(page.locator(".unit-activity-row")).toHaveCount(2);
  await expect(
    page.locator(".unit-activity-detail .button.primary"),
  ).toHaveAttribute("href", /resume=33333333.*pack=d3000000.*language=en/);
  await page.locator(".unit-activity-row").nth(1).click();
  await expect(page.locator(".unit-activity-detail")).toContainText("32");
  await expect(
    page.locator(".unit-activity-detail .button.primary"),
  ).toHaveAttribute("href", /\/learn\/session\/smart\?pack=/);
  await page.screenshot({
    path: info.outputPath("populated-activities.png"),
    fullPage: true,
  });
});
test("new program preserves chosen languages and only offers a published prepared path", async ({
  page,
}) => {
  await pathFixture(page);
  await page.goto("/courses?choose=1");
  await expect(page.locator(".new-program-page")).toBeVisible();
  await expect(
    page.getByRole("button", { name: he.pathUi.openFromZero }),
  ).toBeEnabled();
  const target = page.getByRole("combobox").first();
  await target.fill("Spanish");
  await target.press("Enter");
  await expect(
    page.getByRole("button", { name: he.pathUi.openFromZero }),
  ).toBeDisabled();
  await page
    .locator(".new-program-page")
    .getByRole("link", { name: he.ux.personalProgram, exact: true })
    .click();
  await expect(page).toHaveURL(/new=1&language=es&support=he/);
  await expect(
    page.locator(".course-language-pair").getByRole("combobox").first(),
  ).toHaveValue(/Spanish.*espa\u00f1ol/u);
});

async function meetingFixture(page: Page, introduced: number) {
  const pack = await pathFixture(page, introduced, introduced >= 50 ? 2 : 1);
  await page.route("**/private-lessons/units/*", (route) =>
    route.fulfill({
      json: {
        unit: {
          packId,
          title: "Building Your First Sentences",
          moduleNumber: 1,
          targetLanguageCode: "en",
          supportLanguageCode: "he",
          level: "A1",
          station: "supported",
          introduced,
          completed: introduced,
          total: pack.wordCount,
          teacherStations: pack.teacherStations.map((station, index) => ({
            ...station,
            available: station.available && index <= (introduced >= 50 ? 2 : 1),
            lockReason:
              station.available && index <= (introduced >= 50 ? 2 : 1)
                ? null
                : index > (introduced >= 50 ? 2 : 1)
                  ? "previous_preparation"
                  : "words",
          })),
          words: ["water", "coffee", "want"].map((sourceText) => ({
            sourceText,
            translationText: "מילה",
            exampleText: null,
            introduced: true,
          })),
        },
      },
    }),
  );
  await page.route("**/private-lessons/setup?**", (route) =>
    route.fulfill({
      json: {
        interactionCapabilities: {
          guidedTasks: true,
          textAnswers: true,
          billingPause: true,
        },
        preferences: null,
        roadmap: null,
        curriculum: {
          recommended: {
            goalKind: "grammar",
            goalKey: "fixture",
            reason: "fixture",
          },
          communicationGoals: [],
          grammarTopics: [],
        },
      },
    }),
  );
  await page.route("**/private-lesson-minutes", (route) =>
    route.fulfill({
      json: {
        secondsTotal: 2400,
        secondsUsed: 0,
        secondsRemaining: 2400,
        expiresAt: null,
      },
    }),
  );
}

for (const width of [320, 1487]) {
  test(`unlocked summary meeting opens lesson preparation at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1058 });
    await meetingFixture(page, 50);
    await page.goto(`/english-learning?unit=${packId}`);
    await page
      .getByRole("link", { name: he.pathUi.review, exact: true })
      .click();
    await expect(page).toHaveURL(/private-lesson\?pack=.*station=review/);
    await expect(
      page.getByRole("heading", { name: he.ux.readyForLesson, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".unit-lesson-prep")).toContainText(
      "40 דקות זמינות בחשבון",
    );
    await expect(page.locator(".unit-lesson-prep")).toContainText("10 דקות");
    await expect(
      page.getByRole("button", {
        name: he.lessonPrep.startWithTeacher,
        exact: true,
      }),
    ).toBeEnabled();
    await expect(page.locator(".sidebar")).not.toBeVisible();
    await expect(
      page.locator(".unit-lesson-preferences .unit-help-language"),
    ).toHaveText("עברית");
    await page.screenshot({
      path: info.outputPath(`summary-prep-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    await page
      .getByRole("button", { name: he.lessonPrep.learnWordsFirst, exact: true })
      .click();
    await expect(page).toHaveURL(/english-learning\?unit=.*tab=words/);
    await expect(page.locator(".unit-browser-list")).toBeVisible();
  });
}

test("legacy meeting link opens the available station and locked review cannot start", async ({
  page,
}) => {
  await meetingFixture(page, 25);
  await page.goto(`/english-learning?unit=${packId}&tab=meetings`);
  await expect(page).toHaveURL(/private-lesson\?pack=.*station=midpoint/);
  await expect(
    page.getByRole("button", {
      name: he.lessonPrep.startWithTeacher,
      exact: true,
    }),
  ).toBeEnabled();
  await page.goto(`/english-learning?unit=${packId}`);
  await expect(
    page.locator(".unit-upcoming-row a[href*='station=review']"),
  ).toHaveCount(0);
  await page.goto(`/private-lesson?pack=${packId}&language=en&station=review`);
  await expect(
    page.getByRole("button", {
      name: he.lessonPrep.startWithTeacher,
      exact: true,
    }),
  ).toBeDisabled();
  await expect(page.locator(".unit-lesson-prep")).toContainText(
    he.unitMap.previousPreparation,
  );
});
