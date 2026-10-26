import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import {
  CurriculumAccess,
  LockedFeature,
  PreviewBanner,
  TutorLockCard,
} from "../src/components/onboarding/Gates";

const state = vi.hoisted(() => ({ entitled: false, loading: false }));
vi.mock("../src/context/SubscriptionContext", () => ({
  useSubscription: () => ({
    status: { tier: "free" },
    loading: state.loading,
    hasEntitlement: () => state.entitled,
  }),
}));

const wrap = (node: React.ReactNode) =>
  render(<MemoryRouter>{node}</MemoryRouter>);

beforeEach(() => {
  state.entitled = false;
  state.loading = false;
});

it("locks courses for a free learner and offers the free path", () => {
  wrap(
    <CurriculumAccess>
      <div>course body</div>
    </CurriculumAccess>,
  );
  expect(screen.queryByText("course body")).not.toBeInTheDocument();
  const links = screen.getAllByRole("link");
  expect(links.map((l) => l.getAttribute("href"))).toEqual([
    "/billing",
    "/learn",
  ]);
});

it("opens courses when the plan carries curriculum.access", () => {
  state.entitled = true;
  wrap(
    <CurriculumAccess>
      <div>course body</div>
    </CurriculumAccess>,
  );
  expect(screen.getByText("course body")).toBeInTheDocument();
});

it("shows the preview banner only without the entitlement", () => {
  const { unmount } = wrap(<PreviewBanner />);
  expect(screen.getByRole("status")).toBeInTheDocument();
  unmount();
  state.entitled = true;
  wrap(<PreviewBanner />);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("shows tutor lock progress towards the base", () => {
  wrap(<TutorLockCard done={1} required={3} />);
  const bar = screen.getByRole("progressbar");
  expect(bar).toHaveAttribute("aria-valuenow", "1");
  expect(bar).toHaveAttribute("aria-valuemax", "3");
});

it("renders both locked variants", () => {
  const { unmount } = wrap(<LockedFeature kind="tutor" />);
  expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  unmount();
  wrap(<LockedFeature kind="courses" />);
  expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
});
