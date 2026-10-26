import { z } from "zod";
import { product } from "./product";
import type { Program } from "./programs";

const band = z.enum(["Pre-A1", "A1", "A2", "B1", "B2", "C1"]);
const completion = z.object({
  at: z.string(),
  independent: z.boolean(),
  score: z.number(),
  source: z.string().optional(),
});
export const curriculumSchema = z.object({
  onboarding: z
    .object({
      theta: z.number(),
      startUnit: z.number(),
      goal: z.string(),
      deadlineMonths: z.number(),
      minutesPerDay: z.number(),
      reliability: z.number(),
      placedAt: z.string(),
    })
    .nullable()
    .optional(),
  tutor: z
    .object({
      unlocked: z.boolean(),
      reason: z.string(),
      done: z.number(),
      required: z.number(),
    })
    .optional(),
  program: z.object({
    id: z.string(),
    version: z.string(),
    title: z.string(),
    researchStatus: z.string(),
    attribution: z.string(),
  }),
  revision: z.number(),
  enrolled: z.boolean(),
  pathChoices: z
    .object({ units: z.array(z.string()), activities: z.array(z.string()) })
    .optional(),
  navigationComplete: z.boolean().optional(),
  settings: z
    .object({
      minutes: z.number(),
      literacy: z.enum(["starting", "developing", "independent"]),
      timezone: z.string(),
    })
    .nullable(),
  currentUnit: z.string(),
  completed: z.record(z.string(), completion),
  drafts: z.record(z.string(), z.string()),
  cursors: z.record(z.string(), z.number()),
  nextAction: z
    .object({
      kind: z.string(),
      id: z.string(),
      game: z.string().optional(),
      batch: z.number().optional(),
    })
    .nullable(),
  placement: z.record(
    z.string(),
    z.object({ band: z.string(), score: z.number(), independent: z.boolean() }),
  ),
  units: z.array(
    z.object({
      id: z.string(),
      band,
      title: z.string(),
      goal: z.string(),
      words: z.number(),
      unlocked: z.boolean(),
      waived: z.boolean(),
      skipped: z.boolean().optional(),
      lessons: z.array(
        z.object({ id: z.string(), title: z.string(), minutes: z.number() }),
      ),
      unseen: z.string().nullable(),
    }),
  ),
  phonics: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      minutes: z.number(),
      unlocked: z.boolean(),
    }),
  ),
  dailyPlan: z.array(z.object({ kind: z.string(), minutes: z.number() })),
  review: z.object({
    due: z.number(),
    introduced: z.number(),
    usable: z.number(),
    retained: z.number(),
    maintenance: z.number(),
    queue: z.array(
      z.object({ id: z.string(), dueAt: z.string(), status: z.string() }),
    ),
  }),
  reading: z.object({
    eligible: z.boolean(),
    remainingTargets: z.number(),
    remainingMinutes: z.number(),
    minWords: z.number(),
    maxWords: z.number(),
  }),
  activeMinutes: z.number(),
  articleJob: z.string().nullable(),
  evidence: z.array(z.unknown()),
  elective: z.object({
    count: z.number(),
    optional: z.boolean(),
    unlocked: z.boolean(),
  }),
  activeAttempts: z.record(z.string(), z.string()),
  practiceSessions: z.record(z.string(), z.string()).optional(),
  graduation: z.object({
    ready: z.boolean(),
    complete: z.boolean(),
    skills: z.array(z.string()),
  }),
});
export type Curriculum = z.infer<typeof curriculumSchema>;
const wordEvidence = z
  .object({ status: z.string(), dueAt: z.string() })
  .nullable();
