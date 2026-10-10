import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTokens, setTokens } from "../src/lib/api";
import { DashboardQuickReview } from "../src/components/DashboardQuickReview";
import { DashboardArticle } from "../src/components/DashboardArticle";
import { DevDashboardPage } from "../src/pages/DevDashboardPage";
import { seedProfile } from "../src/data/seed";
import { chooseProgram } from "../src/lib/learningNavigation";
import { courseWithPlan } from "./course-fixtures";
import {
  captureIsInactive,
  dashboardDesignEnabled,
} from "../src/lib/dashboardDesign";

vi.mock("../src/context/SubscriptionContext", () => ({
  useSubscription: () => ({ hasEntitlement: () => true }),
}));
vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({
    profile: seedProfile,
    user: { id: id(10), applicationId: id(11) },
  }),
}));

beforeEach(() =>
  setTokens({
    accessToken: "test-access",
    refreshToken: "test-refresh",
    expiresIn: 3600,
  }),
);
afterEach(clearTokens);

const id = (number: number) =>
  `${String(number).padStart(8, "0")}-0000-4000-8000-000000000001`;
const date = "2026-10-11T00:00:00.000Z";
const session = {
  id: id(1),
  sessionType: "recall",
  status: "active",
  startedAt: date,
  endedAt: null,
  durationSeconds: null,
  itemCount: 1,
  attemptCount: 0,
  correctCount: 0,
  xpEarned: 0,
  algorithmVersion: "server-v1",
};
const exercise = {
  id: id(2),
  learningItemId: id(3),
  exerciseType: "recall",
  kind: "multiple_choice",
  direction: "source_to_translation",
  prompt: {
    text: "remember",
    languageCode: "en",
    context: null,
    choices: [
      { id: id(4), text: "לזכור" },
      { id: id(5), text: "לשכוח" },
    ],
  },
  expiresAt: date,
};
const receipt = {
  attempt: {
    id: id(6),
    learningItemId: id(3),
    sessionId: id(1),
    sequence: 1,
    result: "correct",
    score: 100,
    expectedAnswer: "לזכור",
    xpEarned: 3,
  },
  progress: {
    status: "learning",
    stage: 0,
    masteryScore: 42,
    masterySource: "system",
    nextReviewAt: date,
  },
  skills: [],
  algorithmVersion: "server-v1",
  replayed: false,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const mount = (child: React.ReactNode) =>
  render(<MemoryRouter>{child}</MemoryRouter>);

describe("DEV dashboard rollout", () => {
  it("never enables on production or other hosts, even with local preview enabled", () => {
    expect(dashboardDesignEnabled("gotit-dev.rbaseapp.com", false)).toBe(true);
    expect(dashboardDesignEnabled("localhost", true)).toBe(true);
    expect(dashboardDesignEnabled("localhost", false)).toBe(false);
    for (const host of [
      "gotit.rbaseapp.com",
      "gotit-dev.rbaseapp.com.example.com",
      "example.com",
    ])
      expect(dashboardDesignEnabled(host, true)).toBe(false);
  });
  it("only shows the capture reminder after 72 hours of known inactivity", () => {
    const now = Date.parse(date);
    expect(captureIsInactive(undefined, now)).toBe(false);
    expect(captureIsInactive("invalid", now)).toBe(false);
    expect(
      captureIsInactive(new Date(now - 72 * 3600000 + 1).toISOString(), now),
    ).toBe(false);
    expect(
      captureIsInactive(new Date(now - 72 * 3600000).toISOString(), now),
    ).toBe(true);
  });
});

describe("dashboard quick review", () => {
  it("starts explicitly, retries the same opaque choice intent, and displays server XP", async () => {
    const requests: RequestInit[] = [];
    const scored = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("practice/sessions")) return json({ session });
        if (url.endsWith("/exercises")) return json({ exercises: [exercise] });
        if (url.endsWith("practice/attempts")) {
          requests.push(init!);
          return requests.length === 1
            ? json({ error: { code: "TEMPORARY_FAILURE" } }, 503)
            : json(receipt);
        }
        if (init?.method === "PATCH")
          return json({
            session: { ...session, status: "completed", xpEarned: 3 },
          });
        throw new Error(`Unexpected ${url}`);
      }),
    );
    mount(
      <DashboardQuickReview
        language="en"
        available
        preview="remember"
        onScored={scored}
      />,
    );
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "מתחילים חזרה קצרה" }));
    fireEvent.click(await screen.findByRole("button", { name: "לזכור" }));
    const alert = await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "לשכוח" })).toBeDisabled();
    fireEvent.click(within(alert).getByRole("button", { name: "ניסיון נוסף" }));
    await screen.findByText("נשמרו 3 XP");
    expect(requests).toHaveLength(2);
    expect(requests[1].body).toBe(requests[0].body);
    expect(new Headers(requests[1].headers).get("Idempotency-Key")).toBe(
      new Headers(requests[0].headers).get("Idempotency-Key"),
    );
    expect(JSON.parse(String(requests[0].body))).toEqual({
      exerciseId: id(2),
      choiceId: id(4),
      hintsUsed: 0,
    });
    expect(scored).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "סיום החזרה" }));
    await waitFor(() => expect(scored).toHaveBeenCalledTimes(2));
  });
  it("rejects exercises from a different language before any answer can be sent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).endsWith("/exercises")
          ? json({
              exercises: [
                {
                  ...exercise,
                  prompt: { ...exercise.prompt, languageCode: "fr" },
                },
              ],
            })
          : json({ session }),
      ),
    );
    mount(<DashboardQuickReview language="en" available onScored={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "מתחילים חזרה קצרה" }));
    await screen.findByRole("alert");
    expect(
      screen.queryByRole("button", { name: "לזכור" }),
    ).not.toBeInTheDocument();
  });
});

