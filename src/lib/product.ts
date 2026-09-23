import { z } from "zod";
import { api, ApiError } from "./api";

export const uuid = z.string().uuid();
const count = z.number().int().nonnegative();
const score = z.number().min(0).max(100);
const date = z.string().datetime({ offset: true });
const nullableDate = date.nullable();
export const skill = z.enum([
  "recognition",
  "recall",
  "listening",
  "spelling",
  "pronunciation",
]);
export const status = z.enum(["new", "learning", "reviewing", "mastered"]);
export const masteryRequirementsSchema = z.object({
  totalScoredAttempts: count,
  minimumScoredAttempts: count,
  activeRecallSuccesses: count,
  minimumActiveRecallSuccesses: count,
  activeRecallCalendarDays: count,
  minimumActiveRecallCalendarDays: count,
  activeRecallMasteryScore: score,
  masteryThreshold: score,
  reviewStage: count,
  learnedReviewStage: count,
  needsTypedRecall: z.boolean(),
});
export type MasteryRequirements = z.infer<typeof masteryRequirementsSchema>;
export function masteryRequirementText(requirements?: MasteryRequirements) {
  if (!requirements?.needsTypedRecall) return null;
  const missingAttempts = Math.max(
      0,
      requirements.minimumScoredAttempts - requirements.totalScoredAttempts,
    ),
    missingSuccesses = Math.max(
      0,
      requirements.minimumActiveRecallSuccesses -
        requirements.activeRecallSuccesses,
    ),
    missingDays = Math.max(
      0,
      requirements.minimumActiveRecallCalendarDays -
        requirements.activeRecallCalendarDays,
    );
  if (missingAttempts) return `נדרשים עוד ${missingAttempts} תרגולים מדורגים.`;
  if (missingDays)
    return missingDays === 1
      ? "נדרשת שליפה מוקלדת מוצלחת ביום נוסף."
      : `נדרשות שליפות מוקלדות מוצלחות בעוד ${missingDays} ימים שונים.`;
  if (missingSuccesses)
    return `נדרשות עוד ${missingSuccesses} שליפות מוקלדות מוצלחות.`;
  if (requirements.activeRecallMasteryScore < requirements.masteryThreshold)
    return `נדרש ציון שליפה של ${requirements.masteryThreshold}% לפחות.`;
  if (requirements.reviewStage < requirements.learnedReviewStage)
    return "נדרשת חזרת שליפה מוקלדת ביום נוסף.";
  return "נדרשת שליפה מוקלדת מוצלחת נוספת.";
}
const sourceKind = z.enum([
  "user",
  "dictionary",
  "translation_api",
  "ai",
  "import",
  "catalog",
]);
export const itemSchema = z.object({
  id: uuid,
  sourceText: z.string(),
  sourceLanguageCode: z.string(),
  translationLanguageCode: z.string(),
  itemType: z.string(),
  userStatus: z.enum(["active", "paused", "archived", "deleted"]),
  learningStatus: status,
  userPriority: z.enum(["normal", "high"]),
  manualHard: z.boolean(),
  overallMasteryScore: score,
  masteryRequirements: masteryRequirementsSchema.optional(),
  nextReviewAt: nullableDate,
  createdAt: date,
  updatedAt: date,
  primaryTranslation: z.string().nullable(),
});
export type Item = z.infer<typeof itemSchema>;
export function needsStrengthening(
  item: Pick<Item, "overallMasteryScore" | "masteryRequirements">,
) {
  return (
    item.overallMasteryScore <
    (item.masteryRequirements?.masteryThreshold ?? 80)
  );
}
export const skillSchema = z.object({
  skillType: skill,
  masteryScore: score,
  confidence: z.number().min(0).max(1),
  attemptCount: count,
  successCount: count,
  failureCount: count,
});
export const detailSchema = itemSchema
  .omit({ primaryTranslation: true })
  .extend({
    partOfSpeech: z.string().nullable(),
    phoneticText: z.string().nullable(),
    masterySource: z.enum(["user", "system"]).nullable(),
    reviewStage: count,
    learningRevision: count,
    lastPracticedAt: nullableDate,
    translations: z.array(
      z.object({
        id: uuid,
        text: z.string(),
        isPrimary: z.boolean(),
        sourceKind,
        providerName: z.string().nullable(),
        providerModel: z.string().nullable(),
        isUserEdited: z.boolean(),
      }),
    ),
    skills: z.array(skillSchema),
    occurrenceCount: count,
  });
