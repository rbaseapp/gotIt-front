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
  "focus",
  "pocket",
  "result",
  "plan",
  "firstWords",
  "save",
] as const;
export type Step = (typeof STEPS)[number];
export type Focus = "words" | "goal" | "scratch";

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
export const priorFor = (focus: Focus | null) => (focus === "scratch" ? 6 : 30);

export const stepIndex = (step: Step) => STEPS.indexOf(step) + 1;
