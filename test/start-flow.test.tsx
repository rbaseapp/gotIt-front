import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import {
  InterestsStep,
  LevelStep,
  PlanStep,
} from "../src/components/onboarding/steps";
import { claimPayload } from "../src/lib/onboarding/claim";
import {
  SELF_LEVEL_UNITS,
  goalFromInterests,
  initialOnboarding,
  type OnboardingState,
} from "../src/lib/onboarding/state";
import { targetChoices } from "../src/lib/placement/plan";
import type { PlacementResult } from "../src/lib/placement/types";

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ user: null, authenticate: vi.fn() }),
}));

const RESULT: PlacementResult = {
  theta: 27,
  low: 22,
  high: 32,
  startUnit: 25,
  band: "A2",
  sub: "high",
  upperBand: null,
  knownEstimate: 1150,
  total: 3424,
  skills: { vocabulary: "ok", reading: "unknown", listening: "unknown" },
  reliability: 0.9,
  uncertain: false,
  literacy: "reader",
  cards: 8,
  seconds: 60,
  knownWords: ["apple", "window"],
  seedWords: [],
};

/** Holds the onboarding state the way StartPage does, and exposes it for assertions. */
function Harness({
  start,
  children,
  onState,
}: {
  start?: Partial<OnboardingState>;
  children: (props: {
    state: OnboardingState;
    update: (patch: Partial<OnboardingState>) => void;
  }) => React.ReactNode;
  onState?: (state: OnboardingState) => void;
}) {
  const [state, setState] = useState<OnboardingState>({
    ...initialOnboarding(),
    ...start,
  });
  onState?.(state);
  return (
    <MemoryRouter>
      {children({
        state,
        update: (patch) => setState((current) => ({ ...current, ...patch })),
      })}
    </MemoryRouter>
  );
}

it("shows five levels and moves on as soon as one is tapped", () => {
  const next = vi.fn();
  render(<Harness>{(props) => <LevelStep {...props} next={next} />}</Harness>);
  for (const band of ["Pre-A1", "A1 · A2", "B1", "B2", "C1"])
    expect(screen.getByText(band)).toBeInTheDocument();
  expect(next).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /בינוני/ }));
  expect(next).toHaveBeenCalledWith(false);
});

it("lets someone who only wants to save words skip the level", () => {
  const next = vi.fn();
  let latest: OnboardingState | null = null;
  render(
    <Harness onState={(state) => (latest = state)}>
      {(props) => <LevelStep {...props} next={next} />}
    </Harness>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "אני רק רוצה לשמור מילים" }),
  );
  expect(latest!.focus).toBe("words");
  expect(next).toHaveBeenCalledWith(true);
});

it("keeps at most three interests and two things to improve", () => {
  let latest: OnboardingState | null = null;
  render(
    <Harness onState={(state) => (latest = state)}>
      {(props) => <InterestsStep {...props} next={vi.fn()} back={vi.fn()} />}
    </Harness>,
  );
  for (const name of ["טיולים", "עסקים ועבודה", "טכנולוגיה", "מוזיקה"])
    fireEvent.click(screen.getByRole("button", { name }));
  // The fourth pick pushes out the oldest.
  expect(latest!.interests).toEqual(["business", "tech", "music"]);
  fireEvent.click(screen.getByRole("button", { name: "אוצר מילים" }));
  fireEvent.click(screen.getByRole("button", { name: "שטף בדיבור" }));
  fireEvent.click(screen.getByRole("button", { name: "קריאה וכתיבה" }));
  expect(latest!.priorities).toEqual(["speaking", "writing"]);
  // "Let the teacher decide" replaces the rest, and picking another one replaces it.
  fireEvent.click(screen.getByRole("button", { name: "שהמורה יחליט" }));
  expect(latest!.priorities).toEqual(["teacher"]);
  fireEvent.click(screen.getByRole("button", { name: "דקדוק וזמנים" }));
  expect(latest!.priorities).toEqual(["grammar"]);
});

it("turns the first matching interest into the goal the server knows", () => {
  expect(goalFromInterests(["music", "business", "travel"])).toBe("work");
  expect(goalFromInterests(["studies"])).toBe("study");
  expect(goalFromInterests(["food", "news"])).toBe("other");
  expect(goalFromInterests([])).toBe("other");
});

it("offers only levels above the start for the plan, and saves the pick", () => {
  expect(targetChoices(4)).toEqual(["A1", "A2", "B1", "B2", "C1"]);
  expect(targetChoices(80)).toEqual(["C1"]);
  let latest: OnboardingState | null = null;
  render(
    <Harness
      start={{ step: "plan", result: RESULT, goal: "other" }}
      onState={(state) => (latest = state)}
    >
      {(props) => <PlanStep {...props} next={vi.fn()} back={vi.fn()} />}
    </Harness>,
  );
  // Unit 25 sits inside A2, so A1 is behind the learner and A2 is still ahead.
  expect(screen.queryByRole("button", { name: /^A1/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^A2/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^B2/ }));
  expect(latest!.targetBand).toBe("B2");
});

it("sends interests, priorities and the target level with the placement", () => {
  const state: OnboardingState = {
    ...initialOnboarding(),
    result: RESULT,
    selfLevel: 2,
    interests: ["business", "music"],
    priorities: ["speaking"],
    targetBand: "B2",
    goal: "work",
  };
  const payload = claimPayload(state, "7b1d6e9e-8f0a-4a3b-9c1f-2d4e5f607182")!;
  expect(payload.goal).toBe("work");
  expect(payload.profile).toEqual({
    selfLevel: 2,
    interests: ["business", "music"],
    priorities: ["speaking"],
    targetBand: "B2",
  });
  // Without any of the new answers the profile stays out of the request.
  const bare = claimPayload({ ...initialOnboarding(), result: RESULT }, "x")!;
  expect(bare.profile).toBeUndefined();
  expect(Object.keys(SELF_LEVEL_UNITS)).toHaveLength(5);
});
