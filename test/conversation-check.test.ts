import { describe, expect, it } from "vitest";
import {
  TALK_ITEMS,
  TALK_QUESTIONS,
  TalkCheck,
  talkBandFor,
  talkDelta,
  topicForGoal,
} from "../src/lib/placement/conversationCheck";
import { seededRandom } from "../src/lib/placement/engine";

describe("conversation check items", () => {
  it("has three distinct replies per question and unique ids", () => {
    const ids = TALK_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of TALK_ITEMS) expect(new Set(item.replies).size).toBe(3);
  });
  it("covers every level and topic", () => {
    for (const band of ["A1", "A2", "B1", "B2"])
      for (const topic of ["general", "work", "travel"])
        expect(
          TALK_ITEMS.filter((i) => i.band === band && i.topic === topic),
        ).toHaveLength(3);
  });
  it("maps goals to topics and levels to bands", () => {
    expect(topicForGoal("work")).toBe("work");
    expect(topicForGoal("study")).toBe("work");
    expect(topicForGoal("travel")).toBe("travel");
    expect(topicForGoal("talk")).toBe("general");
    expect(topicForGoal(null)).toBe("general");
    expect([10, 25, 40, 60].map(talkBandFor)).toEqual(["A1", "A2", "B1", "B2"]);
  });
});

describe("conversation check", () => {
  const run = (theta: number, rights: boolean[]) => {
    const check = new TalkCheck(theta, "work", seededRandom(4));
    const asked: string[] = [];
    for (const right of rights) {
      const q = check.next()!;
      expect(q.replies[q.answer]).toBe(q.item.replies[0]);
      asked.push(q.item.band);
      check.answer(right);
    }
    return { check, asked };
  };
  it("asks four questions and never repeats one", () => {
    const check = new TalkCheck(25, "travel", seededRandom(1));
    const ids = new Set<string>();
    for (let i = 0; i < TALK_QUESTIONS; i++) {
      const q = check.next()!;
      expect(ids.has(q.item.id)).toBe(false);
      ids.add(q.item.id);
      check.answer(i % 2 === 0);
    }
    expect(check.done).toBe(true);
    expect(check.next()).toBeNull();
  });
  it("moves up after a right answer and down after a wrong one", () => {
    expect(run(25, [true, true, true, true]).asked).toEqual([
      "A2",
      "B1",
      "B2",
      "B2",
    ]);
    expect(run(25, [false, false, false, false]).asked).toEqual([
      "A2",
      "A1",
      "A1",
      "A1",
    ]);
  });
  it("nudges the level by at most two units", () => {
    expect([0, 1, 2, 3, 4].map(talkDelta)).toEqual([-2, -1, 0, 1, 2]);
  });
});
