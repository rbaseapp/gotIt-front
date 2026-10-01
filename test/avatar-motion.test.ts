import { describe, expect, it } from "vitest";
import { avatarMouth, smoothAvatarLevel } from "../src/lib/avatarMotion";

describe("audio-driven avatar motion", () => {
  it("composites adjacent poses without leaking the closed mouth through open speech", () => {
    for (let level = 0; level <= 1; level += 0.005) {
      const { soft, rounded, wide } = avatarMouth(level);
      const contributions = [
        (1 - soft) * (1 - rounded) * (1 - wide),
        soft * (1 - rounded) * (1 - wide),
        rounded * (1 - wide),
        wide,
      ];
      expect(contributions.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
        1,
      );
      expect(
        contributions.filter((value) => value > 0.00001).length,
      ).toBeLessThanOrEqual(2);
      if (level >= 0.14) expect(contributions[0]).toBeCloseTo(0);
    }
  });

  it("has a fast speech onset and closes during a short pause at different refresh rates", () => {
    const run = (
      hz: number,
      target: number,
      start: number,
      duration: number,
    ) => {
      let level = start;
      for (let elapsed = 0; elapsed < duration; elapsed += 1000 / hz)
        level = smoothAvatarLevel(
          level,
          target,
          Math.min(1000 / hz, duration - elapsed),
        );
      return level;
    };
    expect(run(60, 1, 0, 60)).toBeGreaterThan(0.85);
    expect(run(60, 0, 1, 220)).toBeLessThan(0.025);
    expect(run(30, 0.6, 0, 100)).toBeCloseTo(run(144, 0.6, 0, 100), 6);
    expect(run(60, 0, 1, 400)).toBe(0);
  });

  it("bounds corrupt samples and a stalled animation clock", () => {
    expect(smoothAvatarLevel(NaN, Infinity, 16)).toBe(0);
    expect(smoothAvatarLevel(0, 2, 16)).toBeGreaterThan(0);
    expect(smoothAvatarLevel(0.5, 1, -1)).toBe(0.5);
    expect(smoothAvatarLevel(0.5, 1, NaN)).toBe(0.5);
    expect(smoothAvatarLevel(0, 1, 1000)).toBe(smoothAvatarLevel(0, 1, 100));
  });
});
