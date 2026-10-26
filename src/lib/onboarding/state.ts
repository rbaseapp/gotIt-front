/**
 * Everything the onboarding remembers before the learner has an account.
 * It lives in this browser only, and is merged into the account at sign-up
 * (see claim.ts). A learner who closes the tab can pick up where they stopped.
 */
import type { Deadline, Goal } from "../placement/plan";
import type {
  Literacy,
  Observation,
  PlacementResult,
} from "../placement/types";

export const ONBOARDING_STORAGE_KEY = "gotit.onboarding.v1";

export const STEPS = [
  "language",
  "about",
  "goal",
  "pocket",
  "talk",
  "result",
  "plan",
  "save",
] as const;
export type Step = (typeof STEPS)[number];
export type Focus = "words" | "goal" | "scratch";
/** How the learner prefers to answer: by talking to the avatar or by tapping choices. */
export type AnswerMode = "voice" | "text";
/** A band, never a birth date. Under 9 is treated as not yet reading: pictures and voice first. */
export type AgeBand = "under9" | "9-12" | "13-17" | "18+";
export type ReadingComfort = "easy" | "some" | "hard";
/** Self-assessed English: 0 almost none, 1 words and simple sentences, 2 simple talk, 3 fluent. */
export type SelfLevel = 0 | 1 | 2 | 3;

export type PocketPhase =
  "intro" | "literacy" | "cards" | "verify" | "probes" | "done";

export type OnboardingState = {
  v: 1;
  step: Step;
  language: string;
  focus: Focus | null;
  literacy: Literacy | null;
  /** Saved answers of the placement session, replayed to rebuild it. */
  log: Observation[];
  phase: PocketPhase;
  startedAt: number;
  result: PlacementResult | null;
  /** Manual correction, in units, when the learner says the level is off. */
  adjust: number;
  /** Answers to the tap-to-answer conversation check, when it was done. */
  talk: { correct: number; total: number; unknown?: number } | null;
  answerMode: AnswerMode | null;
  ageBand: AgeBand | null;
  readingComfort: ReadingComfort | null;
  selfLevel: SelfLevel | null;
  goal: Goal | null;
  deadline: Deadline;
  minutes: number;
  firstWords: string[];
  firstWordsDone: string[];
  /** Words the learner already tried on the landing page. */
  landing: Observation[];
};

export const initialOnboarding = (): OnboardingState => ({
  v: 1,
  step: "language",
  language: "en",
  focus: null,
  literacy: null,
  log: [],
  phase: "intro",
  startedAt: Date.now(),
  result: null,
  adjust: 0,
  talk: null,
  answerMode: null,
  ageBand: null,
  readingComfort: null,
  selfLevel: null,
  goal: null,
  deadline: 3,
  minutes: 10,
  firstWords: [],
  firstWordsDone: [],
  landing: [],
});

export function loadOnboarding(): OnboardingState | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as OnboardingState;
    if (value?.v !== 1 || !STEPS.includes(value.step)) return null;
    // A week-old, unfinished check is stale: levels change.
    if (Date.now() - value.startedAt > 7 * 86_400_000) return null;
    // Older saved sessions used other step names.
    return { ...initialOnboarding(), ...value };
  } catch {
    return null;
  }
}

export function saveOnboarding(state: OnboardingState) {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode: the flow still works, it just cannot be resumed.
  }
}

export function clearOnboarding() {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Where the first guess sits on the 0-84 scale, from what the learner wants. */
export const SELF_LEVEL_UNITS: Record<SelfLevel, number> = {
  0: 6,
  1: 16,
  2: 30,
  3: 48,
};

/** A starting guess only: the check itself decides the level. */
export const priorFor = (
  focus: Focus | null,
  selfLevel: SelfLevel | null = null,
) =>
  focus === "scratch"
    ? 6
    : selfLevel === null
      ? 30
      : SELF_LEVEL_UNITS[selfLevel];

export const stepIndex = (step: Step) => STEPS.indexOf(step) + 1;

/**
 * The steps the progress bar counts. The conversation check is part of the check, and a
 * signed-in learner has no language screen and no sign-up screen.
 */
export function progressSteps(account: boolean): Step[] {
  return STEPS.filter(
    (name) =>
      name !== "talk" && (!account || (name !== "language" && name !== "save")),
  );
}
