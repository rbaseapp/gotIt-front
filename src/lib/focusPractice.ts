import { z } from "zod";
import {
  exerciseSchema,
  capabilitiesSchema,
  sessionSchema,
  studyCardsSchema,
  uuid,
  type AttemptReceipt,
  type StudyCard,
} from "./product";
import { practiceDesignEnabled } from "./practiceDesign";

export const focusModes = [
  "flashcards",
  "matching",
  "drag_drop",
  "listening",
  "pronunciation",
  "recall",
] as const;
export type FocusMode = (typeof focusModes)[number];

export function wholeWordClozeContext(context: string | null | undefined) {
  if (!context) return undefined;
  // Older issued exercises/checkpoints can contain gaps inside a word.
  for (const { segment } of new Intl.Segmenter(undefined, {
    granularity: "word",
  }).segment(context)) {
    if (/_{2,}/u.test(segment) && !/^_{2,}$/u.test(segment)) return undefined;
  }
  return context;
}

export function focusGamesEnabled(type: string) {
  return (
    practiceDesignEnabled() &&
    (type === "smart" || focusModes.some((mode) => mode === type))
  );
}
export const exerciseTypeFor = (mode: FocusMode) =>
  mode === "drag_drop"
    ? "recall"
    : mode === "listening"
      ? "listening_spelling"
      : mode;

