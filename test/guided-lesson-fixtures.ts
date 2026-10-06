import type {
  PrivateLessonSession,
  SavedPrivateLesson,
} from "../src/lib/privateLesson";
export const guidedSession: PrivateLessonSession = {
  activity: {
    revision: 0,
    stage: "learn",
    attempts: 0,
    tutorText: "נבקש כוס מים בנימוס. באיזה מצב נשתמש בביטוי הזה?",
    question: "באיזה מצב נשתמש בביטוי הזה?",
    example: { targetText: "水をください。", meaningAndReason: "מים, בבקשה." },
    feedback: null,
    hintUsed: false,
    turns: [{ role: "tutor", text: "נבקש כוס מים בנימוס." }],
  },
  lesson: {
    wordPack: null,
    id: "11111111-1111-4111-8111-111111111111",
    durationSeconds: 300,
    wrapUpAfterSeconds: 295,
    targetLanguageCode: "ja",
    supportLanguageCode: "he",
    lessonMode: "absolute_beginner",
    teachingLanguage: "support",
    level: "A1",
    topic: "בקשה קצרה",
    grammarFocus: null,
    focusAreas: ["speaking"],
    customFocus: null,
    correctionMode: "recast",
    vocabularyMode: "none",
    continuesFromLessonId: null,
    teacherVoice: "female",
    speechRate: "slow",
    targetWords: [],
    roadmap: null,
  },
  realtime: {
    clientSecret: "one-use-fixture",
    expiresAt: null,
    connectionUrl: "/api/v1/realtime/connect",
    model: "fixture",
    voice: "marin",
    openingEvent: {
      type: "response.create",
      response: { instructions: "fixture" },
    },
    wrapUpEvent: {
      type: "response.create",
      response: { instructions: "fixture" },
    },
    translationEvent: null,
  },
};

// Legacy-compatible wire data is parsed by the real application in browser tests.
export const guidedReport = {
  ...guidedSession.lesson,
  targetLanguageCode: "en",
  plannedDurationSeconds: 300,
  actualDurationSeconds: 140,
  status: "completed",
  startedAt: "2026-10-06T10:00:00.000Z",
  endedAt: "2026-10-06T10:02:20.000Z",
  report: {
    summary: "Practised a short request.",
    strengths: [],
    corrections: [],
    grammarPoints: [],
    vocabulary: [],
    newWordSuggestions: [],
    nextLessonPlan: "Try another short request.",
    recommendedReviewItemIds: [guidedSession.lesson.id],
    assessment: {
      overallLevel: null,
      confidence: "low",
      skills: Object.fromEntries(
        ["speaking", "vocabulary", "grammar", "fluency", "comprehension"].map(
          (key) => [
            key,
            {
              score: 40,
              level: null,
              feedback: "Still practising.",
              evidence: [
                {
                  learnerQuote: "I want tea.",
                  observation: "בקשת תה במשפט עצמאי.",
                  independent: true,
                },
                {
                  learnerQuote: "I want coffee.",
                  observation: "בקשת קפה בעזרת דוגמה.",
                  independent: false,
                },
              ],
            },
          ],
        ),
      ),
    },
  },
} as unknown as SavedPrivateLesson;
