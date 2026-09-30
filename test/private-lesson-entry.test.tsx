import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { PrivateLessonEntry } from "../src/App";

const state = vi.hoisted(() => ({ paid: false }));
vi.mock("../src/context/SubscriptionContext", () => ({
  SubscriptionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSubscription: () => ({
    status: { tier: state.paid ? "paid" : "free" },
    loading: false,
    hasEntitlement: () => state.paid,
  }),
}));
vi.mock("../src/pages/PrivateLessonPage", () => ({
  PrivateLessonPage: () => <div>Voice tutor page</div>,
}));
vi.mock("../src/pages/CoursePage", () => ({
  CoursePage: () => <div>Course page</div>,
}));

beforeEach(() => { state.paid = false; });

it("opens the voice tutor for a free user who can buy minutes independently", async () => {
  render(<Suspense><PrivateLessonEntry preferLesson={false} /></Suspense>);
  expect(await screen.findByText("Voice tutor page")).toBeInTheDocument();
});

it("keeps the course landing page for Pro and respects explicit lesson links", async () => {
  state.paid = true;
  const view = render(<Suspense><PrivateLessonEntry preferLesson={false} /></Suspense>);
  expect(await screen.findByText("Course page")).toBeInTheDocument();
  view.rerender(<Suspense><PrivateLessonEntry preferLesson /></Suspense>);
  expect(await screen.findByText("Voice tutor page")).toBeInTheDocument();
});