export type ItemDetail = z.infer<typeof detailSchema>;
export const tagSchema = z.object({ id: uuid, name: z.string() });
export const capabilitiesSchema = z.object({
  configured: z.object({
    library: z.boolean(),
    practice: z.boolean(),
    dashboard: z.boolean(),
    readingGeneration: z.boolean(),
    speech: z.boolean(),
  }),
  learningLanguages: z.array(
    z.object({
      languageCode: z.string(),
      enabledSkills: z.array(skill).max(5),
    }),
  ),
});
export const translationSchema = z.object({
  id: uuid,
  text: z.string(),
  isPrimary: z.boolean(),
  isCurrent: z.boolean(),
  sourceKind,
  isUserEdited: z.boolean(),
  providerName: z.string().nullable(),
  providerModel: z.string().nullable(),
});
export const queueSchema = z.object({
  items: z.array(
    z.object({
      id: uuid,
      sourceText: z.string(),
      sourceLanguageCode: z.string(),
      translationLanguageCode: z.string(),
      primaryTranslation: z.string().nullable(),
      learningStatus: status,
      nextReviewAt: z.string().nullable(),
      queueScore: z.number(),
    }),
  ),
  algorithmVersion: z.string(),
});
export const page = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });
export const occurrenceSchema = z.object({
  id: uuid,
  sourceType: z.string(),
  selectedText: z.string(),
  sentenceText: z.string().nullable(),
  paragraphText: z.string().nullable(),
  pageTitle: z.string().nullable(),
  pageUrl: z.string().nullable(),
  capturedAt: date,
});
export const exampleSchema = z.object({
  id: uuid,
  text: z.string(),
  sourceKind,
  isUserEdited: z.boolean(),
});
export const candidateSchema = z.object({
  text: z.string(),
  variants: z.array(z.string()),
  partOfSpeech: z.string().nullable(),
  phoneticText: z.string().nullable(),
  phoneticScheme: z.string().nullable(),
  examples: z.array(z.string()),
  contextUsed: z.boolean(),
  selectionToken: z.string(),
  provenance: z.object({
    providerName: z.string(),
    providerType: z.string(),
    providerModel: z.string().nullable(),
    contextUsed: z.boolean(),
  }),
});
export const previewSchema = z.object({
  preview: z.object({
    sourceText: z.string(),
    sourceLanguageCode: z.string().nullable(),
    translationLanguageCode: z.string().nullable(),
    enrichment: z.object({
      status: z.enum([
        "succeeded",
        "not_configured",
        "unavailable",
        "needs_language_selection",
      ]),
      candidates: z.array(candidateSchema),
    }),
    existingSenses: z.object({
      items: z.array(
        z.object({
          learningItemId: uuid,
          sourceText: z.string(),
          primaryTranslation: z.string().nullable(),
          userStatus: z.string(),
          learningStatus: status,
          variants: z.array(z.string()),
        }),
      ),
      hasMore: z.boolean(),
    }),
    requiresManualTranslation: z.boolean(),
    requiresLanguageSelection: z.boolean(),
  }),
});
export const captureReceipt = z.object({
  capture: z.object({
    outcome: z.enum(["created", "created_new_sense", "merged"]),
    learningItemId: uuid,
    occurrenceId: uuid,
  }),
});
export const sessionSchema = z.object({
  id: uuid,
  sessionType: z.string(),
  status: z.enum(["active", "completed", "abandoned"]),
  startedAt: date,
  endedAt: nullableDate,
  durationSeconds: count.nullable(),
  itemCount: count,
  attemptCount: count,
  correctCount: count,
  xpEarned: count,
  algorithmVersion: z.string(),
  scope: z
    .object({
      type: z.enum(["pack", "track", "topic"]),
      id: uuid,
      title: z.string(),
    })
    .nullable()
    .optional(),
});
export type Session = z.infer<typeof sessionSchema>;
export const wordPackSchema = z.object({
  id: uuid,
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  moduleNumber: z.number().int().positive(),
  version: z.number().int().positive(),
  wordCount: count,
  installed: z.boolean(),
  installedVersion: z.number().int().positive().nullable(),
  topic: z.object({ id: uuid, slug: z.string(), title: z.string() }),
  track: z.object({
    id: uuid,
    slug: z.string(),
    title: z.string(),
    levelCode: z.enum(["beginner", "intermediate", "advanced"]),
    cefrFrom: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    cefrTo: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    sourceLanguageCode: z.string(),
    translationLanguageCode: z.string(),
  }),
  progress: z.object({
    linked: count,
    new: count,
    learning: count,
    reviewing: count,
    mastered: count,
    due: count,
  }),
});
export type WordPack = z.infer<typeof wordPackSchema>;
export const wordPacksSchema = z.object({ packs: z.array(wordPackSchema) });
export const wordPackEntrySchema = z.object({
  id: uuid,
  sourceText: z.string(),
  translationText: z.string(),
  itemType: z.string(),
  partOfSpeech: z.string().nullable(),
  exampleText: z.string().nullable(),
  learningItemId: uuid.nullable(),
  excludedAt: nullableDate,
});
export type WordPackEntry = z.infer<typeof wordPackEntrySchema>;
export const wordPackDetailSchema = z.object({
  pack: wordPackSchema,
  entries: z.array(wordPackEntrySchema).min(1).max(100),
});
export const wordPackAddReceiptSchema = z.object({
  packId: uuid,
  added: count,
  linkedExisting: count,
  restored: count,
  excluded: count,
  total: count,
});
export const wordPackRemoveReceiptSchema = z.object({
  packId: uuid,
  mode: z.enum(["archive_exclusive", "keep_words"]),
  archived: count,
  retained: count,
});
export const studyCardSchema = z.object({
  learningItemId: uuid,
  sourceText: z.string(),
  translationText: z.string(),
  sourceLanguageCode: z.string(),
  translationLanguageCode: z.string(),
  context: z.string().nullable(),
  audioUrl: z.string().nullable(),
});
export type StudyCard = z.infer<typeof studyCardSchema>;
export const studyCardsSchema = z.object({
  cards: z.array(studyCardSchema).min(1).max(100),
});
export const studyImageSchema = z.object({
  image: z
    .object({
      url: z
        .string()
        .max(4_100_000)
        .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/u),
      alt: z.string(),
      generated: z.boolean(),
      provider: z.string().optional(),
      sourceUrl: z.string().url().nullable().optional(),
      creator: z.string().nullable().optional(),
    })
    .nullable(),
});
export type StudyImage = z.infer<typeof studyImageSchema>["image"];
export const exerciseSchema = z.object({
  id: uuid,
  learningItemId: uuid,
  exerciseType: z.enum([
    "flashcards",
    "recall",
    "listening_spelling",
    "matching",
    "pronunciation",
    "article_quiz",
  ]),
  kind: z.enum(["typed", "multiple_choice", "self_rating", "provider"]),
  direction: z.enum(["source_to_translation", "translation_to_source"]),
  prompt: z.object({
    text: z.string().nullable(),
    languageCode: z.string(),
    context: z.string().nullable(),
    answer: z.string().optional(),
    choices: z.array(z.object({ id: uuid, text: z.string() })).optional(),
    audioUrl: z.string().optional(),
    letterCount: count.optional(),
  }),
  expiresAt: date,
});
export type Exercise = z.infer<typeof exerciseSchema>;
export const attemptReceipt = z.object({
  attempt: z.object({
    id: uuid,
    learningItemId: uuid,
    sessionId: uuid,
    sequence: count,
    result: z.enum([
      "correct",
      "partially_correct",
      "incorrect",
      "skipped",
      "self_rated",
    ]),
    score: score.nullable(),
    expectedAnswer: z.string().nullable(),
    xpEarned: count,
    xpStatus: z
      .object({
        todayXp: count,
        dailyXpCap: count,
        dailyXpRemaining: count,
        dailyXpCapReached: z.boolean(),
        postDailyCapPercent: count.max(100).optional(),
      })
      .optional(),
    pronunciationFeedback: z.string().max(2000).optional(),
  }),
  progress: z.object({
    status,
    stage: count,
    masteryScore: score,
    masterySource: z.enum(["user", "system"]).nullable(),
    masteryRequirements: masteryRequirementsSchema.optional(),
    nextReviewAt: nullableDate,
  }),
  skills: z.array(skillSchema),
  algorithmVersion: z.string(),
  replayed: z.boolean(),
});
export type AttemptReceipt = z.infer<typeof attemptReceipt>;
export const dashboardSchema = z.object({
  counts: z.object({
    total: count,
    new: count,
    learning: count,
    reviewing: count,
    mastered: count,
    due: count,
    difficult: count,
    highPriority: count,
    awaitingRecall: count,
  }),
  skills: z.array(
    z.object({ skill, masteryScore: score, evidenceAttempts: count }),
  ),
  modes: z.array(
    z.object({
      exerciseType: z.string(),
      attempts: count,
      averageScore: score.nullable(),
    }),
  ),
  recentActivity: z.array(
    z.object({
      id: uuid,
      learningItemId: uuid,
      exerciseType: z.string(),
      result: z.string(),
      score: score.nullable(),
      createdAt: date,
    }),
  ),
  dailyGoal: z.object({
    type: z.enum(["items", "minutes", "attempts"]),
    value: count,
    current: count,
    completed: z.boolean(),
    date: z.string(),
  }),
  gamification: z.object({
    totalXp: count,
    level: count,
    nextLevelXp: count,
    todayXp: count,
    dailyXpCap: count,
    dailyXpRemaining: count,
    dailyXpCapReached: z.boolean(),
    postDailyCapPercent: count.max(100),
    currentStreakDays: count,
    longestStreakDays: count,
    lastActivityDate: z.string().nullable(),
  }),
  weeklyActivity: z.object({
    timezone: z.string(),
    days: z.array(
      z.object({
        date: z.string(),
        practiceSeconds: count,
        sessionsCompleted: count,
        attempts: count,
        correctAttempts: count,
        itemsPracticed: count,
        itemsMastered: count,
        xpEarned: count,
      }),
    ),
  }),
});
const targetSchema = z.object({
  id: uuid,
  sourceText: z.string(),
  translationText: z.string().optional(),
  translationLanguageCode: z.string().optional(),
  partOfSpeech: z.string().nullable().optional(),
  occurrenceCount: count.nullable(),
  ranges: z
    .array(
      z.object({ start: count, end: count }).refine((r) => r.end > r.start),
    )
    .optional(),
});
export const readingSchema = z
  .object({
    id: uuid,
    title: z.string(),
    bodyText: z.string(),
    contentType: z.string(),
    targetLanguageCode: z.string(),
    effectiveLevel: z.string().nullable(),
    targets: z.array(targetSchema),
    openedAt: date.optional(),
  })
  .superRefine((r, ctx) => {
    const length = Array.from(r.bodyText).length;
    if (r.targets.some((t) => t.ranges?.some((range) => range.end > length)))
      ctx.addIssue({ code: "custom", message: "Invalid text ranges" });
  });