describe("dashboard article", () => {
  it("previews without saving, then retries publication with its original token and event", async () => {
    const reading = {
      id: id(7),
      title: "A small journey",
      bodyText: "Remember your journey.",
      contentType: "article",
      targetLanguageCode: "en",
      effectiveLevel: "A1",
      targets: [],
    };
    const publications: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("reading/preview"))
          return json({
            reading,
            publicationToken: "preview-publication-token",
            expiresAt: date,
            provider: { name: "test", model: null },
          });
        publications.push(init!);
        return publications.length === 1
          ? json({ error: { code: "TEMPORARY_FAILURE" } }, 503)
          : json({ reading });
      }),
    );
    mount(
      <DashboardArticle
        language="en"
        words={[]}
        interests={[]}
        inactive={false}
        loading={false}
        error=""
        reload={vi.fn()}
      />,
    );
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "צרו לי מאמר" }));
    await screen.findByRole("heading", { name: reading.title });
    expect(publications).toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", { name: "שמירה לספריית המאמרים" }),
    );
    const alert = await screen.findByRole("alert");
    fireEvent.click(within(alert).getByRole("button", { name: "ניסיון נוסף" }));
    await screen.findByText("המאמר נשמר בספרייה שלך.");
    expect(publications[1].body).toBe(publications[0].body);
    expect(new Headers(publications[1].headers).get("Idempotency-Key")).toBe(
      new Headers(publications[0].headers).get("Idempotency-Key"),
    );
    expect(JSON.parse(String(publications[0].body))).toEqual({
      publicationToken: "preview-publication-token",
    });
    expect(
      screen.getByRole("link", { name: "תרגול על המאמר" }),
    ).toHaveAttribute(
      "href",
      `/learn/session/article_quiz?reading=${id(7)}&language=en&return=%2Fdashboard`,
    );
  });
});