/** Capabilities lists profile languages, which can omit languages in the library. */
export function focusSkills(
  capabilities: z.infer<typeof capabilitiesSchema>,
  language: string,
  preferences?: { enabledSkills: string[] },
): string[] {
  const configured = capabilities.learningLanguages.find(
    (entry) => entry.languageCode === language,
  );
  // An explicitly empty capability list remains authoritative.
  return (
    configured?.enabledSkills ??
    preferences?.enabledSkills ?? [
      "recognition",
      "recall",
      "listening",
      "spelling",
      "pronunciation",
    ]
  );
}
export function focusSequence(
  type: string,
  skills: string[],
  speech: boolean,
  itemCount: number,
  distinctMeanings = itemCount,
): FocusMode[] {
  if (type !== "smart") {
    const allowed =
      type === "flashcards" || type === "matching"
        ? skills.includes("recognition")
        : type === "drag_drop" || type === "recall"
          ? skills.includes("recall")
          : type === "listening"
            ? speech &&
              skills.includes("listening") &&
              skills.includes("spelling")
            : type === "pronunciation"
              ? speech && skills.includes("pronunciation")
              : false;
    return allowed ? focusModes.filter((mode) => mode === type) : [];
  }
  return [
    ...(skills.includes("recognition") ? ["flashcards" as const] : []),
    ...(skills.includes("recognition") && distinctMeanings >= 2
      ? ["matching" as const]
      : []),
    ...(skills.includes("recall")
      ? [itemCount >= 2 ? ("drag_drop" as const) : ("recall" as const)]
      : []),
    ...(speech && skills.includes("listening") && skills.includes("spelling")
      ? ["listening" as const]
      : []),
    ...(speech && skills.includes("pronunciation")
      ? ["pronunciation" as const]
      : []),
  ];
}
export function matchingItemIds(cards: StudyCard[]) {
  const meanings = new Set<string>();
  return cards
    .filter((card) => {
      const meaning = card.translationText
        .normalize("NFKC")
        .trim()
        .toLocaleLowerCase();
      if (meanings.has(meaning)) return false;
      meanings.add(meaning);
      return true;
    })
    .map((card) => card.learningItemId);
}
export const focusOutcomeSchema = z.object({
  attemptId: uuid,
  itemId: uuid,
  exerciseId: uuid,
  stage: z.number().int().nonnegative(),
  mode: z.enum(focusModes).optional(),
  review: z.boolean().optional(),
  result: z.enum([
    "correct",
    "partially_correct",
    "incorrect",
    "skipped",
    "self_rated",
  ]),
  score: z.number().nullable(),
  xp: z.number().nonnegative(),
  expectedAnswer: z.string().nullable(),
  xpKnown: z.boolean().optional(),
  pronunciationFeedback: z.string().max(2000).optional(),
  choiceText: z.string().max(2000).optional(),
});
export type FocusOutcome = z.infer<typeof focusOutcomeSchema>;
/** Completion in the UI is distinct from unassisted learning evidence. */
export function solved(outcome: Pick<FocusOutcome, "result" | "score">) {
  return remembered(outcome) || outcome.result === "partially_correct";
}
export function remembered(outcome: Pick<FocusOutcome, "result" | "score">) {
  return (
    outcome.result === "correct" ||
    (outcome.result === "self_rated" && (outcome.score ?? 0) >= 60)
  );
}
export function outcomeFrom(
  receipt: AttemptReceipt,
  exerciseId: string,
  stage: number,
  mode?: FocusMode,
  review = false,
): FocusOutcome {
  return {
    attemptId: receipt.attempt.id,
    itemId: receipt.attempt.learningItemId,
    exerciseId,
    stage,
    mode,
    review,
    result: receipt.attempt.result,
    score: receipt.attempt.score,
    xp: receipt.attempt.xpEarned,
    expectedAnswer: receipt.attempt.expectedAnswer,
    pronunciationFeedback: receipt.attempt.pronunciationFeedback,
  };
}
export function reviewItems(outcomes: FocusOutcome[]) {
  const results = new Map<string, Map<string, boolean>>();
  for (const outcome of outcomes) {
    if (outcome.result === "skipped") continue;
    const item = results.get(outcome.itemId) ?? new Map<string, boolean>();
    if (outcome.review && remembered(outcome)) item.clear();
    else item.set(outcome.mode ?? String(outcome.stage), remembered(outcome));
    results.set(outcome.itemId, item);
  }
  return [...results]
    .filter(([, modes]) => [...modes.values()].some((success) => !success))
    .map(([id]) => id);
}
export function stageSummary(outcomes: FocusOutcome[], stage: number) {
  const values = outcomes.filter((value) => value.stage === stage);
  const first = [
    ...new Map(
      [...values].reverse().map((value) => [value.itemId, value]),
    ).values(),
  ];
  return {
    total: first.length,
    correct: first.filter(remembered).length,
    review: reviewItems(values).length,
    skipped: values.filter((value) => value.result === "skipped").length,
  };
}
export function formatPracticeTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
/** A shuffled response tray, using the authorized study-card contract. Never scores answers. */
export function listeningLetters(card: StudyCard, exerciseId: string) {
  const letters = [...card.sourceText.normalize("NFC")].filter(
    (char) => !/\s/u.test(char),
  );
  if (letters.length > 20) return [];
  const similar: Record<string, string> = {
    a: "eou",
    e: "aiy",
    i: "eyj",
    o: "uaw",
    u: "oaw",
    b: "pdv",
    c: "ksq",
    d: "tbp",
    f: "vpw",
    g: "jkq",
    h: "ywq",
    j: "giy",
    k: "cqg",
    l: "rnw",
    m: "nbp",
    n: "mlr",
    p: "bfv",
    q: "kcg",
    r: "lwn",
    s: "zct",
    t: "dks",
    v: "wbf",
    w: "vur",
    x: "ksz",
    y: "iej",
    z: "scx",
  };
  const distractors = /^[a-zA-Z\s'-]+$/u.test(card.sourceText)
    ? [
        ...new Set(
          letters.flatMap((letter) => [
            ...(similar[letter.toLowerCase()] ?? "aeo"),
          ]),
        ),
      ].slice(0, 3)
    : [];
  const bank = [...letters, ...distractors];
  // Stable across renders/reloads; repeated letters remain separate usable tiles.
  let seed = [...exerciseId].reduce(
    (n, char) => (n * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
  for (let i = bank.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [bank[i], bank[j]] = [bank[j], bank[i]];
  }
  return bank;
}
export const focusCheckpointSchema = z.object({
  version: z.literal(1),
  type: z.string(),
  language: z.string(),
  sessionId: uuid,
  sequence: z.array(z.enum(focusModes)).min(1).max(100),
  stage: z.number().int().min(0).max(99),
  phase: z.enum(["play", "transition", "end"]),
  exercises: z.array(exerciseSchema).max(100),
  outcomes: z.array(focusOutcomeSchema).max(1000),
  stageItems: z.array(uuid).max(100),
  answer: z.string().max(2000),
  flipped: z.boolean(),
  hintIds: z.array(uuid).max(100),
  activeId: uuid.optional(),
  pending: z
    .object({
      eventId: uuid,
      path: z.literal("practice/attempts"),
      body: z.record(z.string(), z.unknown()),
    })
    .optional(),
  session: sessionSchema,
  studyCards: studyCardsSchema.shape.cards.max(100).optional(),
  baselineXp: z.number().nonnegative().optional(),
  baselineAttemptIds: z.array(uuid).max(1000).optional(),
  stageStartedAt: z.string().optional(),
  reviewStages: z.array(z.number().int().nonnegative()).optional(),
  difficultIds: z.array(uuid).max(100).optional(),
  listeningRequeues: z.array(uuid).max(100).optional(),
  letterErrors: z.record(z.string(), z.number().int().nonnegative()).optional(),
  speakingPausedUntil: z.number().optional(),
  initialStreak: z.number().int().nonnegative().optional(),
});
export type FocusCheckpoint = z.infer<typeof focusCheckpointSchema>;
export const checkpointKey = (userId: string, sessionId: string) =>
  `gotit.focus.v1:${userId}:${sessionId}`;
export function readFocusCheckpoint(
  userId: string,
  sessionId: string,
): FocusCheckpoint | undefined {
  try {
    const value = focusCheckpointSchema.safeParse(
      JSON.parse(
        sessionStorage.getItem(checkpointKey(userId, sessionId)) || "null",
      ),
    );
    return value.success && value.data.sessionId === sessionId
      ? value.data
      : undefined;
  } catch {
    return undefined;
  }
}
