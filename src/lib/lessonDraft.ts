import { z } from "zod";
import { privateLessonSetupSchema } from "./privateLesson";
import { selectedProgramKey } from "./learningNavigation";
import type { AuthUser } from "../types";

const draftSchema = z.object({
  preferences: privateLessonSetupSchema.shape.preferences.unwrap(),
  topic: z.string().max(500),
  grammarFocus: z.string().max(500),
  level: z.enum(["", "A1", "A2", "B1", "B2", "C1", "C2"]),
  courseTeachingLanguage: z.enum(["target", "support"]),
  savedAt: z.number(),
});
export type LessonDraft = Omit<z.infer<typeof draftSchema>, "savedAt">;
type Owner = Pick<AuthUser, "id" | "applicationId"> | null | undefined;
function key(owner: Owner, language: string, course: string | null) {
  return `${selectedProgramKey(owner)}.lessonPreparation.${language}.${course ?? "free"}`;
}
export function saveLessonDraft(
  owner: Owner,
  language: string,
  course: string | null,
  draft: LessonDraft,
) {
  try {
    sessionStorage.setItem(
      key(owner, language, course),
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
  } catch {
    /* Storage is optional. */
  }
}
export function readLessonDraft(
  owner: Owner,
  language: string,
  course: string | null,
) {
  try {
    const value = draftSchema.safeParse(
      JSON.parse(
        sessionStorage.getItem(key(owner, language, course)) || "null",
      ),
    );
    const age = value.success ? Date.now() - value.data.savedAt : Infinity;
    if (value.success && age >= 0 && age < 30 * 60 * 1000) return value.data;
  } catch {
    /* An invalid or expired draft is never applied. */
  }
  return undefined;
}
