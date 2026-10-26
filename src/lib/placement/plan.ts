/**
 * Turns a placement result and what the learner wants into a pace: how many units,
 * how long, and what a different daily time would change. Pure functions.
 */
import type { Band } from "./types";

export const GOALS = [
  "travel",
  "work",
  "study",
  "talk",
  "abroad",
  "other",
] as const;
export type Goal = (typeof GOALS)[number];

export const DEADLINES = [1, 3, 6, 0] as const; // months; 0 = no date
export type Deadline = (typeof DEADLINES)[number];

/** Last unit of each band in "English zero to C1" (6 + 12 + 12 + 18 + 18 + 18). */
export const BAND_END: Record<Band, number> = {
  "Pre-A1": 6,
  A1: 18,
  A2: 30,
  B1: 48,
  B2: 66,
  C1: 84,
};
const BAND_ORDER: Band[] = ["Pre-A1", "A1", "A2", "B1", "B2", "C1"];

/**
 * Average minutes a learner needs for one unit (12 steps of about six minutes).
 * A first estimate: recalibrate from real lesson data after the first month.
 */
export const MINUTES_PER_UNIT = 70;
export const DAYS_PER_WEEK = 5;
const WEEKS_PER_MONTH = 4.345;

export const GOAL_TARGET_BAND: Record<Goal, Band> = {
  travel: "A2",
  talk: "B1",
  work: "B1",
  abroad: "B2",
  study: "B2",
  other: "B1",
};

export function targetUnitFor(goal: Goal, startUnit: number): number {
  let band = GOAL_TARGET_BAND[goal];
  // A learner already at or past the usual target aims for the next band.
  while (BAND_END[band] <= startUnit + 3 && band !== "C1")
    band = BAND_ORDER[BAND_ORDER.indexOf(band) + 1]!;
  return BAND_END[band];
}

export type Plan = {
  startUnit: number;
  targetUnit: number;
  targetBand: Band;
  units: number;
  totalMinutes: number;
  minutesPerDay: number;
  /** Weeks at the chosen daily time. */
  weeks: number;
  /** Plausible range, +-25%, in months. */
  monthsLow: number;
  monthsHigh: number;
  months: number;
  /** Daily minutes that would reach the target by the chosen deadline. */
  minutesForDeadline: number | null;
  feasibility: "ok" | "stretch" | "unrealistic" | "open";
};

export function buildPlan(input: {
  startUnit: number;
  goal: Goal;
  minutesPerDay: number;
  deadlineMonths: Deadline;
  daysPerWeek?: number;
}): Plan {
  const days = input.daysPerWeek ?? DAYS_PER_WEEK;
  const targetUnit = targetUnitFor(input.goal, input.startUnit);
  const targetBand = BAND_ORDER.find((b) => BAND_END[b] === targetUnit) ?? "C1";
  const units = Math.max(1, targetUnit - input.startUnit);
  const totalMinutes = units * MINUTES_PER_UNIT;
  const perWeek = Math.max(1, input.minutesPerDay) * days;
  const weeks = totalMinutes / perWeek;
  const months = weeks / WEEKS_PER_MONTH;
  const minutesForDeadline = input.deadlineMonths
    ? Math.ceil(totalMinutes / (input.deadlineMonths * WEEKS_PER_MONTH * days))
    : null;
  let feasibility: Plan["feasibility"] = "open";
  if (minutesForDeadline !== null) {
    if (input.minutesPerDay >= minutesForDeadline * 0.9) feasibility = "ok";
    else if (minutesForDeadline <= 30) feasibility = "stretch";
    else feasibility = "unrealistic";
  }
  return {
    startUnit: input.startUnit,
    targetUnit,
    targetBand,
    units,
    totalMinutes,
    minutesPerDay: input.minutesPerDay,
    weeks,
    months,
    monthsLow: months * 0.75,
    monthsHigh: months * 1.25,
    minutesForDeadline,
    feasibility,
  };
}

/** First unit of each band (1-based). */
export const BAND_START: Record<Band, number> = {
  "Pre-A1": 1,
  A1: 7,
  A2: 19,
  B1: 31,
  B2: 49,
  C1: 67,
};

/** Band and position inside it for a unit on the 0-84 scale. */
export function bandInfo(theta: number): {
  band: Band;
  sub: "low" | "mid" | "high";
} {
  const unit = Math.min(84, Math.max(1, Math.round(theta)));
  const band = BAND_ORDER.find((b) => unit <= BAND_END[b]) ?? "C1";
  const span = BAND_END[band] - BAND_START[band] + 1;
  const progress = (unit - BAND_START[band]) / span;
  return {
    band,
    sub: progress < 1 / 3 ? "low" : progress < 2 / 3 ? "mid" : "high",
  };
}
