import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DevPracticePage } from "../src/pages/DevPracticePage";
import { seedProfile } from "../src/data/seed";
import { clearTokens, setTokens } from "../src/lib/api";

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ profile: seedProfile }),
}));
vi.mock("../src/context/SubscriptionContext", () => ({
  useSubscription: () => ({
    loading: false,
    error: "",
    status: { tier: "paid" },
    hasEntitlement: () => true,
    reload: vi.fn(),
  }),
}));
const id = "11111111-1111-4111-8111-111111111111";
const session = {
  id,
  sessionType: "recall",
  status: "active",
  startedAt: "2026-10-11T10:00:00Z",
  endedAt: null,
  durationSeconds: null,
  itemCount: 1,
  attemptCount: 0,
  correctCount: 0,
  xpEarned: 0,
  algorithmVersion: "server-v1",
};
const dashboard = {
  counts: {
    total: 5,
    new: 2,
    learning: 3,
    reviewing: 0,
    mastered: 0,
    due: 0,
    difficult: 0,
    highPriority: 0,
    awaitingRecall: 0,
  },
  skills: [],
  modes: [],
  recentActivity: [],
  recentActivityPagination: {
    page: 1,
    pageCount: 1,
    totalCount: 0,
    pageSize: 6,
  },
  dailyGoal: {
    type: "attempts",
    value: 20,
    current: 7,
    completed: false,
    date: "2026-10-11",
  },
  gamification: {
    totalXp: 10,
    level: 1,
    nextLevelXp: 100,
    todayXp: 0,
    dailyXpCap: 200,
    dailyXpRemaining: 200,
    dailyXpCapReached: false,
    postDailyCapPercent: 25,
    currentStreakDays: 4,
    longestStreakDays: 4,
    lastActivityDate: "2026-10-10",
  },
  weeklyActivity: { timezone: "Asia/Jerusalem", days: [] },
};
function Location() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}
function mount(path = "/learn?language=en") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <DevPracticePage />
      <Location />
    </MemoryRouter>,
  );
}
let calls: Array<{ url: string; method: string }>;
let holdArabic: (() => void) | undefined;
beforeEach(() => {
  calls = [];
  holdArabic = undefined;
  setTokens({ accessToken: "test", refreshToken: "test", expiresIn: 3600 });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      calls.push({ url: url.toString(), method: init?.method ?? "GET" });
      if (url.pathname.endsWith("/dashboard/languages"))
        return Response.json({
          languages: [
            { code: "en", count: 5 },
            { code: "ar", count: 2 },
          ],
        });
      if (url.pathname.endsWith("/dashboard")) return Response.json(dashboard);
      if (url.pathname.endsWith("/word-packs"))
        return Response.json({ packs: [] });
      if (url.pathname.endsWith("/capabilities"))
        return Response.json({
          configured: {
            library: true,
            practice: true,
            dashboard: true,
            readingGeneration: true,
            speech: true,
          },
          learningLanguages: [],
        });
      if (url.pathname.endsWith("/practice/sessions"))
        return Response.json({
          items: [
            session,
            {
              ...session,
              id: "22222222-2222-4222-8222-222222222222",
              status: "completed",
            },
          ],
          nextCursor: null,
        });
      if (url.pathname.endsWith("/learning/queue")) {
        if (url.searchParams.get("sourceLanguageCode") === "ar")
          await new Promise<void>((resolve) => {
            holdArabic = resolve;
          });
        return Response.json({
          items: [
            {
              id,
              sourceText: "word",
              sourceLanguageCode: url.searchParams.get("sourceLanguageCode"),
              translationLanguageCode: "he",
              primaryTranslation: "מילה",
              learningStatus: "new",
              nextReviewAt: null,
              queueScore: 1,
            },
          ],
          algorithmVersion: "server-v1",
        });
      }
      return Response.json(
        { error: { code: "TEST_UNHANDLED_ROUTE" } },
        { status: 404 },
      );
    }),
  );
});
afterEach(clearTokens);

describe("DEV practice live behavior", () => {
  it.each([
    [/^כרטיסי שינון/, "flashcards"],
    [/^התאמות/, "matching"],
    [/^גרירה/, "drag_drop"],
    [/^האזנה וכתיבה/, "listening"],
    [/^הגייה/, "pronunciation"],
  ] as const)(
    "opens each approved game from its visible card (%s)",
    async (name, type) => {
      mount();
      const card = screen.getByRole("button", { name });
      await waitFor(() => expect(card).toBeEnabled());
      expect(screen.queryByText("בקרוב")).not.toBeInTheDocument();
      fireEvent.click(card);
      expect(screen.getByTestId("location")).toHaveTextContent(
        `/learn/session/${type}?language=en`,
      );
    },
  );
  it("shows the server goal without inventing completed games or recording progress", async () => {
    mount();
    expect(
      await screen.findByRole("progressbar", { name: "מטרה יומית" }),
    ).toHaveAttribute("aria-valuenow", "7");
    expect(
      screen.getByRole("progressbar", { name: "מטרה יומית" }),
    ).toHaveAttribute("aria-valuemax", "20");
    expect(calls.every((call) => call.method === "GET")).toBe(true);
    const recent = screen.getByRole("region", { name: "המשך מאיפה שהפסקת" });
    const links = await within(recent).findAllByRole("link");
    expect(links[0].getAttribute("href")).toContain(`resume=${id}`);
    expect(links[1]).toHaveAttribute("href", "/history?language=en");
  });
  it("preserves selected words and the safe return destination when starting writing", async () => {
    mount(`/learn?items=${id}&language=en&return=%2Fvocabulary`);
    const card = screen.getByRole("button", { name: /^כתיבה.*הקלידו/ });
    await waitFor(() => expect(card).toBeEnabled());
    fireEvent.click(card);
    const next = new URL(
      screen.getByTestId("location").textContent!,
      "http://localhost",
    );
    expect(next.pathname).toBe("/learn/session/recall");
    expect(Object.fromEntries(next.searchParams)).toEqual({
      items: id,
      language: "en",
      return: "/vocabulary",
    });
  });
  it("blocks stale queue actions during a language switch and uses the new language", async () => {
    mount();
    const start = screen.getByRole("button", { name: "התחלת סשן תרגול" });
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ar" } });
    await waitFor(() => expect(holdArabic).toBeDefined());
    expect(start).toBeDisabled();
    holdArabic!();
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/learn/session/smart?language=ar",
    );
  });
});