export type Reading = z.infer<typeof readingSchema>;
export const readingSummary = z.object({
  id: uuid,
  title: z.string(),
  topic: z.string().nullable(),
  targetLanguageCode: z.string(),
  contentType: z.string(),
  effectiveLevel: z.string().nullable(),
  openedAt: date,
});
export const readingPreview = z.object({
  reading: readingSchema,
  publicationToken: z.string(),
  expiresAt: date,
  provider: z.object({ name: z.string(), model: z.string().nullable() }),
});

export async function product<T extends z.ZodType>(
  schema: T,
  path: string,
  method = "GET",
  body?: unknown,
  eventId?: string,
): Promise<z.infer<T>> {
  const result = schema.safeParse(
    await api.product(path, method, body, eventId),
  );
  if (!result.success)
    throw new ApiError(
      502,
      "INVALID_RESPONSE",
      "השרת החזיר נתונים שאינם תואמים לחוזה. לא בוצע חישוב חלופי בדפדפן.",
    );
  return result.data;
}
export function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return search.size ? `?${search}` : "";
}
export const labels: Record<string, string> = {
  new: "חדש",
  learning: "בלמידה",
  reviewing: "בחזרה",
  mastered: "נלמד",
  active: "פעיל",
  paused: "מושהה",
  archived: "בארכיון",
  deleted: "נמחק",
  recognition: "זיהוי",
  recall: "שליפה",
  listening: "האזנה",
  spelling: "איות",
  pronunciation: "הגייה",
  smart_review: "חזרה חכמה",
  flashcards: "כרטיסיות",
  listening_spelling: "האזנה ואיות",
  matching: "התאמה",
  article_quiz: "תרגול מתוך קריאה",
  correct: "נכון",
  partially_correct: "נכון חלקית",
  incorrect: "דורש חזרה",
  skipped: "דילוג",
  self_rated: "דירוג עצמי",
};
export function errorMessage(reason: unknown): string {
  const codes: Record<string, string> = {
    NO_ELIGIBLE_ITEMS:
      "אין מילים פעילות מתאימות. הוסיפו מילים או עדכנו את הסינון.",
    SPEECH_NOT_CONFIGURED:
      "ספק דיבור אינו מוגדר בשרת. אפשר לתרגל כרטיסיות, שליפה והתאמה.",
    READING_NOT_CONFIGURED: "ספק יצירת קריאה אינו מוגדר בשרת.",
    INSUFFICIENT_DISTRACTORS:
      "לשאלות בחירה דרושות לפחות שתי מילים מתאימות. נסו תשובה בהקלדה.",
    EXERCISE_STALE: "המילה נערכה מאז יצירת התרגיל. יש להתחיל תרגול חדש.",
    EXERCISE_EXPIRED: "התוקף של התרגיל פג. התחילו תרגול חדש.",
    SESSION_CLOSED: "התרגול כבר הסתיים בשרת.",
    SENSE_SELECTION_REQUIRED:
      "יש לבחור משמעות קיימת או ליצור משמעות חדשה. בצעו תצוגה מקדימה שוב.",
    PUBLICATION_INVALID: "התצוגה פגה או השתנתה. יש ליצור תצוגה חדשה.",
    IDEMPOTENCY_CONFLICT:
      "מזהה הבקשה כבר שימש לתוכן אחר. לא נשלחה בקשה חדשה אוטומטית.",
    CONCURRENT_MODIFICATION: "המילה עודכנה בינתיים. טענו אותה מחדש לפני שמירה.",
    WORD_PACK_NOT_ADDED: "יש להוסיף את מאגר המילים לפני פתיחת סשן ממנו.",
  };
  return reason instanceof ApiError && codes[reason.code]
    ? codes[reason.code]
    : reason instanceof Error
      ? reason.message
      : "הפעולה נכשלה. נסו שוב.";
}
export type Intent = { eventId: string; body: unknown };
export function intent(body: unknown): Intent {
  return { eventId: crypto.randomUUID(), body: structuredClone(body) };
}
