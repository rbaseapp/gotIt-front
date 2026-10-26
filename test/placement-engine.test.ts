import { describe, expect, it } from "vitest";
import bankJson from "../src/data/placement/bank.json";
import {
  PlacementSession,
  seededRandom,
  sigmoid,
} from "../src/lib/placement/engine";
import { buildPlan, targetUnitFor } from "../src/lib/placement/plan";
import type { PlacementBank } from "../src/lib/placement/types";

const bank = bankJson as unknown as PlacementBank;

type Learner = {
  theta: number;
  /** True width of the learner's knowledge boundary (the engine assumes 8). */
  scale: number;
  /** Chance of saying "know" to a word they do not know, and to non-words. */
  overclaim: number;
  slip?: number;
};

function runLearner(
  learner: Learner,
  seed: number,
  mode: "full" | "quick" = "full",
) {
  const rng = seededRandom(seed);
  const session = new PlacementSession(bank, {
    prior: 30,
    mode,
    rng: seededRandom(seed + 7),
  });
  const knows = (d: number) =>
    rng() < sigmoid((learner.theta - d) / learner.scale);
  for (let card = session.nextCard(); card; card = session.nextCard()) {
    const yes =
      card.kind === "pseudo"
        ? rng() < learner.overclaim
        : knows(card.d)
          ? rng() > (learner.slip ?? 0.04)
          : rng() < learner.overclaim;
    session.answerCard(card, yes, 1500);
  }
  for (const item of session.verifyItems(4)) {
    const truly = knows(item.d);
    const picked =
      truly && rng() > 0.05
        ? item.answer
        : (item.answer + 1) % item.options.length;
    session.answerVerify(item, picked, 4000);
  }
  for (const skill of ["reading", "listening"] as const) {
    for (let i = 0; i < 2; i++) {
      const probe = session.nextProbe(skill);
      if (!probe) break;
      const p = 1 / 3 + (2 / 3) * sigmoid((learner.theta - probe.d) / 10);
      session.answerProbe(
        probe,
        skill,
        rng() < p ? probe.a : (probe.a + 1) % 3,
        9000,
      );
    }
  }
  return session;
}

const percentile = (values: number[], q: number) =>
  [...values].sort((a, b) => a - b)[
    Math.min(values.length - 1, Math.floor(values.length * q))
  ]!;

