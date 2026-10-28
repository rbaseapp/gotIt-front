import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import App, { PrivateLessonEntry } from "../src/App";

vi.mock("../src/lib/structuredEnglish", async (orig) => ({
  ...(await orig<object>()),
  curriculumApi: { get: async () => ({ tutor: { unlocked: true } }) },
}));

const state = vi.hoisted(() => ({ paid: false }));
vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ mode: "live", user: { id: "curriculum-learner" } }),
}));
vi.mock("../src/components/Feedback", () => ({
  useFeedback: () => ({ toast: vi.fn() }),
}));
vi.mock("../src/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../src/context/SubscriptionContext", () => ({
  SubscriptionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
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

beforeEach(() => {
  state.paid = false;
});

it("shows the locked card instead of the tutor for a free learner", async () => {
  render(
    <MemoryRouter>
      <Suspense>
        <PrivateLessonEntry preferLesson={false} />
      </Suspense>
    </MemoryRouter>,
  );
  await screen.findAllByRole("link");
  expect(screen.queryByText("Voice tutor page")).not.toBeInTheDocument();
});

it("keeps the course landing page for Pro and respects explicit lesson links", async () => {
  state.paid = true;
  const view = render(
    <MemoryRouter>
      <Suspense>
        <PrivateLessonEntry preferLesson={false} />
      </Suspense>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Course page")).toBeInTheDocument();
  view.rerender(
    <MemoryRouter>
      <Suspense>
        <PrivateLessonEntry preferLesson />
      </Suspense>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Voice tutor page")).toBeInTheDocument();
});

it.each(["P01-L1", "P01-L2", "C101-L1"])(
  "routes the actual curriculum link %s to the tutor for a paid learner",
  async (lesson) => {
    state.paid = true;
    render(
      <MemoryRouter
        initialEntries={[
          `/private-lesson?curriculum=${lesson}&language=en&minutes=10&return=%2Fenglish-learning%3Funit%3DP01`,
        ]}
      >
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Voice tutor page")).toBeInTheDocument();
    expect(screen.queryByText("Course page")).not.toBeInTheDocument();
  },
);