export const curriculumUnitSchema = z.object({
  pathSteps: z
    .array(
      z.object({
        id: z.string(),
        complete: z.boolean(),
        skipped: z.boolean(),
        available: z.boolean(),
        batch: z.number().optional(),
      }),
    )
    .optional(),
  unit: z.object({
    id: z.string(),
    band,
    title: z.string(),
    goal: z.string(),
    grammar: z.string(),
    words: z.array(
      z.object({
        id: z.string(),
        en: z.string(),
        he: z.string(),
        unit: z.string(),
        band,
        track: z.string(),
        evidence: wordEvidence,
      }),
    ),
    support: z.array(z.unknown()),
    dialogue: z.array(
      z.object({
        speaker: z.string(),
        text_en: z.string(),
        text_he: z.string(),
      }),
    ),
    games: z.array(
      z.object({
        mode: z.string(),
        practised: z.number(),
        eligible: z.number(),
      }),
    ),
    passage: z.string(),
    writingPrompt: z.string(),
    roleplayPrompt: z.string(),
    lessons: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        minutes: z.number(),
        targets: z.array(z.object({ en: z.string(), he: z.string() })),
      }),
    ),
  }),
});
export type CurriculumUnit = z.infer<typeof curriculumUnitSchema>["unit"];
const grade = z.object({
  correct: z.boolean(),
  message: z.boolean(),
  criteria: z.array(z.boolean()),
  feedback: z.string(),
  answer: z.string().nullable(),
  independent: z.boolean(),
  modality: z.string(),
});
export const curriculumAttemptSchema = z.object({
  id: z.string(),
  activityId: z.string(),
  version: z.string(),
  cursor: z.number(),
  total: z.number(),
  result: z
    .object({
      score: z.number(),
      independent: z.boolean(),
      complete: z.boolean(),
    })
    .nullable(),
  question: z
    .object({
      id: z.string(),
      kind: z.string(),
      prompt: z.string(),
      text: z.string().nullable(),
      hasAudio: z.boolean(),
      audioParts: z.number(),
      hasHint: z.boolean(),
      choices: z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
            picture: z.string().optional(),
          }),
        )
        .nullable(),
      passage: z.string().nullable(),
      picture: z.string().nullable(),
    })
    .nullable(),
  feedback: grade.nullable(),
  assisted: z.boolean(),
});
export type CurriculumAttempt = z.infer<typeof curriculumAttemptSchema>;
export const teacherSchema = z.object({
  id: z.string(),
  band,
  title: z.string(),
  minutes: z.number(),
  cursor: z.number(),
  total: z.number(),
  complete: z.boolean(),
  phase: z
    .object({
      kind: z.string(),
      instruction: z.string(),
      english: z.string().nullable(),
      task: z.string().nullable(),
      contrast: z.string().nullable(),
      turns: z
        .array(
          z.object({
            speaker: z.string(),
            text_en: z.string(),
            text_he: z.string(),
          }),
        )
        .nullable(),
      support: z.array(z.string()).nullable(),
      passage: z.string().nullable(),
      target: z.string().nullable(),
    })
    .nullable(),
});
export type CurriculumTeacher = z.infer<typeof teacherSchema>;
export const phonicsSchema = z.object({
  session: z.object({
    id: z.string(),
    title: z.string(),
    mappings: z.array(
      z.object({
        grapheme: z.string(),
        phoneme: z.string(),
        example: z.string(),
      }),
    ),
    words: z.array(z.string()),
    sentence: z.string(),
    script: z.array(z.string()),
    caution: z.string(),
    decodability: z.string(),
    oralChunk: z.string(),
  }),
});
export type PhonicsSession = z.infer<typeof phonicsSchema>["session"];
export const articleSchema = z.object({
  id: z.string(),
  status: z.enum(["generating", "ready", "failed"]),
  title: z.string().nullable(),
  text: z.string().nullable(),
  coverage: z.number().nullable(),
  mode: z.enum(["independent", "guided"]),
  supportWords: z.array(z.string()),
  attempt: curriculumAttemptSchema.nullable(),
});
export type CurriculumArticle = z.infer<typeof articleSchema>;
const ack = z.object({
  saved: z.boolean().optional(),
  introduced: z.number().optional(),
  enrolled: z.boolean().optional(),
});
const root = "structured-english";
const placementResponse = z.object({
  applied: z.boolean(),
  reason: z.string().optional(),
  startUnit: z.number().optional(),
  unitId: z.string().optional(),
  skippedUnits: z.number().optional(),
  knownInSkippedUnits: z.number().optional(),
  gapQueued: z.number().optional(),
});
export type PlacementClaimInput = {
  eventId: string;
  theta: number;
  startUnit: number;
  literacy: "starting" | "developing" | "independent";
  minutesPerDay: number;
  goal: string;
  deadlineMonths: number;
  reliability: number;
  skills: {
    vocabulary: { band: string; score: number };
    reading: { band: string; score: number } | null;
    listening: { band: string; score: number } | null;
  };
  knownWords: string[];
  profile?: {
    selfLevel?: 0 | 1 | 2 | 3 | 4;
    talk?: { correct: number; total: number; unknown?: number };
    interests?: string[];
    priorities?: string[];
    targetBand?: string;
  };
};
export const curriculumApi = {
  place: (input: PlacementClaimInput) =>
    product(placementResponse, `${root}/placement`, "POST", input),
  pathChoice: (input: {
    eventId: string;
    revision: number;
    unitId: string;
    activityId?: string;
    skipped: boolean;
  }) => product(ack, `${root}/path-choices`, "POST", input),
  get: () => product(curriculumSchema, root),
  catalog: () =>
    product(
      z.object({
        programs: z.array(
          z.object({ id: z.string(), title: z.string(), path: z.string() }),
        ),
      }),
      `${root}/catalog`,
    ),
  enroll: (
    minutes: number,
    literacy: "starting" | "developing" | "independent",
    eventId: string = crypto.randomUUID(),
  ) => product(ack, `${root}/enroll`, "POST", { eventId, minutes, literacy }),
  unit: (id: string) =>
    product(curriculumUnitSchema, `${root}/units/${encodeURIComponent(id)}`),
  expose: (
    revision: number,
    targetIds: string[],
    eventId: string = crypto.randomUUID(),
  ) =>
    product(ack, `${root}/exposures`, "POST", { eventId, revision, targetIds }),
  save: (
    revision: number,
    activityId: string,
    draft: string,
    eventId: string = crypto.randomUUID(),
  ) =>
    product(ack, `${root}/work`, "POST", {
      eventId,
      revision,
      activityId,
      draft,
    }),
  heartbeat: (activityId: string) =>
    product(
      z.object({ activeSeconds: z.number() }),
      `${root}/heartbeat`,
      "POST",
      { eventId: crypto.randomUUID(), activityId },
    ),
  start: (
    revision: number,
    activityId: string,
    eventId: string = crypto.randomUUID(),
  ) =>
    product(curriculumAttemptSchema, `${root}/attempts`, "POST", {
      eventId,
      revision,
      activityId,
    }),
  attempt: (id: string) =>
    product(curriculumAttemptSchema, `${root}/attempts/${id}`),
  hint: (
    revision: number,
    attemptId: string,
    cursor: number,
    eventId: string = crypto.randomUUID(),
  ) =>
    product(
      z.object({ hint: z.string(), assisted: z.boolean() }),
      `${root}/hints`,
      "POST",
      { eventId, revision, attemptId, cursor },
    ),
  answer: (
    revision: number,
    attemptId: string,
    cursor: number,
    answer: string,
    choiceId?: string,
    transcriptionId?: string,
    eventId: string = crypto.randomUUID(),
  ) =>
    product(curriculumAttemptSchema, `${root}/answers`, "POST", {
      eventId,
      revision,
      attemptId,
      cursor,
      answer,
      choiceId,
      modality: transcriptionId ? "transcribed" : "typed",
      transcriptionId,
    }),
  audio: (attemptId: string, cursor: number, part = 0) =>
    product(
      z.object({ contentType: z.string(), audioBase64: z.string() }),
      `${root}/audio`,
      "POST",
      { attemptId, cursor, part },
    ),
  teachingAudio: (kind: "target" | "phonics", id: string, index = 0) =>
    product(
      z.object({ contentType: z.string(), audioBase64: z.string() }),
      `${root}/teaching-audio`,
      "POST",
      { kind, id, index },
    ),
  transcribe: (attemptId: string, cursor: number, audioBase64: string) =>
    product(
      z.object({ id: z.string(), text: z.string(), note: z.string() }),
      `${root}/transcriptions`,
      "POST",
      { attemptId, cursor, audioBase64 },
    ),
  phonics: (id: string) => product(phonicsSchema, `${root}/phonics/${id}`),
  unseen: (id: string) =>
    product(
      z.object({
        id: z.string(),
        title: z.string(),
        passage: z.string(),
        band,
        previouslyAttempted: z.boolean(),
      }),
      `${root}/unseen/${id}`,
    ),
  teacher: (id: string) => product(teacherSchema, `${root}/teacher/${id}`),
  teacherTurn: (
    revision: number,
    lessonId: string,
    answer: string,
    eventId: string = crypto.randomUUID(),
  ) =>
    product(
      z.object({
        feedback: z.string(),
        advanced: z.boolean(),
        assisted: z.boolean(),
        complete: z.boolean(),
      }),
      `${root}/teacher-turns`,
      "POST",
      { eventId, revision, lessonId, answer },
    ),
  article: (id: string) => product(articleSchema, `${root}/articles/${id}`),
  generateArticle: (revision: number, eventId: string = crypto.randomUUID()) =>
    product(articleSchema, `${root}/articles`, "POST", { eventId, revision }),
};
export function structuredProgram(data: Curriculum): Program {
  const completed = data.units.filter(
    (unit) => unit.waived || data.completed[`gate:${unit.id}`],
  ).length;
  return {
    id: data.program.id,
    title: data.program.title,
    description: "קריאה מהיסוד, אוצר מילים, מורה AI ותרגול עד C1",
    language: "en",
    supportLanguage: "he",
    level:
      data.units.find((unit) => unit.id === data.currentUnit)?.band ?? "Pre-A1",
    minutes: data.settings?.minutes ?? null,
    daysPerWeek: null,
    completed,
    total: data.units.length,
    status: data.graduation.complete ? "completed" : "ongoing",
    destination: "/english-learning",
    continueTo: "/english-learning",
    next:
      data.units.find((unit) => unit.id === data.currentUnit)?.title ?? null,
    lessonNumber: null,
    kind: "books",
    checkpoints: data.units
      .slice(Math.max(0, completed - 1), completed + 2)
      .map((unit) => ({
        title: unit.title,
        completed: Boolean(data.completed[`gate:${unit.id}`]),
      })),
  };
}
