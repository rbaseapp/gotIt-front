import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { OnboardingClaimGate } from "../src/components/onboarding/OnboardingClaimGate";
import {
  ONBOARDING_STORAGE_KEY,
  initialOnboarding,
} from "../src/lib/onboarding/state";

const claim = vi.hoisted(() => vi.fn(async () => ({ applied: true })));
vi.mock("../src/lib/onboarding/claim", () => ({
  claimOnboarding: claim,
  saveFirstWords: vi.fn(async () => {}),
}));
vi.mock("../src/components/Feedback", () => ({
  useFeedback: () => ({ toast: vi.fn() }),
}));

const result = { theta: 20 } as never;
const store = (step: string) =>
  localStorage.setItem(
    ONBOARDING_STORAGE_KEY,
    JSON.stringify({ ...initialOnboarding(), step, result }),
  );
const renderGate = () =>
  render(
    <MemoryRouter>
      <OnboardingClaimGate>
        <div>app</div>
      </OnboardingClaimGate>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  claim.mockClear();
});

it("saves an answered check that reached the sign-up screen", async () => {
  store("save");
  renderGate();
  await waitFor(() => expect(claim).toHaveBeenCalledTimes(1));
});

it("leaves a half-finished check alone after a reload", async () => {
  store("plan");
  renderGate();
  expect(await screen.findByText("app")).toBeInTheDocument();
  expect(claim).not.toHaveBeenCalled();
});

it("keeps the result in this browser when the save fails, so the next visit can retry", async () => {
  store("save");
  claim.mockRejectedValueOnce(new Error("network"));
  renderGate();
  await waitFor(() => expect(claim).toHaveBeenCalledTimes(1));
  await screen.findByText("app");
  expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).not.toBeNull();
});

it("forgets the result once the account has it", async () => {
  store("save");
  renderGate();
  await waitFor(() => expect(claim).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull(),
  );
});
