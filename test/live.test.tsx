import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { AppProvider } from "../src/context/AppContext";
import { clearTokens, setTokens } from "../src/lib/api";
import { seedProfile } from "../src/data/seed";
import { recordVoice } from "../src/lib/voice";
import { FeedbackProvider } from "../src/components/Feedback";

vi.mock("../src/lib/voice", () => ({ recordVoice: vi.fn() }));
const itemId = "11111111-1111-4111-8111-111111111111";
const secondItemId = "44444444-4444-4444-8444-444444444444";
const sessionId = "22222222-2222-4222-8222-222222222222";
const exerciseId = "33333333-3333-4333-8333-333333333333";
const remedialExerciseId = "55555555-5555-4555-8555-555555555555";
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
  prompt: {
    text: "לזכור",
    languageCode: "en",
    context: null,
    letterCount: 8,
  },
  expiresAt: "2026-09-16T10:00:00.000Z",
};
const receipt = {
  attempt: {
    id: itemId,
    learningItemId: itemId,
    sessionId,
    sequence: 1,
    result: "partially_correct",
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
  replayed: true,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
function mount(
  path: string,
  handler: (url: string, init?: RequestInit) => Promise<Response>,
  profile = seedProfile,
) {
  clearTokens();
  vi.stubEnv("VITE_DEMO_MODE", "false");
  setTokens({ accessToken: "access", refreshToken: "refresh", expiresIn: 900 });
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/auth/me")) return json({ user: identity });
    if (url.endsWith("/profile") && (!init?.method || init.method === "GET"))
      return json({ profile });
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <FeedbackProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </FeedbackProvider>
      </MemoryRouter>
    </StrictMode>,
  );
  return fetchMock;
}
afterEach(clearTokens);
describe("live server-backed flows", () => {
  it("moves through memorization cards and offers one prominent review skip", async () => {
    const smartSession = { ...session, sessionType: "smart_review" };
    const fetchMock = mount("/learn/session/smart", async (url) => {
      if (url.endsWith("/practice/sessions"))
        return json({ session: smartSession });
      if (url.endsWith(`/practice/sessions/${sessionId}/study`))
        return json({
          cards: [
            {
              learningItemId: itemId,
              sourceText: "remember",
              translationText: "לזכור",
              sourceLanguageCode: "en",
              translationLanguageCode: "he",
              context: "Remember this moment.",
              audioUrl: null,
            },
            {
              learningItemId: secondItemId,
              sourceText: "apple",
              translationText: "תפוח",
              sourceLanguageCode: "en",
              translationLanguageCode: "he",
              context: "A red apple on the table.",
              audioUrl: null,
            },
          ],
        });
      if (url.endsWith(`/study/${itemId}/image`))
        return json({
          image: {
            url: "data:image/jpeg;base64,/9j/4AECAwQ=",
            alt: "A memory aid",
            generated: false,
            provider: "Pixabay",
            sourceUrl: "https://pixabay.com/photos/remember-1/",
            creator: "Example photographer",
          },
        });
      if (url.endsWith(`/study/${secondItemId}/image`))
        return json({ image: null });
      if (url.endsWith("/exercises"))
        return json(
          { exercises: [exercise], algorithmVersion: "server-v1" },
          201,
        );
      throw new Error("Unexpected route");
    });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "מתחילים" }));
    expect(
      await screen.findByRole("heading", { name: "remember" }),
    ).toBeInTheDocument();
    expect(screen.getByText("לזכור")).toBeInTheDocument();
    expect(
      await screen.findByRole("img", { name: "A memory aid" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "תמונה מאת Example photographer דרך Pixabay",
      }),
    ).toHaveAttribute("href", "https://pixabay.com/photos/remember-1/");
    expect(
      fetchMock.mock.calls.some(([url]) => url.endsWith("/exercises")),
    ).toBe(false);

    expect(
      screen.queryByRole("button", { name: "דלג על המילה הזו" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "למילה הבאה" }));
    expect(
      await screen.findByRole("heading", { name: "apple" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("טוען תמונה")).not.toBeInTheDocument();
    });
    expect(
      fetchMock.mock.calls.some(([url]) => url.endsWith("/exercises")),
    ).toBe(false);

    await user.click(screen.getByRole("button", { name: "דלג לחזרה" }));
    expect(
      await screen.findByRole("heading", { name: "לזכור" }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([url]) => url.endsWith("/exercises")),
    ).toHaveLength(1);
    expect(
      fetchMock.mock.calls.some(([url]) => url.endsWith("/practice/attempts")),
    ).toBe(false);
  });
  it("keeps speech games available when the provider is configured and profile languages are empty", async () => {
    mount("/learn", async (url) => {
      if (url.endsWith("/capabilities"))
        return json({
          configured: {
            library: true,
            practice: true,
            dashboard: true,
            readingGeneration: true,
            speech: true,
          },
          learningLanguages: [],
        });
      if (url.includes("/learning/queue"))
        return json({ items: [], algorithmVersion: "server-v1" });
      if (url.includes("/practice/sessions"))
        return json({ items: [], nextCursor: null });
      throw new Error("Unexpected route");
    });
    await waitFor(() =>
      expect(
        document.querySelector('a[href="/learn/session/listening"]'),
      ).toBeInTheDocument(),
    );
    expect(
      document.querySelector('a[href="/learn/session/pronunciation"]'),
    ).toBeInTheDocument();
  });
  it("does not hydrate a persisted demo when production demo mode is disabled", async () => {
    localStorage.setItem("gotit.mode", JSON.stringify("demo"));
    vi.stubEnv("VITE_DEMO_MODE", "false");
    clearTokens();
    render(
      <MemoryRouter>
        <FeedbackProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </FeedbackProvider>
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
    let exerciseBatches = 0;
    const fetchMock = mount(
      "/learn/session/recall?items=" + itemId,
      async (url, init) => {
        if (url.endsWith("/practice/sessions")) return json({ session });
        if (url.endsWith("/exercises")) {
          exerciseBatches++;
          return json(
            {
              exercises: [
                exerciseBatches === 1
                  ? exercise
                  : { ...exercise, id: remedialExerciseId },
              ],
              algorithmVersion: "server-v1",
            },
            201,
          );
        }
        if (url.endsWith("/practice/attempts")) {
          attempts++;
          if (attempts === 1) throw new Error("lost response");
          return json(
            attempts === 2
              ? receipt
              : {
                  ...receipt,
                  attempt: {
                    ...receipt.attempt,
                    id: secondItemId,
                    result: "correct",
                    score: 100,
                    xpEarned: 10,
                  },
                  progress: {
                    ...receipt.progress,
                    masteryScore: 58,
                  },
                  replayed: false,
                },
            201,
          );
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
    expect(document.querySelectorAll(".letter-box")).toHaveLength(8);
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
    await user.click(screen.getByRole("button", { name: "תיקון 1 מילים" }));
    expect(await screen.findByText("תיקון מהיר")).toBeInTheDocument();
    await user.type(await screen.findByLabelText("התשובה שלך"), "remember");
    await user.click(screen.getByRole("button", { name: "בדיקת תשובה" }));
    expect(
      await screen.findByRole("heading", { name: "נכון" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "סיום ושמירת הסיכום" }),
    );
    await screen.findByRole("heading", { name: "כל הכבוד, סיימת!" });
    expect(screen.getAllByText("13").length).toBeGreaterThan(0);
    expect(localStorage.getItem("gotit.demo.v2")).toBeNull();
  });
  it("animates card changes and celebrates every third consecutive success", async () => {
    localStorage.removeItem("gotit.practiceEffects.v1");
    const thirdItemId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const thirdExerciseId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const attemptIds = [
      "88888888-8888-4888-8888-888888888888",
      "99999999-9999-4999-8999-999999999999",
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    ];
    const milestoneExercises = [
      { ...exercise, prompt: { ...exercise.prompt, text: "meaning one" } },
      {
        ...exercise,
        id: remedialExerciseId,
        learningItemId: secondItemId,
        prompt: { ...exercise.prompt, text: "meaning two" },
      },
      {
        ...exercise,
        id: thirdExerciseId,
        learningItemId: thirdItemId,
        prompt: { ...exercise.prompt, text: "meaning three" },
      },
    ];
    let attemptIndex = 0;
    mount(
      `/learn/session/recall?items=${itemId},${secondItemId},${thirdItemId}`,
      async (url) => {
        if (url.endsWith("/practice/sessions"))
          return json({ session: { ...session, itemCount: 3 } });
        if (url.endsWith("/exercises"))
          return json(
            {
              exercises: milestoneExercises,
              algorithmVersion: "server-v1",
            },
            201,
          );
        if (url.endsWith("/practice/attempts")) {
          const current = attemptIndex++;
          const target = milestoneExercises[current]!;
          return json(
            {
              ...receipt,
              attempt: {
                ...receipt.attempt,
                id: attemptIds[current]!,
                learningItemId: target.learningItemId,
                sequence: current + 1,
                result: "correct",
                score: 100,
                xpEarned: 10,
              },
              replayed: false,
            },
            201,
          );
        }
        throw new Error("Unexpected route");
      },
    );
    const user = userEvent.setup();
    await waitFor(() =>
      expect(document.querySelector(".launch-button")).toBeInTheDocument(),
    );
    await user.click(
      document.querySelector(".launch-button") as HTMLButtonElement,
    );

    for (let current = 0; current < milestoneExercises.length; current++) {
      await screen.findByRole("heading", {
        name: `meaning ${["one", "two", "three"][current]}`,
      });
      await user.type(await screen.findByRole("textbox"), "answer");
      await user.click(
        document.querySelector(
          ".live-exercise form button",
        ) as HTMLButtonElement,
      );
      await waitFor(() =>
        expect(document.querySelector(".live-feedback")).toBeInTheDocument(),
      );
      if (current < milestoneExercises.length - 1) {
        await user.click(
          document.querySelector(
            ".live-feedback > .button",
          ) as HTMLButtonElement,
        );
        expect(document.querySelector(".card-leaving")).toBeInTheDocument();
      }
    }

    expect(await screen.findByTestId("streak-celebration")).toBeInTheDocument();
    expect(
      screen.getByText("3", { selector: ".hud-chip.combo b" }),
    ).toBeInTheDocument();
  });
  it("plays matching as one interactive board and saves every resolved pair", async () => {
    const choiceA = "66666666-6666-4666-8666-666666666666";
    const choiceB = "77777777-7777-4777-8777-777777777777";
    const matchingExercises = [
      {
        ...exercise,
        exerciseType: "matching",
        kind: "multiple_choice",
        direction: "source_to_translation",
        prompt: {
          text: "remember",
          languageCode: "en",
          context: null,
          groupId: sessionId,
          choices: [
            { id: choiceA, text: "לזכור" },
            { id: choiceB, text: "תפוח" },
          ],
        },
      },
      {
        ...exercise,
        id: remedialExerciseId,
        learningItemId: secondItemId,
        exerciseType: "matching",
        kind: "multiple_choice",
        direction: "source_to_translation",
        prompt: {
          text: "apple",
          languageCode: "en",
          context: null,
          groupId: sessionId,
          choices: [
            { id: choiceA, text: "לזכור" },
            { id: choiceB, text: "תפוח" },
          ],
        },
      },
    ];
    const submitted: Array<Record<string, unknown>> = [];
    mount("/learn/session/matching", async (url, init) => {
      if (url.endsWith("/practice/sessions"))
        return json({
          session: {
            ...session,
            sessionType: "matching",
            itemCount: 2,
          },
        });
      if (url.endsWith("/exercises"))
        return json(
          { exercises: matchingExercises, algorithmVersion: "server-v1" },
          201,
        );
      if (url.endsWith("/practice/attempts")) {
        const body = JSON.parse(String(init?.body));
        submitted.push(body);
        const first = body.exerciseId === exerciseId;
        return json(
          {
            ...receipt,
            attempt: {
              ...receipt.attempt,
              id: first
                ? "88888888-8888-4888-8888-888888888888"
                : "99999999-9999-4999-8999-999999999999",
              learningItemId: first ? itemId : secondItemId,
              result: "correct",
              score: 100,
              expectedAnswer: first ? "לזכור" : "תפוח",
              xpEarned: 10,
            },
            replayed: false,
          },
          201,
        );
      }
      if (init?.method === "PATCH")
        return json({
          session: {
            ...session,
            status: "completed",
            itemCount: 2,
            attemptCount: 2,
            correctCount: 2,
            xpEarned: 30,
            endedAt: date,
            durationSeconds: 9,
          },
        });
      throw new Error("Unexpected route");
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "מתחילים" }));
    expect(
      await screen.findByRole("heading", { name: "חברו את הזוגות" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "remember" }));
    await user.click(screen.getByRole("button", { name: "לזכור" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /remember/ })).toBeDisabled(),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "apple" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "apple" }));
    await user.click(screen.getByRole("button", { name: "תפוח" }));
    await screen.findByRole("heading", { name: "כל הכבוד, סיימת!" });
    expect(submitted).toEqual([
      expect.objectContaining({ exerciseId, choiceId: choiceA }),
      expect.objectContaining({
        exerciseId: remedialExerciseId,
        choiceId: choiceB,
      }),
    ]);
  });
  it("starts the three-item drag and drop game and submits a dropped meaning", async () => {
    const thirdItemId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const thirdExerciseId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const choiceA = "66666666-6666-4666-8666-666666666666";
    const choiceB = "77777777-7777-4777-8777-777777777777";
    const choiceC = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const choices = [
      { id: choiceA, text: "לזכור" },
      { id: choiceB, text: "תפוח" },
      { id: choiceC, text: "ללמוד" },
    ];
    const dragExercises = [
      {
        ...exercise,
        exerciseType: "matching",
        kind: "multiple_choice",
        direction: "source_to_translation",
        prompt: {
          text: "remember",
          languageCode: "en",
          context: null,
          groupId: sessionId,
          choices,
        },
      },
      {
        ...exercise,
        id: remedialExerciseId,
        learningItemId: secondItemId,
        exerciseType: "matching",
        kind: "multiple_choice",
        direction: "source_to_translation",
        prompt: {
          text: "apple",
          languageCode: "en",
          context: null,
          groupId: sessionId,
          choices,
        },
      },
      {
        ...exercise,
        id: thirdExerciseId,
        learningItemId: thirdItemId,
        exerciseType: "matching",
        kind: "multiple_choice",
        direction: "source_to_translation",
        prompt: {
          text: "learn",
          languageCode: "en",
          context: null,
          groupId: sessionId,
          choices,
        },
      },
    ];
    let creationBody: Record<string, unknown> | undefined;
    let exerciseBody: Record<string, unknown> | undefined;
    const submitted: Array<Record<string, unknown>> = [];
    mount("/learn/session/drag_drop", async (url, init) => {
      if (url.endsWith("/practice/sessions")) {
        creationBody = JSON.parse(String(init?.body));
        return json({
          session: { ...session, sessionType: "matching", itemCount: 3 },
        });
      }
      if (url.endsWith("/exercises")) {
        exerciseBody = JSON.parse(String(init?.body));
        return json(
          { exercises: dragExercises, algorithmVersion: "server-v1" },
          201,
        );
      }
      if (url.endsWith("/practice/attempts")) {
        const body = JSON.parse(String(init?.body));
        submitted.push(body);
        const position = dragExercises.findIndex(
          (candidate) => candidate.id === body.exerciseId,
        );
        return json(
          {
            ...receipt,
            attempt: {
              ...receipt.attempt,
              id: [
                "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                "ffffffff-ffff-4fff-8fff-ffffffffffff",
              ][position],
              learningItemId: dragExercises[position]!.learningItemId,
              result: "correct",
              score: 100,
              expectedAnswer: choices[position]!.text,
              xpEarned: 10,
            },
            replayed: false,
          },
          201,
        );
      }
      throw new Error("Unexpected route");
    });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /מתחילים/ }));
    await screen.findByRole("heading", { name: "התאימו כל פירוש למילה" });
    expect(document.querySelectorAll(".drag-drop-row")).toHaveLength(3);
    expect(document.querySelectorAll(".meaning-card")).toHaveLength(3);
    expect(creationBody).toEqual(
      expect.objectContaining({ sessionType: "matching", count: 3 }),
    );
    expect(exerciseBody).toEqual(
      expect.objectContaining({
        count: 3,
        direction: "source_to_translation",
        kind: "multiple_choice",
      }),
    );

    const card = document.querySelector(".meaning-card") as HTMLButtonElement;
    const slot = document.querySelector(".drag-drop-slot") as HTMLButtonElement;
    const transfer = {
      effectAllowed: "none",
      dropEffect: "none",
      value: "",
      setData(_format: string, value: string) {
        this.value = value;
      },
      getData() {
        return this.value;
      },
    };
    fireEvent.dragStart(card, { dataTransfer: transfer });
    fireEvent.drop(slot, { dataTransfer: transfer });
    expect(submitted).toEqual([]);
    expect(slot).toBeEnabled();

    for (let position = 1; position < 3; position++) {
      const nextTransfer = {
        ...transfer,
        value: "",
      };
      fireEvent.dragStart(document.querySelectorAll(".meaning-card")[position], {
        dataTransfer: nextTransfer,
      });
      fireEvent.drop(document.querySelectorAll(".drag-drop-slot")[position], {
        dataTransfer: nextTransfer,
      });
    }
    expect(submitted).toEqual([]);

    const swapTransfer = { ...transfer, value: "" };
    fireEvent.dragStart(document.querySelectorAll(".drag-drop-slot")[0], {
      dataTransfer: swapTransfer,
    });
    fireEvent.drop(document.querySelectorAll(".drag-drop-slot")[1], {
      dataTransfer: swapTransfer,
    });
    expect(document.querySelectorAll(".drag-drop-slot")[0]).toHaveTextContent(
      choices[1].text,
    );
    fireEvent.dragStart(document.querySelectorAll(".drag-drop-slot")[0], {
      dataTransfer: swapTransfer,
    });
    fireEvent.drop(document.querySelectorAll(".drag-drop-slot")[1], {
      dataTransfer: swapTransfer,
    });

    await user.click(screen.getByRole("button", { name: "סיימתי" }));
    await waitFor(() => expect(submitted).toHaveLength(3));
    expect(submitted).toEqual([
      expect.objectContaining({ exerciseId, choiceId: choiceA }),
      expect.objectContaining({
        exerciseId: remedialExerciseId,
        choiceId: choiceB,
      }),
      expect.objectContaining({
        exerciseId: thirdExerciseId,
        choiceId: choiceC,
      }),
    ]);
    expect(screen.getByText("3 מתוך 3 נכונות")).toBeInTheDocument();
  });
  it("uses an in-app modal before abandoning an active study session", async () => {
    const fetchMock = mount(
      "/learn/session/recall?items=" + itemId,
      async (url, init) => {
        if (url.endsWith("/practice/sessions") && init?.method === "POST")
          return json({ session });
        if (url.endsWith("/exercises"))
          return json(
            { exercises: [exercise], algorithmVersion: "server-v1" },
            201,
          );
        if (
          url.endsWith(`/practice/sessions/${sessionId}`) &&
          init?.method === "PATCH"
        )
          return json({
            session: { ...session, status: "abandoned", endedAt: date },
          });
        if (url.endsWith("/capabilities"))
          return json({
            configured: {
              library: true,
              practice: true,
              dashboard: true,
              readingGeneration: true,
              speech: true,
            },
            learningLanguages: [],
          });
        if (url.includes("/learning/queue"))
          return json({ items: [], algorithmVersion: "server-v1" });
        if (url.includes("/practice/sessions"))
          return json({ items: [], nextCursor: null });
        throw new Error("Unexpected route");
      },
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "מתחילים" }));
    await user.click(screen.getByRole("button", { name: "יציאה" }));

    const dialog = screen.getByRole("dialog", { name: "לצאת מהתרגול?" });
    expect(dialog).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH"),
    ).toBe(false);

    await user.click(screen.getByRole("button", { name: "להמשיך ללמוד" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "יציאה" }));
    await user.click(screen.getByRole("button", { name: "יציאה מהתרגול" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url.endsWith(`/practice/sessions/${sessionId}`) &&
            init?.method === "PATCH" &&
            JSON.parse(String(init.body)).status === "abandoned",
        ),
      ).toBe(true),
    );
    expect(
      await screen.findByText("התרגול הופסק. התשובות שכבר אושרו נשמרו."),
    ).toBeInTheDocument();
  });
  it("enables pronunciation in an existing profile before creating its live session", async () => {
    const legacyProfile = {
      ...seedProfile,
      learningPreferences: {
        enabledSkills: ["recognition", "recall", "spelling"] as const,
      },
    };
    const requestOrder: string[] = [];
    let assessmentBody: Record<string, unknown> | undefined;
    const fetchMock = mount(
      "/learn/session/pronunciation?items=" + itemId,
      async (url, init) => {
        if (url.endsWith("/profile") && init?.method === "PATCH") {
          requestOrder.push("profile");
          const body = JSON.parse(String(init.body));
          expect(body.learningPreferences.enabledSkills).toEqual([
            "recognition",
            "recall",
            "spelling",
            "pronunciation",
          ]);
          return json({
            profile: {
              ...legacyProfile,
              learningPreferences: body.learningPreferences,
            },
          });
        }
        if (url.endsWith("/practice/sessions")) {
          requestOrder.push("session");
          return json({
            session: { ...session, sessionType: "pronunciation" },
          });
        }
        if (url.endsWith("/exercises")) {
          requestOrder.push("exercises");
          return json(
            {
              exercises: [
                {
                  ...exercise,
                  exerciseType: "pronunciation",
                  kind: "provider",
                  direction: "source_to_translation",
                  prompt: {
                    text: "remember",
                    languageCode: "en",
                    context: null,
                    audioUrl: `/api/v1/learning-items/${itemId}/audio`,
                    letterCount: 8,
                  },
                },
              ],
              algorithmVersion: "server-v1",
            },
            201,
          );
        }
        if (url.endsWith("/pronunciation/assessments")) {
          assessmentBody = JSON.parse(String(init?.body));
          return json(receipt, 201);
        }
        throw new Error("Unexpected route");
      },
      legacyProfile,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /מתחילים/u }));
    expect(
      await screen.findByRole("heading", { name: "remember" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/ההקלטה מוגבלת ל־6 שניות/u),
    ).not.toBeInTheDocument();
    expect(requestOrder).toEqual(["profile", "session", "exercises"]);
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) => url.endsWith("/profile") && init?.method === "PATCH",
      ),
    ).toHaveLength(1);
    let releaseSignal: AbortSignal | undefined;
    let finishRecording: ((audio: string) => void) | undefined;
    vi.mocked(recordVoice).mockImplementation(async (_cancel, release) => {
      releaseSignal = release;
      return new Promise<string>((resolve) => {
        finishRecording = resolve;
      });
    });
    const holdButton = screen.getByRole("button", {
      name: /לחצו והחזיקו כדי לדבר/u,
    });
    expect(holdButton.closest("section")).toHaveClass("provider-exercise");
    expect(screen.getByRole("button", { name: "דילוג" })).toHaveClass(
      "exercise-skip-action",
    );
    Object.assign(holdButton, { setPointerCapture: vi.fn() });
    fireEvent.pointerDown(holdButton, { button: 0, pointerId: 7 });
    await waitFor(() => expect(recordVoice).toHaveBeenCalledOnce());
    expect(releaseSignal?.aborted).toBe(false);
    fireEvent.pointerUp(holdButton, { button: 0, pointerId: 7 });
    expect(releaseSignal?.aborted).toBe(true);
    finishRecording?.("encoded-wav");
    await waitFor(() =>
      expect(assessmentBody).toMatchObject({
        exerciseId,
        audioBase64: "encoded-wav",
        languageCode: "en",
      }),
    );
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
          translationText: "לזכור",
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
    await user.click(screen.getByRole("button", { name: "remember" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("remember");
    expect(screen.getByRole("dialog")).toHaveTextContent("לזכור");
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        url.endsWith("/practice/attempts"),
      ),
    ).toHaveLength(0);
  });
  it("opens recent dashboard words in place without navigating to vocabulary", async () => {
    mount("/dashboard", async (url) => {
      if (url.includes("/dashboard?"))
        return json({
          counts: {
            total: 1,
            new: 0,
            learning: 1,
            reviewing: 0,
            mastered: 0,
            due: 0,
            difficult: 0,
            highPriority: 0,
            awaitingRecall: 0,
          },
          skills: [],
          modes: [],
          recentActivity: [
            {
              id: exerciseId,
              learningItemId: itemId,
              exerciseType: "recall",
              result: "correct",
              score: 100,
              createdAt: date,
              sourceText: "subscription",
              primaryTranslation: "מנוי",
            },
          ],
          recentActivityPagination: {
            page: 1,
            pageCount: 1,
            totalCount: 1,
            pageSize: 6,
          },
          dailyGoal: {
            type: "items",
            value: 5,
            current: 1,
            completed: false,
            date: "2026-09-15",
          },
          gamification: {
            totalXp: 10,
            level: 1,
            nextLevelXp: 100,
            todayXp: 10,
            dailyXpCap: 100,
            dailyXpRemaining: 90,
            dailyXpCapReached: false,
            postDailyCapPercent: 20,
            currentStreakDays: 1,
            longestStreakDays: 1,
            lastActivityDate: "2026-09-15",
          },
          weeklyActivity: { timezone: "Asia/Jerusalem", days: [] },
        });
      if (url.includes("/learning-items?"))
        return json({ items: [], nextCursor: null });
      if (url.endsWith("/word-packs")) return json({ packs: [] });
      throw new Error("Unexpected route");
    });
    const user = userEvent.setup();
    const wordButton = await screen.findByRole("button", {
      name: /subscription/u,
    });
    await user.click(wordButton);
    expect(screen.getByRole("dialog")).toHaveTextContent("subscription");
    expect(screen.getByRole("dialog")).toHaveTextContent("מנוי");
    expect(screen.getByRole("heading", { name: /שלום/u })).toBeInTheDocument();
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
  it("shows leveled word packs and adds a selected unit", async () => {
    const pack = {
      id: exerciseId,
      slug: "business-beginner-1-en-he",
      title: "יחידה 1: המשרד והצוות",
      description: "מילים בסיסיות על מקום העבודה",
      moduleNumber: 1,
      version: 1,
      wordCount: 12,
      installed: false,
      installedVersion: null,
      topic: { id: itemId, slug: "business", title: "עסקים" },
      track: {
        id: sessionId,
        slug: "business-beginner-en-he",
        title: "עסקים — מתחילים",
        levelCode: "beginner",
        cefrFrom: "A1",
        cefrTo: "A2",
        sourceLanguageCode: "en",
        translationLanguageCode: "he",
      },
      progress: {
        linked: 0,
        new: 0,
        learning: 0,
        reviewing: 0,
        mastered: 0,
        due: 0,
      },
    };
    const fetchMock = mount("/word-packs", async (url, init) => {
      if (
        url.endsWith("/word-packs") &&
        (!init?.method || init.method === "GET")
      )
        return json({ packs: [pack] });
      if (url.endsWith(`/word-packs/${pack.id}`))
        return json({
          pack,
          entries: [
            {
              id: itemId,
              sourceText: "office",
              translationText: "משרד",
              itemType: "word",
              partOfSpeech: "noun",
              exampleText: "The office is open.",
              learningItemId: null,
              excludedAt: null,
            },
            {
              id: secondItemId,
              sourceText: "meeting",
              translationText: "פגישה",
              itemType: "word",
              partOfSpeech: "noun",
              exampleText: "The meeting starts now.",
              learningItemId: null,
              excludedAt: null,
            },
          ],
        });
      if (url.endsWith(`/word-packs/${pack.id}/add`) && init?.method === "POST")
        return json(
          {
            packId: pack.id,
            added: 1,
            linkedExisting: 0,
            restored: 0,
            excluded: 1,
            total: 2,
          },
          201,
        );
      throw new Error("Unexpected route");
    });
    const user = userEvent.setup();
    expect(
      await screen.findByRole("heading", { name: "מאגרי מילים" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "כל הנושאים במקום אחד" }),
    ).toBeInTheDocument();
    const topicButton = screen.getByRole("button", { name: /עסקים/ });
    expect(topicButton).toHaveAttribute("aria-pressed", "false");
    await user.click(topicButton);
    expect(topicButton).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("עסקים — מתחילים")).toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", { name: "בחר והוסף מילים" }),
    );
    expect(
      await screen.findByText("2 מתוך 2 מילים מסומנות להוספה."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /meeting/ }));
    await user.click(screen.getByRole("button", { name: "הוסף 1 מילים" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url.endsWith(`/word-packs/${pack.id}/add`) &&
            init?.method === "POST",
        ),
      ).toBe(true),
    );
    const addCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url.endsWith(`/word-packs/${pack.id}/add`) && init?.method === "POST",
    );
    expect(JSON.parse(String(addCall?.[1]?.body))).toEqual({
      entryIds: [itemId],
    });
  });
});
