import { z } from "zod";
import { homeworkSchema } from "./courses";
import { product, uuid } from "./product";

const station = z.enum(["supported", "midpoint", "review"]);
export const unitLearningPathSchema = z.object({
  packId: uuid,
  navigationRevision: z.number().int().optional(),
  navigationComplete: z.boolean().optional(),
  skippedSteps: z.number().int().optional(),
  steps: z
    .array(
      z.object({
        key: z.string(),
        kind: z.enum(["words", "meeting", "homework"]),
        station,
        complete: z.boolean(),
        skipped: z.boolean(),
        available: z.boolean(),
        homeworkId: uuid.nullable(),
      }),
    )
    .optional(),
  words: z.array(
    z.object({
      sourceText: z.string(),
      translationText: z.string(),
      exampleText: z.string().nullable(),
      introduced: z.boolean(),
    }),
  ),
  stations: z.array(
    z.object({
      station,
      requiredWords: z.number(),
      durationMinutes: z.number(),
      available: z.boolean(),
      meetingCompleted: z.boolean(),
      preparationComplete: z.boolean(),
      lessonId: uuid.nullable(),
      homework: homeworkSchema.nullable(),
      lockReason: z.enum(["words", "previous_preparation"]).nullable(),
    }),
  ),
  nextAction: z.object({
    kind: z.enum(["words", "meeting", "homework"]),
    station: station.nullable(),
    homeworkId: uuid.nullable(),
  }),
});
export type UnitLearningPath = z.infer<typeof unitLearningPathSchema>;
export const getUnitLearningPath = (id: string) =>
  product(
    z.object({ path: unitLearningPathSchema }),
    `private-lessons/units/${id}/map`,
  );
export const chooseUnitPath = (
  id: string,
  input: { revision: number; eventId: string; skipped: boolean; step?: string },
) =>
  product(
    z.object({ path: unitLearningPathSchema }),
    `private-lessons/units/${id}/path-choices`,
    "POST",
    input,
  );
export function homeworkTaskLink(
  id: string,
  index?: number,
  review = false,
  returnTo?: string,
) {
  const params = new URLSearchParams();
  if (index !== undefined) params.set("task", String(index));
  if (review) params.set("review", "1");
  if (returnTo) params.set("return", returnTo);
  return `/homework/${id}?${params}`;
}
