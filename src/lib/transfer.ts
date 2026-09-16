import { z } from "zod";
import { tagSchema, uuid } from "./product";
const language = z
  .string()
  .max(64)
  .refine((v) => {
    try {
      return !!Intl.getCanonicalLocales(v)[0];
    } catch {
      return false;
    }
  });
const text = (max: number) =>
  z
    .string()
    .max(max * 8)
    .refine((v) => {
      const normalized = v.normalize("NFKC").replace(/\s+/gu, " ").trim();
      return (
        normalized.length > 0 &&
        Array.from(normalized).length <= max &&
        !Array.from(v).some((char) => {
          const code = char.codePointAt(0)!;
          return (
            code <= 8 ||
            code === 11 ||
            code === 12 ||
            (code >= 14 && code <= 31) ||
            code === 127
          );
        })
      );
    });
const context = (max: number) => z.string().max(max).nullable().optional();
export const captureInput = z
  .object({
    item: z
      .object({
        sourceText: text(500),
        sourceLanguageCode: language,
        translationLanguageCode: language,
        itemType: z
          .enum(["word", "phrase", "expression", "phrasal_verb", "other"])
          .optional(),
        partOfSpeech: text(100).nullable().optional(),
        phoneticText: text(500).nullable().optional(),
        phoneticScheme: text(100).nullable().optional(),
      })
      .strict(),
    translation: z
      .object({
        text: text(1000),
        variants: z.array(text(1000)).max(10).optional(),
        selectionToken: z.string().max(65536).optional(),
      })
      .strict(),
    context: z
      .object({
        selectedText: text(500),
        sourceType: z
          .enum(["chrome_extension", "web_manual", "api", "import", "other"])
          .optional(),
        sentenceText: context(4000),
        paragraphText: context(12000),
        pageTitle: context(500),
        pageUrl: z
          .string()
          .max(2048)
          .refine((v) => {
            try {
              const url = new URL(v);
              return (
                ["http:", "https:"].includes(url.protocol) &&
                !url.username &&
                !url.password
              );
            } catch {
              return false;
            }
          })
          .nullable()
          .optional(),
        capturedAt: z.string().datetime({ offset: true }).nullable().optional(),
      })
      .strict(),
    senseDecision: z.discriminatedUnion("mode", [
      z.object({ mode: z.literal("auto") }).strict(),
      z.object({ mode: z.literal("create_new_sense") }).strict(),
      z.object({ mode: z.literal("merge"), learningItemId: uuid }).strict(),
    ]),
    clientEventId: uuid.optional(),
  })
  .strict();
export const importInput = z
  .object({
    format: z.literal("capture_requests_v1"),
    entries: z
      .array(z.object({ eventId: uuid, capture: captureInput }).strict())
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (
      new Set(input.entries.map((e) => e.eventId)).size !==
        input.entries.length ||
      input.entries.some(
        (e) => e.capture.clientEventId && e.capture.clientEventId !== e.eventId,
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Event IDs must be unique and match capture IDs",
      });
  });
export type ImportInput = z.infer<typeof importInput>;
export const importReceipt = z.object({
  results: z.array(
    z.discriminatedUnion("status", [
      z.object({ eventId: uuid, status: z.literal("succeeded") }),
      z.object({
        eventId: uuid,
        status: z.literal("failed"),
        error: z.object({ code: z.string().max(100) }),
      }),
    ]),
  ),
});
export const exportItem = z.object({
  id: uuid,
  sourceText: z.string(),
  sourceLanguageCode: z.string(),
  translationLanguageCode: z.string(),
  itemType: z.string(),
  partOfSpeech: z.string().nullable(),
  userStatus: z.string(),
  learningStatus: z.string(),
  masterySource: z.string().nullable(),
  userPriority: z.string(),
  manualHard: z.boolean(),
  learningRevision: z.number().int().positive(),
  overallMasteryScore: z.number().min(0).max(100),
  reviewStage: z.number().int().nonnegative(),
  nextReviewAt: z.string().nullable(),
  lastPracticedAt: z.string().nullable(),
  occurrenceCount: z.number().int().nonnegative(),
  translations: z.array(
    z.object({
      text: z.string(),
      isPrimary: z.boolean(),
      sourceKind: z.string(),
      isUserEdited: z.boolean(),
    }),
  ),
  skills: z.array(
    z.object({
      skillType: z.string(),
      masteryScore: z.coerce.number().min(0).max(100),
      confidence: z.coerce.number().min(0).max(1),
      attemptCount: z.number().int().nonnegative(),
      successCount: z.number().int().nonnegative(),
      failureCount: z.number().int().nonnegative(),
      lastAttemptAt: z.string().nullable(),
      algorithmVersion: z.string(),
    }),
  ),
  tags: z.array(tagSchema),
});
export const exportPage = z.object({
  format: z.literal("learning_library_v1"),
  items: z.array(exportItem),
  nextCursor: z.string().nullable(),
});
export function parseImportFile(content: string): ImportInput {
  if (new TextEncoder().encode(content).length > 256 * 1024)
    throw new Error("קובץ הייבוא מוגבל ל־256KB.");
  const parsed = importInput.safeParse(JSON.parse(content));
  if (!parsed.success)
    throw new Error(
      "קובץ הייבוא חייב להתאים ל־capture_requests_v1, עם 1–100 מילים ומזהי אירוע ייחודיים. קובץ הייצוא אינו פורמט ייבוא.",
    );
  return parsed.data;
}