describe("placement bank", () => {
  it("covers every band, with no loanwords and unique words", () => {
    const bands = new Set(bank.words.map((w) => bank.units[w[1] - 1]!.band));
    expect([...bands].sort()).toEqual(["A1", "A2", "B1", "B2", "C1", "Pre-A1"]);
    const texts = bank.words.map((w) => w[0].toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
    for (const loan of ["hotel", "taxi", "bus", "internet", "coffee", "museum"])
      expect(texts).not.toContain(loan);
    expect(bank.pseudo.length).toBeGreaterThanOrEqual(300);
    for (const fake of bank.pseudo) expect(texts).not.toContain(fake);
    expect(bank.units).toHaveLength(84);
  });
});

describe("placement engine (simulated learners)", () => {
  const levels = Array.from({ length: 16 }, (_, i) => 3 + i * 5);

  it("places honest learners within a few units and finishes quickly", () => {
    const errors: number[] = [];
    const cards: number[] = [];
    let n = 0;
    for (const theta of levels)
      for (let k = 0; k < 14; k++) {
        const s = runLearner({ theta, scale: 10, overclaim: 0.04 }, 1000 + n++);
        errors.push(Math.abs(s.estimate().median - theta));
        cards.push(s.cards);
      }
    expect(percentile(errors, 0.5)).toBeLessThanOrEqual(5);
    expect(percentile(errors, 0.9)).toBeLessThanOrEqual(13);
    expect(percentile(cards, 0.5)).toBeLessThanOrEqual(26);
    expect(percentile(cards, 0.9)).toBeLessThanOrEqual(33);
    expect(Math.max(...cards)).toBeLessThanOrEqual(40);
  });

  it("is not fooled by learners who say 'know' too freely", () => {
    const biases: number[] = [];
    let n = 0;
    for (const theta of [10, 20, 30, 40, 50])
      for (let k = 0; k < 20; k++) {
        const s = runLearner({ theta, scale: 10, overclaim: 0.3 }, 5000 + n++);
        biases.push(s.estimate().median - theta);
      }
    const mean = biases.reduce((a, b) => a + b, 0) / biases.length;
    expect(mean).toBeLessThan(16);
  });

  it("does not hand a high level to someone who says 'know' to everything", () => {
    for (let seed = 0; seed < 10; seed++) {
      const s = runLearner(
        { theta: 0, scale: 10, overclaim: 1, slip: 0 },
        9000 + seed,
      );
      const r = s.result({ literacy: "reader", seconds: 120 });
      expect(r.uncertain).toBe(true);
      expect(r.reliability).toBeLessThan(0.5);
    }
  });

  it("ends early and low for someone who knows almost nothing", () => {
    for (let seed = 0; seed < 8; seed++) {
      const s = runLearner(
        { theta: 0, scale: 8, overclaim: 0.02 },
        12000 + seed,
      );
      expect(s.estimate().median).toBeLessThanOrEqual(9);
      expect(s.cards).toBeLessThanOrEqual(22);
    }
  });

  it("quick mode is shorter and still sensible", () => {
    const cards: number[] = [];
    const errors: number[] = [];
    for (let k = 0; k < 40; k++) {
      const theta = 8 + (k % 8) * 9;
      const s = runLearner(
        { theta, scale: 10, overclaim: 0.05 },
        15000 + k,
        "quick",
      );
      cards.push(s.cards);
      errors.push(Math.abs(s.estimate().median - theta));
    }
    expect(Math.max(...cards)).toBeLessThanOrEqual(22);
    expect(percentile(errors, 0.5)).toBeLessThanOrEqual(7);
  });

  it("never repeats a card and keeps non-words to about a quarter", () => {
    const s = runLearner({ theta: 35, scale: 10, overclaim: 0.05 }, 77);
    const cards = s.log.filter((o) => o.t === "card");
    const texts = cards.map((o) => (o as { text: string }).text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
    const pseudo = cards.filter((o) => o.t === "card" && !o.real).length;
    expect(pseudo / cards.length).toBeLessThanOrEqual(0.3);
    expect(pseudo).toBeGreaterThanOrEqual(3);
  });

  it("starts with easy cards, whatever the level", () => {
    const rng = seededRandom(3);
    const s = new PlacementSession(bank, { prior: 40, rng });
    const first = s.nextCard()!;
    expect(first.kind).toBe("word");
    expect(first.d).toBeLessThanOrEqual(36);
  });

  it("builds verification questions that contain exactly one right answer", () => {
    const s = runLearner({ theta: 45, scale: 8, overclaim: 0.02 }, 31);
    const items = s.verifyItems(4);
    expect(items.length).toBeGreaterThanOrEqual(3);
    for (const item of items) {
      expect(new Set(item.options).size).toBe(item.options.length);
      expect(item.options.length).toBeGreaterThanOrEqual(2);
      expect(item.answer).toBeGreaterThanOrEqual(0);
      const word = bank.words.find((w) => w[0] === item.text)!;
      expect(item.options[item.answer]).toBe(word[2]);
    }
  });

  it("asks a harder reading probe after a right answer and an easier one after a wrong answer", () => {
    const up = new PlacementSession(bank, { prior: 30, rng: seededRandom(5) });
    const first = up.nextProbe("reading")!;
    up.answerProbe(first, "reading", first.a, 5000);
    expect(up.nextProbe("reading")!.d).toBeGreaterThan(first.d);
    const down = new PlacementSession(bank, {
      prior: 30,
      rng: seededRandom(5),
    });
    const same = down.nextProbe("reading")!;
    down.answerProbe(same, "reading", (same.a + 1) % 3, 5000);
    expect(down.nextProbe("reading")!.d).toBeLessThan(same.d);
  });

  it("reports a plan start two units under the level and a word estimate", () => {
    const s = runLearner({ theta: 28, scale: 9, overclaim: 0.03 }, 41);
    const r = s.result({ literacy: "reader", seconds: 150 });
    expect(r.startUnit).toBe(r.theta - 2);
    expect(r.knownEstimate % 50).toBe(0);
    expect(r.knownEstimate).toBeGreaterThan(300);
    expect(r.knownEstimate).toBeLessThan(r.total);
    expect(r.knownWords.length).toBeGreaterThan(5);
    expect(r.seedWords.length).toBeGreaterThan(0);
  });

  it("flags a weak reading skill when reading probes fail at the vocabulary level", () => {
    const s = runLearner({ theta: 40, scale: 8, overclaim: 0.02 }, 52);
    // Replace the probe evidence with a failed reading and passed listening pair at level.
    s.log.splice(0, s.log.length, ...s.log.filter((o) => o.t !== "probe"));
    const r1 = s.nextProbe("reading")!;
    s.answerProbe(r1, "reading", (r1.a + 1) % 3, 8000);
    const r2 = s.nextProbe("reading")!;
    s.answerProbe(r2, "reading", (r2.a + 1) % 3, 8000);
    const l1 = s.nextProbe("listening")!;
    s.answerProbe(l1, "listening", l1.a, 8000);
    const result = s.result({ literacy: "reader", seconds: 150 });
    expect(result.skills.reading).toBe("weak");
    expect(["ok", "strong"]).toContain(result.skills.listening);
  });

  it("can undo the last card", () => {
    const s = new PlacementSession(bank, { prior: 30, rng: seededRandom(9) });
    const card = s.nextCard()!;
    s.answerCard(card, true, 1000);
    expect(s.cards).toBe(1);
    expect(s.undoCard()).toBe(true);
    expect(s.cards).toBe(0);
    expect(s.log).toHaveLength(0);
  });
});

describe("plan", () => {
  it("aims at the next band when the learner is already near the usual target", () => {
    expect(targetUnitFor("travel", 5)).toBe(30);
    expect(targetUnitFor("travel", 28)).toBe(48);
    expect(targetUnitFor("work", 20)).toBe(48);
    expect(targetUnitFor("study", 64)).toBe(84);
    expect(targetUnitFor("study", 60)).toBe(66);
  });

  it("computes time and the daily minutes needed for a deadline", () => {
    const plan = buildPlan({
      startUnit: 25,
      goal: "work",
      minutesPerDay: 10,
      deadlineMonths: 3,
    });
    expect(plan.targetUnit).toBe(48);
    expect(plan.units).toBe(23);
    expect(plan.totalMinutes).toBe(23 * 70);
    expect(plan.months).toBeGreaterThan(6);
    expect(plan.months).toBeLessThan(8);
    expect(plan.minutesForDeadline).toBeGreaterThan(24);
    expect(plan.minutesForDeadline).toBeLessThan(27);
    expect(plan.feasibility).toBe("stretch");
    expect(plan.monthsLow).toBeCloseTo(plan.months * 0.75);
  });

  it("marks plans as open when there is no deadline", () => {
    const plan = buildPlan({
      startUnit: 10,
      goal: "talk",
      minutesPerDay: 15,
      deadlineMonths: 0,
    });
    expect(plan.feasibility).toBe("open");
    expect(plan.minutesForDeadline).toBeNull();
  });

  it("calls a deadline realistic when the daily time is enough", () => {
    const plan = buildPlan({
      startUnit: 25,
      goal: "travel",
      minutesPerDay: 20,
      deadlineMonths: 3,
    });
    expect(plan.feasibility).toBe("ok");
  });
});

describe("placement engine, meaning questions", () => {
  function runMeaning(theta: number, seed: number) {
    const rng = seededRandom(seed);
    const session = new PlacementSession(bank, {
      prior: 30,
      mode: "full",
      format: "meaning",
      rng: seededRandom(seed + 7),
    });
    for (let card = session.nextCard(); card; card = session.nextCard()) {
      expect(card.options).toHaveLength(4);
      expect(
        card.options!.filter((o) => o === card.options![card.answer!]),
      ).toHaveLength(1);
      const knows = rng() < sigmoid((theta - card.d) / 6);
      // Guessing the meaning of an unknown word is rare: most say "don't know".
      const correct = knows ? rng() > 0.04 : rng() < 0.15;
      session.answerCard(card, correct, 3000);
    }
    return session;
  }

  it("never shows non-words and asks for a checked answer every time", () => {
    const session = runMeaning(30, 3);
    expect(session.log.every((o) => o.t !== "card" || (o.real && o.mc))).toBe(
      true,
    );
    expect(session.verifyItems(4)).toEqual([]);
  });

  it("places honest learners within a few units in under 30 questions", () => {
    const errors: number[] = [];
    const counts: number[] = [];
    for (const theta of [4, 10, 20, 32, 45, 60, 72]) {
      for (let seed = 1; seed <= 10; seed++) {
        const session = runMeaning(theta, seed * 31 + theta);
        errors.push(Math.abs(session.estimate().median - theta));
        counts.push(session.cards);
      }
    }
    expect(percentile(errors, 0.5)).toBeLessThanOrEqual(5);
    expect(percentile(counts, 0.9)).toBeLessThanOrEqual(30);
  });

  it("cannot be inflated by saying 'know' - only right answers count", () => {
    const session = new PlacementSession(bank, {
      prior: 30,
      mode: "full",
      format: "meaning",
      rng: seededRandom(5),
    });
    // Someone who always picks the first option (a blind guess).
    for (let card = session.nextCard(); card; card = session.nextCard())
      session.answerCard(card, card.answer === 0, 3000);
    expect(session.estimate().median).toBeLessThan(25);
  });
});
