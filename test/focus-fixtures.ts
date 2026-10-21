import { seedProfile } from "../src/data/seed";

export const focusUserId = "11111111-1111-4111-8111-111111111111";
export const focusSessionId = "22222222-2222-4222-8222-222222222222";
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-3333-4333-8333-333333333333`;
export const focusCards = [
  ["chair", "כיסא", "Please sit on the chair."],
  ["book", "ספר", "I read a book every day."],
  ["water", "מים", "Please bring some water."],
  ["hello", "שלום", "Say hello to your friend."],
  ["family", "משפחה", "I love my family."],
].map(([sourceText, translationText, context], index) => ({
  learningItemId: uuid(index + 1),
  sourceText,
  translationText,
  context,
  sourceLanguageCode: "en",
  translationLanguageCode: "he",
  audioUrl: "/fixture-audio",
}));

/** Isolated in-memory API for contract/UI tests. Never connects to a real database. */
export function focusFixture(
  options: {
    failAttemptOnce?: boolean;
    failCreateOnce?: boolean;
    expireAttemptOnce?: boolean;
    failCloseOnce?: boolean;
    speech?: boolean;
    locale?: string;
    count?: number;
    curriculumUnit?: string;
    omitCapabilityLanguage?: boolean;
    enabledSkills?: string[];
  } = {},
) {
  let serial = 100,
    failed = false,
    expired = false,
    closeFailed = false,
    createFailed = false;
  const exercises = new Map<
    string,
    {
      learningItemId: string;
      exerciseType: string;
      direction: string;
      choices: Array<{ id: string; text: string }>;
    }
  >();
  const receipts = new Map<string, unknown>();
  const attempts: Array<Record<string, unknown>> = [];
  const requests: Array<{
    path: string;
    method: string;
    body: Record<string, unknown>;
    key: string;
  }> = [];
  const session = {
    id: focusSessionId,
    sessionType: "smart_review",
    status: "active",
    startedAt: new Date().toISOString(),
    endedAt: null as string | null,
    durationSeconds: null as number | null,
    itemCount: options.count ?? 5,
    attemptCount: 0,
    correctCount: 0,
    xpEarned: 0,
    algorithmVersion: "isolated-fixture",
    ...(options.curriculumUnit
      ? {
          curriculumUnitId: options.curriculumUnit,
          curriculumTitle: "Unit vocabulary",
        }
      : {}),
  };
  const cards = focusCards.slice(0, options.count ?? 5);
  const dashboard = {
    counts: {
      total: 5,
      new: 2,
      learning: 3,
      reviewing: 0,
      mastered: 0,
      due: 0,
      difficult: 0,
      highPriority: 0,
      awaitingRecall: 0,
    },
    skills: [],
    modes: [],
    recentActivity: [],
    recentActivityPagination: {
      page: 1,
      pageCount: 1,
      totalCount: 0,
      pageSize: 6,
    },
    dailyGoal: {
      type: "items",
      value: 5,
      current: 0,
      completed: false,
      date: "2026-10-11",
    },
    gamification: {
      totalXp: 10,
      level: 1,
      nextLevelXp: 100,
      todayXp: 0,
      dailyXpCap: 200,
      dailyXpRemaining: 200,
      dailyXpCapReached: false,
      postDailyCapPercent: 25,
      currentStreakDays: 4,
      longestStreakDays: 4,
      lastActivityDate: "2026-10-10",
    },
    weeklyActivity: { timezone: "Asia/Jerusalem", days: [] },
  };
  async function response(
    url: string,
    method = "GET",
    body: Record<string, unknown> = {},
    key = "",
  ) {
    const path = new URL(url, "http://localhost").pathname;
    requests.push({ path, method, body, key });
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
      });
    if (path.endsWith("/auth/refresh"))
      return json({
        accessToken: "fixture-access",
        refreshToken: "fixture-refresh",
        expiresIn: 3600,
      });
    if (path.endsWith("/auth/me"))
      return json({
        user: {
          id: focusUserId,
          applicationId: focusSessionId,
          email: "learner@example.test",
          emailVerified: true,
          status: "active",
          role: "user",
        },
      });
    if (path.endsWith("/profile"))
      return json({
        profile: {
          ...seedProfile,
          name: "אורי",
          defaultSourceLanguage: "en",
          defaultTranslationLanguage: "he",
          learningPreferences: {
            enabledSkills: options.enabledSkills ?? [
              "recognition",
              "recall",
              "listening",
              "pronunciation",
              "spelling",
            ],
            uiLocale: options.locale ?? "he",
            reducedMotion: false,
          },
        },
      });
    if (path.endsWith("/billing/status"))
      return json({
        tier: "paid",
        access: true,
        plan: { key: "paid", name: "Paid", kind: "paid" },
        entitlements: ["practice.play"],
        subscription: null,
        trial: null,
      });
    if (path.endsWith("/dashboard/languages"))
      return json({ languages: [{ code: "en", count: cards.length }] });
    if (path.endsWith("/dashboard")) return json(dashboard);
    if (path.endsWith("/captures/preview"))
      return json({
        preview: {
          sourceText: body.selectedText,
          sourceLanguageCode: "en",
          translationLanguageCode: "he",
          enrichment: {
            status: "succeeded",
            candidates: [
              {
                text: "תרגום משפט לדוגמה",
                variants: [],
                partOfSpeech: null,
                phoneticText: null,
                phoneticScheme: null,
                examples: [],
                contextUsed: false,
                selectionToken: "fixture-selection",
                provenance: {
                  providerName: "fixture",
                  providerType: "dictionary",
                  providerModel: null,
                  contextUsed: false,
                },
              },
            ],
          },
          existingSenses: { items: [], hasMore: false },
          requiresManualTranslation: false,
          requiresLanguageSelection: false,
        },
      });
    if (path.endsWith("/capabilities"))
      return json({
        configured: {
          library: true,
          practice: true,
          dashboard: true,
          readingGeneration: false,
          speech: options.speech !== false,
        },
        learningLanguages: options.omitCapabilityLanguage
          ? []
          : [
              {
                languageCode: "en",
                enabledSkills: options.enabledSkills ?? [
                  "recognition",
                  "recall",
                  "listening",
                  "pronunciation",
                  "spelling",
                ],
              },
            ],
      });
    if (path.endsWith("/structured-english/heartbeat"))
      return json({ activeSeconds: 0 });
    if (path.endsWith("/word-packs")) return json({ packs: [] });
    if (path.endsWith("/private-lessons")) return json({ lessons: [] });
    if (path.endsWith("/learning/queue"))
      return json({
        items: cards.map((card) => ({
          id: card.learningItemId,
          sourceText: card.sourceText,
          sourceLanguageCode: "en",
          translationLanguageCode: "he",
          primaryTranslation: card.translationText,
          learningStatus: "new",
          nextReviewAt: null,
          queueScore: 1,
        })),
        algorithmVersion: "isolated-fixture",
      });
    if (path.endsWith("/practice/sessions")) {
      if (method === "POST") {
        session.sessionType = String(body.sessionType);
        if (options.failCreateOnce && !createFailed) {
          createFailed = true;
          return json(
            {
              error: {
                code: "TEMPORARY_ERROR",
                message: "Creation response interrupted",
              },
            },
            503,
          );
        }
        return json({ session });
      }
      return json({ items: [session], nextCursor: null });
    }
    if (path.endsWith(`/practice/sessions/${focusSessionId}/study`))
      return json({ cards });
    if (path.endsWith(`/practice/sessions/${focusSessionId}/exercises`)) {
      const selected = cards.filter((card) =>
        (body.learningItemIds as string[]).includes(card.learningItemId),
      );
      const kind = String(body.kind),
        exerciseType = String(body.exerciseType),
        direction = String(body.direction);
      const choices = (exerciseType === "matching" ? selected : cards).map(
        (card) => ({
          id: uuid(++serial),
          text:
            direction === "source_to_translation"
              ? card.translationText
              : card.sourceText,
        }),
      );
      return json({
        exercises: selected.map((card) => {
          const id = uuid(++serial);
          exercises.set(id, {
            learningItemId: card.learningItemId,
            exerciseType,
            direction,
            choices,
          });
          return {
            id,
            learningItemId: card.learningItemId,
            exerciseType,
            kind,
            direction,
            prompt: {
              text:
                exerciseType === "listening_spelling"
                  ? null
                  : direction === "source_to_translation"
                    ? card.sourceText
                    : card.translationText,
              languageCode: "en",
              context: card.context.replace(card.sourceText, "_____"),
              ...(kind === "multiple_choice" ? { choices } : {}),
              ...(exerciseType === "flashcards"
                ? { answer: card.translationText }
                : {}),
              audioUrl: "/fixture-audio",
              letterCount: card.sourceText.length,
              wordLengths: [card.sourceText.length],
            },
            expiresAt: "2030-01-01T00:00:00.000Z",
          };
        }),
      });
    }
    if (
      path.endsWith("/practice/attempts") ||
      path.endsWith("/pronunciation/assessments")
    ) {
      if (options.expireAttemptOnce && !expired) {
        expired = true;
        return json(
          { error: { code: "EXERCISE_EXPIRED", message: "Exercise expired" } },
          409,
        );
      }
      if (receipts.has(key)) return json(receipts.get(key));
      const exercise = exercises.get(String(body.exerciseId));
      if (!exercise)
        return json(
          { error: { code: "EXERCISE_STALE", message: "Stale fixture" } },
          409,
        );
      const card = cards.find(
        (card) => card.learningItemId === exercise.learningItemId,
      )!;
      const expectedAnswer =
        exercise.direction === "source_to_translation"
          ? card.translationText
          : card.sourceText;
      const correct =
        body.selfRating === "good" ||
        body.audioBase64 ||
        body.answerText === expectedAnswer ||
        exercise.choices.find((choice) => choice.id === body.choiceId)?.text ===
          expectedAnswer;
      const result = body.skipped
        ? "skipped"
        : body.selfRating
          ? "self_rated"
          : correct
            ? body.hintsUsed
              ? "partially_correct"
              : "correct"
            : "incorrect";
      const score = body.skipped
        ? null
        : correct
          ? body.hintsUsed
            ? 70
            : 100
          : body.selfRating === "hard"
            ? 40
            : 0;
      const xpEarned = body.skipped ? 0 : correct ? 4 : 1;
      const id = uuid(++serial);
      const attempt = {
        id,
        learningItemId: card.learningItemId,
        sessionId: focusSessionId,
        sequence: attempts.length + 1,
        result,
        score,
        expectedAnswer,
        xpEarned,
        ...(body.audioBase64
          ? {
              pronunciationFeedback:
                "Clear pronunciation from the test provider.",
            }
          : {}),
      };
      attempts.push({ ...attempt, exerciseType: exercise.exerciseType });
      session.attemptCount++;
      if (correct) session.correctCount++;
      session.xpEarned += xpEarned;
      const receipt = {
        attempt,
        progress: {
          status: "learning",
          stage: 0,
          masteryScore: 40,
          masterySource: "system",
          nextReviewAt: "2026-10-12T00:00:00.000Z",
        },
        skills: [],
        algorithmVersion: "isolated-fixture",
        replayed: false,
      };
      receipts.set(key, receipt);
      if (options.failAttemptOnce && !failed) {
        failed = true;
        return json(
          {
            error: {
              code: "TEST_NETWORK",
              message: "Connection interrupted after saving",
            },
          },
          503,
        );
      }
      return json(receipt);
    }
    if (path.endsWith(`/practice/sessions/${focusSessionId}`)) {
      if (method === "PATCH" && session.status === "active") {
        session.status = "completed";
        session.endedAt = new Date().toISOString();
        session.durationSeconds = 126;
        session.xpEarned += session.attemptCount >= 3 ? 5 : 0;
      }
      if (method === "PATCH" && options.failCloseOnce && !closeFailed) {
        closeFailed = true;
        return json(
          {
            error: {
              code: "TEST_NETWORK",
              message: "Close response interrupted",
            },
          },
          503,
        );
      }
      return json({
        session: {
          ...session,
          attempts: [...attempts].reverse().slice(0, 100),
        },
      });
    }
    if (path.includes("/learning-items/") && path.endsWith("/audio"))
      return new Response(silentWav(), {
        headers: { "content-type": "audio/wav" },
      });
    if (path.includes("/learning-items/"))
      return json({ item: { partOfSpeech: "noun", phoneticText: "/tʃeə/" } });
    return json(
      { error: { code: "TEST_UNHANDLED_ROUTE", message: path } },
      404,
    );
  }
  return { response, requests, session, attempts };
}

function silentWav() {
  const bytes = new Uint8Array(3244),
    view = new DataView(bytes.buffer);
  for (const [offset, text] of [
    [0, "RIFF"],
    [8, "WAVE"],
    [12, "fmt "],
    [36, "data"],
  ] as const)
    [...text].forEach((letter, index) =>
      view.setUint8(offset + index, letter.charCodeAt(0)),
    );
  view.setUint32(4, bytes.length - 8, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(40, 3200, true);
  return bytes;
}
