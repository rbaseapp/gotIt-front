import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AccountFinish } from "../src/components/onboarding/AccountFinish";
import { claimOnboarding, saveFirstWords } from "../src/lib/onboarding/claim";
import {
  initialOnboarding,
  loadOnboarding,
  saveOnboarding,
  type OnboardingState,
} from "../src/lib/onboarding/state";
import type { PlacementResult } from "../src/lib/placement/types";

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ user: { id: "u1" } }),
}));
vi.mock("../src/context/SubscriptionContext", () => ({
  useSubscription: () => ({ status: null, hasEntitlement: () => false }),
}));
vi.mock("../src/lib/onboarding/claim", () => ({
  claimOnboarding: vi.fn(),
  saveFirstWords: vi.fn(async () => undefined),
}));

const RESULT = {
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
  knownWords: [],
  seedWords: [],
} as PlacementResult;

const state: OnboardingState = {
  ...initialOnboarding(),
  step: "save",
  result: RESULT,
};

function mount() {
  saveOnboarding(state);
  render(
    <MemoryRouter initialEntries={["/start"]}>
      <Routes>
        <Route path="/start" element={<AccountFinish state={state} />} />
        <Route path="/dashboard" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(claimOnboarding).mockReset();
  vi.mocked(saveFirstWords).mockClear();
});

it("asks before a new result replaces a program that is already running", async () => {
  vi.mocked(claimOnboarding)
    .mockResolvedValueOnce({ applied: false, reason: "existing_progress" })
    .mockResolvedValueOnce({ applied: true });
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "לעבור לתוכנית החדשה" }),
  );
  expect(await screen.findByText("dashboard")).toBeInTheDocument();
  expect(vi.mocked(claimOnboarding).mock.calls[1]![1]).toEqual({
    replace: true,
  });
  expect(loadOnboarding()).toBeNull();
});

it("keeping the current program leaves it untouched", async () => {
  vi.mocked(claimOnboarding).mockResolvedValueOnce({
    applied: false,
    reason: "existing_progress",
  });
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "להשאיר את התוכנית הנוכחית" }),
  );
  expect(await screen.findByText("dashboard")).toBeInTheDocument();
  expect(claimOnboarding).toHaveBeenCalledTimes(1);
});

it("says a failed save failed, keeps the result and can try again", async () => {
  vi.mocked(claimOnboarding)
    .mockRejectedValueOnce(new Error("503"))
    .mockResolvedValueOnce({ applied: true });
  mount();
  expect(
    await screen.findByRole("heading", { name: "התוכנית עוד לא נשמרה" }),
  ).toBeInTheDocument();
  expect(loadOnboarding()?.result).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "לנסות שוב" }));
  expect(await screen.findByText("dashboard")).toBeInTheDocument();
  expect(loadOnboarding()).toBeNull();
});
