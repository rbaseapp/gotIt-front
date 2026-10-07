import { z } from "zod";
import { product, uuid } from "./product";

const level = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export const coursePreferencesSchema = z.object({
  targetLanguageCode: z.string(),
  supportLanguageCode: z.string(),
  path: z.enum(["comprehensive", "grammar", "goal"]),
  goal: z.string(),
  experience: z.string(),
  startingLevel: level,
  absoluteBeginner: z.boolean(),
  ageGroup: z.enum(["child", "teen", "adult", "unspecified"]),
  literacy: z.enum(["not_yet", "developing", "independent", "unspecified"]),
  minutesPerLesson: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  daysPerWeek: z.number().int(),
  interests: z.array(z.string()),
  statedNeeds: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export const courseUnitSchema = z.object({
  key: z.string(),
  title: z.string(),
  outcome: z.string(),
  level,
  prerequisites: z.array(z.string()),
  syllabusKeys: z.array(z.string()),
  grammar: z.array(z.string()),
  vocabulary: z.array(z.string()),
  lessons: z.array(z.object({ title: z.string(), objective: z.string() })),
  estimatedMinutes: z.number(),
  homeworkExample: z.string(),
  successTask: z.string(),
});
const coursePlanSchema = z.object({
  title: z.string(),
  outcome: z.string(),
  scope: z.string(),
  changeSummary: z.string(),
  units: z.array(courseUnitSchema),
});
export const courseSchema = z.object({
  id: uuid,
  revision: z.number().int(),
  createdAt: z.string(),
  preferences: coursePreferencesSchema,
  approvedPreferences: coursePreferencesSchema.nullable(),
  preferencesApprovedAt: z.string().nullable(),
  ready: z.boolean(),
  messages: z.array(
    z.object({
      role: z.enum(["learner", "tutor"]),
      text: z.string(),
      channel: z.enum(["text", "voice"]),
    }),
  ),
  suggestions: z.array(z.string()),
  intakeAnswers: z
    .array(
      z.object({
        topic: z.string(),
        text: z.string(),
        channel: z.enum(["text", "voice"]),
      }),
    )
    .optional(),
  reportedAvailability: z.string().optional(),
  intakeProgress: z
    .object({
      current: z.number().int(),
      answered: z.number().int(),
      total: z.number().int(),
    })
    .nullable()
    .default(null),
  versions: z.array(
    z.object({
      version: z.number(),
      preferences: coursePreferencesSchema,
      plan: coursePlanSchema,
      createdAt: z.string(),
    }),
  ),
  draftVersion: z.number().nullable(),
  activeVersion: z.number().nullable(),
  pendingPlanChange: z.string().optional(),
  evidence: z.array(
    z.object({
      lessonId: uuid,
      version: z.number(),
      unitKey: z.string(),
      lessonIndex: z.number(),
      covered: z.boolean(),
      independent: z.boolean(),
      recordedAt: z.string(),
    }),
  ),
  nextLesson: z
    .object({
      unitKey: z.string(),
      unitTitle: z.string(),
      lessonIndex: z.number(),
      title: z.string(),
      objective: z.string(),
    })
    .nullable(),
  progress: z.object({
    covered: z.number(),
    demonstrated: z.number(),
    retention: z.literal("not_assessed"),
  }),
});
export const homeworkSummarySchema = z.object({
  packId: uuid.nullable().optional().default(null),
  station: z
    .enum(["supported", "midpoint", "review"])
    .nullable()
    .optional()
    .default(null),
  id: uuid,
  lessonId: uuid,
  courseId: uuid.nullable(),
  unitKey: z.string().nullable(),
  title: z.string(),
  targetLanguageCode: z.string(),
  createdAt: z.string(),
  status: z.enum(["pending", "ready", "completed"]),
  taskCount: z.number(),
  completedCount: z.number(),
});
export const homeworkSchema = homeworkSummarySchema.extend({
  review: z
    .object({
      taskIndex: z.number().int(),
      result: z.enum(["correct", "retry", "uncertain"]),
      feedback: z.string(),
      hint: z.string().nullable(),
    })
    .nullable()
    .optional()
    .default(null),
  revision: z.number(),
  needsRefresh: z.boolean().default(false),
  supportLanguageCode: z.string(),
  objective: z.string().nullable(),
  oralFirst: z.boolean().optional(),
  estimatedMinutes: z.number().nullable(),
  tasks: z.array(
    z.object({
      kind: z.enum([
        "choice",
        "fill",
        "order",
        "transform",
        "response",
        "listening",
      ]),
      objective: z.string(),
      prompt: z.string(),
      choices: z.array(z.string()),
      tokens: z.array(z.string()),
      listeningText: z.string().nullable(),
      hint: z.string().nullable(),
      solution: z
        .object({ answer: z.string(), explanation: z.string() })
        .nullable(),
      hintUsed: z.boolean(),
      done: z.boolean(),
      draft: z.string(),
      attempts: z.array(
        z.object({
          answer: z.string(),
          channel: z.enum(["text", "voice"]),
          result: z.enum(["correct", "retry", "uncertain", "skipped"]),
          feedback: z.string(),
          independent: z.boolean(),
          createdAt: z.string(),
        }),
      ),
    }),
  ),
});
export type Course = z.infer<typeof courseSchema>;
export type CoursePreferences = z.infer<typeof coursePreferencesSchema>;
export type CourseUnit = z.infer<typeof courseUnitSchema>;
export type Homework = z.infer<typeof homeworkSchema>;
export type HomeworkSummary = z.infer<typeof homeworkSummarySchema>;
const courseResponse = z.object({ course: courseSchema });
export const courseWordsSchema = z.object({
  title: z.string(),
  unitKey: z.string(),
  targetLanguageCode: z.string(),
  supportLanguageCode: z.string(),
  words: z.array(
    z.object({
      sourceText: z.string(),
      choices: z.array(z.object({ id: uuid, translationText: z.string() })),
    }),
  ),
});
const homeworkResponse = z.object({ homework: homeworkSchema });
const realtimeResponse = z.object({
  realtime: z.object({
    clientSecret: z.string(),
    expiresAt: z.string().nullable(),
    model: z.string(),
    connectionUrl: z.union([
      z.literal("https://api.openai.com/v1/realtime/calls"),
      z.literal("/api/v1/realtime/connect"),
    ]),
    openingEvent: z.object({
      type: z.literal("response.create"),
      response: z.object({ instructions: z.string() }),
    }),
  }),
});
export const courseApi = {
  list: () =>
    product(
      z.object({
        courses: z.array(courseSchema),
        homework: z.array(homeworkSummarySchema),
        available: z.boolean(),
      }),
      "courses",
    ),
  get: (id: string) => product(courseResponse, `courses/${id}`),
  unitWords: (id: string, unitKey: string) =>
    product(
      courseWordsSchema,
      `courses/${id}/units/${encodeURIComponent(unitKey)}/words`,
    ),
  delete: (id: string) => product(z.undefined(), `courses/${id}`, "DELETE"),
  realtimeSession: (id: string) =>
    product(realtimeResponse, `courses/${id}/realtime-session`, "POST"),
  start: (input: {
    targetLanguageCode: string;
    supportLanguageCode: string;
    eventId: string;
  }) => product(courseResponse, "courses/intake", "POST", input),
  command: (
    id: string,
    path: string,
    input: Record<string, unknown>,
    method: "POST" | "PUT" = "POST",
  ) => product(courseResponse, `courses/${id}/${path}`, method, input),
  homework: (id: string) => product(homeworkResponse, `courses/homework/${id}`),
  homeworkCommand: (id: string, path: string, input: Record<string, unknown>) =>
    product(homeworkResponse, `courses/homework/${id}/${path}`, "POST", input),
  transcribe: (audioBase64: string, languageCode: string) =>
    product(z.object({ text: z.string() }), "courses/transcribe", "POST", {
      audioBase64,
      languageCode,
    }),
};
export function lessonLink(course: Course) {
  const preferences =
    course.versions.find((version) => version.version === course.activeVersion)
      ?.preferences ?? course.preferences;
  return `/private-lesson?course=${course.id}&language=${encodeURIComponent(preferences.targetLanguageCode)}`;
}
