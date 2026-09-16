import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { AppProvider } from "../src/context/AppContext";
import { clearTokens, setTokens } from "../src/lib/api";
import { seedProfile } from "../src/data/seed";
const itemId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const exerciseId = "33333333-3333-4333-8333-333333333333";
const date = "2026-09-15T10:00:00.000Z";
const identity = {
  id: itemId,
  applicationId: sessionId,
  email: "real@example.com",
  emailVerified: true,
  status: "active",
};
const session = {
  id: sessionId,
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
  id: exerciseId,
  learningItemId: itemId,
  exerciseType: "recall",
  kind: "typed",
  direction: "translation_to_source",
  prompt: { text: "לזכור", languageCode: "en", context: null },
  expiresAt: "2026-09-16T10:00:00.000Z",
};
const receipt = {
  attempt: {
    id: itemId,
    learningItemId: itemId,
    sessionId,
    sequence: 1,
    result: "partial",
    score: 70,
    expectedAnswer: "remember",
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
function mount(
  path: string,
  handler: (url: string, init?: RequestInit) => Promise<Response>,
) {
  clearTokens();
  vi.stubEnv("VITE_DEMO_MODE", "false");
  setTokens({ accessToken: "access", refreshToken: "refresh", expiresIn: 900 });
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/auth/me")) return json({ user: identity });
    if (url.endsWith("/profile")) return json({ profile: seedProfile });
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <AppProvider>
          <App />
        </AppProvider>
      </MemoryRouter>
    </StrictMode>,
  );
  return fetchMock;
}
afterEach(clearTokens);
describe("live server-backed flows", () => {
  it("does not hydrate a persisted demo when production demo mode is disabled", async () => {
    localStorage.setItem("gotit.mode", JSON.stringify("demo"));
    vi.stubEnv("VITE_DEMO_MODE", "false");
    clearTokens();
    render(
      <MemoryRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "כניסה ל־GotIt" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /כניסה לסביבת ההדגמה/ }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem("gotit.demo.v2")).toBeNull();
  });
  it("uses server-issued exercises, freezes attempt retries, and trusts only the server projection", async () => {
    let attempts = 0;
    const fetchMock = mount(
      "/learn/session/recall?items=" + itemId,
      async (url, init) => {
        if (url.endsWith("/practice/sessions")) return json({ session });
        if (url.endsWith("/exercises"))
          return json(
            { exercises: [exercise], algorithmVersion: "server-v1" },
            201,
          );
        if (url.endsWith("/practice/attempts")) {
          attempts++;
          if (attempts === 1) throw new Error("lost response");
          return json(receipt, 201);
        }
        if (init?.method === "PATCH")
          return json({
            session: {
              ...session,
              status: "completed",
              endedAt: date,
              durationSeconds: 12,
              attemptCount: 1,
              correctCount: 0,
              xpEarned: 13,
            },
          });
        throw new Error("Unexpected route");
      },
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "מתחילים" }));
    await user.type(await screen.findByLabelText("התשובה שלך"), "remember");
    await user.click(screen.getByRole("button", { name: "בדיקת תשובה" }));
    const retry = await screen.findByRole("button", {
      name: "ניסיון נוסף לאותה תשובה",
    });
    await waitFor(() => expect(retry).toBeEnabled());
    expect(screen.queryByText(/שליטה: 42/)).not.toBeInTheDocument();
    await user.click(retry);
    expect(
      await screen.findByRole("heading", { name: "נכון חלקית" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/שליטה: 42%/)).toBeInTheDocument();
    const requests = fetchMock.mock.calls.filter(([url]) =>
      url.endsWith("/practice/attempts"),
    );
    expect(requests).toHaveLength(2);
    expect(requests[0][1]?.body).toBe(requests[1][1]?.body);
    expect(requests[0][1]?.headers).toEqual(
      requests[1][1]?.headers && {
        ...requests[1][1].headers,
        "x-request-id": (requests[0][1].headers as Record<string, string>)[
          "x-request-id"
        ],
      },
    );
    const body = JSON.parse(requests[0][1]!.body as string);
    expect(body).toMatchObject({
      exerciseId,
      answerText: "remember",
      hintsUsed: 0,
    });
    for (const field of [
      "score",
      "result",
      "expectedAnswer",
      "skills",
      "applicationUserId",
    ])
      expect(body).not.toHaveProperty(field);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        url.endsWith("/practice/sessions"),
      ),
    ).toHaveLength(1);
    await user.click(
      screen.getByRole("button", { name: "סיום ושמירת הסיכום" }),
    );
    await screen.findByRole("heading", { name: "כל הכבוד, סיימת!" });
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(localStorage.getItem("gotit.demo.v2")).toBeNull();
  });
  it("records a reading only on explicit opening and offers a server quiz afterward", async () => {
    const reading = {
      id: itemId,
      title: "A memory",
      bodyText: "We remember new words every day.",
      contentType: "article",
      targetLanguageCode: "en",
      effectiveLevel: "B1",
      targets: [
        {
          id: itemId,
          sourceText: "remember",
          occurrenceCount: 1,
          ranges: [{ start: 3, end: 11 }],
        },
      ],
    };
    const fetchMock = mount("/reading", async (url, init) => {
      if (url.includes("/reading?"))
        return json({ items: [], nextCursor: null });
      if (url.endsWith("/reading/preview"))
        return json({
          reading,
          publicationToken: "private-ticket",
          expiresAt: date,
          provider: { name: "configured-provider", model: "model" },
        });
      if (url.endsWith("/reading") && init?.method === "POST")
        return json({ reading: { ...reading, openedAt: date } });
      throw new Error("Unexpected route");
    });
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "יצירת תצוגה מקדימה" }),
    );
    await screen.findByRole("heading", { name: "A memory" });
    expect(screen.queryByText(reading.bodyText)).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([url]) => url.endsWith("/reading")),
    ).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "פתיחת הקטע" }));
    expect(
      await screen.findByRole("link", { name: "תרגול המילים מתוך הקטע" }),
    ).toHaveAttribute("href", `/learn/session/article_quiz?reading=${itemId}`);
    expect(screen.getByRole("link", { name: "remember" })).toHaveAttribute(
      "href",
      `/vocabulary?item=${itemId}`,
    );
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        url.endsWith("/practice/attempts"),
      ),
    ).toHaveLength(0);
  });
  it("shows a recoverable API failure instead of displaying demo words", async () => {
    mount("/vocabulary", async (url) =>
      url.includes("/tags")
        ? json({ tags: [] })
        : json(
            {
              error: {
                code: "INTERNAL_ERROR",
                message: "sensitive database diagnostic",
              },
            },
            503,
          ),
    );
    await screen.findByRole("heading", { name: "אוצר המילים שלי" });
    expect(
      await screen.findByRole("button", { name: "ניסיון נוסף" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("wander")).not.toBeInTheDocument();
    expect(
      screen.queryByText("sensitive database diagnostic"),
    ).not.toBeInTheDocument();
  });
  it("signs out when a product request cannot refresh an expired session", async () => {
    mount("/vocabulary", async () =>
      json({ error: { code: "UNAUTHORIZED" } }, 401),
    );
    expect(
      await screen.findByRole("heading", { name: "כניסה ל־GotIt" }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem("gotit.refresh")).toBeNull();
  });
  it("does not call the API when a form has not been submitted", async () => {
    const fetchMock = mount("/learn/session/recall", async () => {
      throw new Error("Should not create");
    });
    await screen.findByRole("button", { name: "מתחילים" });
    fireEvent.change(screen.getByLabelText("עד כמה מילים?"), {
      target: { value: "5" },
    });
    expect(
      fetchMock.mock.calls.some(([url]) => url.endsWith("/practice/sessions")),
    ).toBe(false);
  });
});