describe("dashboard context", () => {
  const dashboard = {
    counts: {
      total: 20,
      new: 3,
      learning: 7,
      reviewing: 5,
      mastered: 5,
      due: 4,
      difficult: 1,
      highPriority: 1,
      awaitingRecall: 2,
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
      type: "items",
      value: 5,
      current: 2,
      completed: false,
      date: "2026-10-11",
    },
    gamification: {
      totalXp: 100,
      level: 1,
      nextLevelXp: 500,
      todayXp: 10,
      dailyXpCap: 100,
      dailyXpRemaining: 90,
      dailyXpCapReached: false,
      postDailyCapPercent: 20,
      currentStreakDays: 1,
      longestStreakDays: 2,
      lastActivityDate: "2026-10-11",
    },
    weeklyActivity: { timezone: "Asia/Jerusalem", days: [] },
  };
  function server() {
    const course = courseWithPlan(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input), "http://localhost");
        if (url.pathname.endsWith("/courses"))
          return json({ courses: [course], homework: [], available: true });
        if (url.pathname.endsWith("/dashboard/languages"))
          return json({
            languages: [
              { code: "en", count: 20 },
              { code: "fr", count: 0 },
            ],
          });
        if (url.pathname.endsWith("/dashboard"))
          return json(
            url.searchParams.get("sourceLanguageCode") === "fr"
              ? {
                  ...dashboard,
                  counts: { ...dashboard.counts, total: 0, new: 0, due: 0 },
                }
              : dashboard,
          );
        if (url.pathname.endsWith("/learning-items"))
          return json({ items: [], nextCursor: null });
        if (url.pathname.endsWith("/practice/sessions"))
          return json({ items: [], nextCursor: null });
        throw new Error(`Unexpected ${url}`);
      }),
    );
    return course;
  }
  it("uses the approved program's real next lesson and switches to an empty words dashboard in another language", async () => {
    const course = server();
    chooseProgram(course.id, { id: id(10), applicationId: id(11) }, "en");
    mount(<DevDashboardPage />);
    await screen.findByRole("heading", { name: course.versions[0].plan.title });
    expect(
      screen.getByRole("link", { name: "ממשיכים לשיעור הבא" }),
    ).toHaveAttribute(
      "href",
      `/private-lesson?course=${course.id}&language=en`,
    );
    expect(
      screen.getByRole("progressbar", { name: "התקדמות בתוכנית" }),
    ).toHaveAttribute("aria-valuenow", "0");
    fireEvent.change(screen.getByRole("combobox", { name: "שפת המקור" }), {
      target: { value: "fr" },
    });
    await screen.findByRole("heading", { name: "היום שלך מתחיל במילה אחת" });
    expect(
      screen.queryByRole("heading", { name: course.versions[0].plan.title }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "מוסיפים מילה ראשונה" }),
    ).toHaveAttribute("href", "/vocabulary");
    expect(
      screen.getByRole("button", { name: "מתחילים חזרה קצרה" }),
    ).toBeDisabled();
  });
  it("shows words-only content when no program has been chosen and does not promise gifts", async () => {
    server();
    mount(<DevDashboardPage />);
    await screen.findByRole("heading", { name: "המילים שלך מחכות לך" });
    expect(
      screen.getByRole("link", { name: "בואו נתחיל לתרגל" }),
    ).toHaveAttribute("href", "/learn/smart?language=en&return=%2Fdashboard");
    expect(
      screen.getByRole("heading", { name: "מאמר מהמילים שלך AI" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/הדגמת מצב|300 XP|הגנת רצף/u),
    ).not.toBeInTheDocument();
  });
  it("keeps the answered exercise visible while refreshing dashboard totals", async () => {
    server();
    const read = window.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          const url = String(input);
          if (url.endsWith("practice/sessions")) return json({ session });
          if (url.endsWith("/exercises"))
            return json({ exercises: [exercise] });
          if (url.endsWith("practice/attempts")) return json(receipt);
        }
        return read(input, init);
      }),
    );
    mount(<DevDashboardPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "מתחילים חזרה קצרה" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "לזכור" }));
    await screen.findByText("נשמרו 3 XP");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "סיום החזרה" })).toBeEnabled(),
    );
    expect(
      screen.queryByRole("button", { name: "מתחילים חזרה קצרה" }),
    ).not.toBeInTheDocument();
  });
});
