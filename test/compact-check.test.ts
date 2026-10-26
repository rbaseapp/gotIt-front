import { describe, expect, it } from "vitest";
import bankJson from "../src/data/placement/bank.json";
import {
  PlacementSession,
  seededRandom,
  sigmoid,
} from "../src/lib/placement/engine";
import type { PlacementBank } from "../src/lib/placement/types";

const bank = bankJson as unknown as PlacementBank;
const SELF_UNITS = [4, 18, 39, 57, 75];

/** A learner who describes their level within one step of the truth, then takes the 10-question check. */
function run(
  theta: number,
  selfUnits: number,
  seed: number,
  format: "yesno" | "meaning",
) {
  const rng = seededRandom(seed);
  const session = new PlacementSession(bank, {
    prior: selfUnits,
    format,
    maxQuestions: 10,
    priorSd: 12,
    rng: seededRandom(seed + 7),
  });
  for (let card = session.nextCard(); card; card = session.nextCard()) {
    const knows = rng() < sigmoid((theta - card.d) / 6);
    const yes =
      card.kind === "pseudo"
        ? rng() < 0.08
        : card.options
          ? knows
            ? rng() > 0.04
            : rng() < 0.15
          : knows
            ? rng() > 0.04
            : rng() < 0.08;
    session.answerCard(card, yes, 1500);
  }
  return session;
}

describe("the 10-question check", () => {
  for (const format of ["yesno", "meaning"] as const) {
    it(`never asks more than 10 and lands close to the truth (${format})`, () => {
      const errors: number[] = [];
      let longest = 0;
      for (const theta of [4, 10, 20, 32, 45, 60, 72]) {
        for (let seed = 1; seed <= 20; seed++) {
          // The self level is the nearest level, sometimes one off.
          const nearest = SELF_UNITS.reduce(
            (best, u, i) =>
              Math.abs(u - theta) < Math.abs(SELF_UNITS[best]! - theta)
                ? i
                : best,
            0,
          );
          const off = seed % 5 === 0 ? (seed % 2 ? 1 : -1) : 0;
          const self = SELF_UNITS[Math.min(4, Math.max(0, nearest + off))]!;
          const session = run(theta, self, seed * 17 + theta, format);
          longest = Math.max(longest, session.cards);
          errors.push(Math.abs(session.estimate().median - theta));
        }
      }
      const sorted = [...errors].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)]!;
      const within5 = errors.filter((e) => e <= 5).length / errors.length;
      expect(longest).toBeLessThanOrEqual(10);
      expect(median).toBeLessThanOrEqual(4);
      expect(within5).toBeGreaterThanOrEqual(0.6);
    });
  }
});

it("keeps someone who says 'zero' at the very start without asking anything", () => {
  const session = new PlacementSession(bank, {
    prior: SELF_UNITS[0]!,
    format: "yesno",
    maxQuestions: 10,
    priorSd: 3,
    rng: seededRandom(1),
  });
  const result = session.result({ literacy: "starting", seconds: 0 });
  expect(result.band).toBe("Pre-A1");
  expect(result.startUnit).toBeLessThanOrEqual(3);
  expect(result.knownEstimate).toBeLessThanOrEqual(300);
});
