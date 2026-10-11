import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevFocusGamePage } from "../src/pages/DevFocusGamePage";
import { clearTokens, setTokens } from "../src/lib/api";
import {
  checkpointKey,
  focusSequence,
  listeningLetters,
  matchingItemIds,
  readFocusCheckpoint,
  reviewItems,
  type FocusOutcome,
} from "../src/lib/focusPractice";
import { recordVoice } from "../src/lib/voice";
import {
  focusCards,
  focusFixture,
  focusSessionId,
  focusUserId,
} from "./focus-fixtures";
import i18n from "../src/i18n";

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ user: { id: "11111111-1111-4111-8111-111111111111" } }),
}));
vi.mock("../src/lib/useLearningLanguage", () => ({
  useLearningLanguage: () => ({ code: "en", loading: false, error: "" }),
}));
vi.mock("../src/lib/voice", () => ({ recordVoice: vi.fn() }));

async function mount(
  type = "smart",
  options: Parameters<typeof focusFixture>[0] = {},
  resume = false,
) {
  await i18n.changeLanguage("en");
  vi.stubEnv("VITE_PRACTICE_DESIGN", "true");
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  setTokens({
    accessToken: "test",
    refreshToken: "test-refresh",
    expiresIn: 3600,
  });
  const fixture = focusFixture({ count: 2, ...options });
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) =>
      fixture.response(
        url,
        init?.method,
        init?.body ? JSON.parse(String(init.body)) : {},
        new Headers(init?.headers).get("Idempotency-Key") ?? "",
      ),
    ),
  );
  const view = render(
    <MemoryRouter
      initialEntries={[
        `/learn/session/${type}?language=en&count=2${resume ? `&resume=${focusSessionId}` : ""}`,
      ]}
    >
      <Routes>
        <Route path="/learn/session/:type" element={<DevFocusGamePage />} />
      </Routes>
    </MemoryRouter>,
  );
  return { fixture, ...view };
}
afterEach(() => {
  clearTokens();
  vi.clearAllMocks();
});
const click = async (name: string | RegExp) => {
  await waitFor(() =>
    expect(screen.getByRole("button", { name })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name }));
};
const next = () => click(/^Continue$/);

describe("DEV focus game engine", () => {
  it("keeps the compact exit dialog over the game and restores focus on continue", async () => {
    const { fixture } = await mount("flashcards");
    await screen.findByText("What does this word mean?");
    const exit = screen.getByRole("button", { name: "Save and leave" });
    exit.focus();
    await click("Save and leave");
    expect(screen.getByRole("dialog", { name: "Leave midway?" })).toHaveClass(
      "fg-exit-modal",
    );
    expect(screen.getByText("Game 1 of 1 · Flashcards")).toBeInTheDocument();
    expect(document.querySelector(".fg-game-surface")).toHaveAttribute("inert");
    await click("Keep playing");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(exit).toHaveFocus();
    expect(fixture.attempts).toHaveLength(0);
  });

  it("shows a dashed connection before grading and waits for the actual matching receipt", async () => {
    await mount("matching");
    await click("chair");
    expect(document.querySelector(".fg-preview-connection")).toHaveAttribute(
      "stroke-dasharray",
      "7 6",
    );
    const original = vi.mocked(fetch).getMockImplementation()!;
    let release!: () => void;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (url.endsWith("practice/attempts"))
          return new Promise<Response>((resolve) => {
            release = () => {
              void original(url, init).then(resolve);
            };
          });
        return original(url, init);
      }),
    );
    await click(focusCards[0].translationText);
    expect(
      document.querySelector(".fg-preview-connection"),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-word].matched"),
    ).not.toBeInTheDocument();
    release();
    await waitFor(() =>
      expect(document.querySelector("[data-word].matched")).toBeInTheDocument(),
    );
    expect(
      document.querySelector(".fg-preview-connection"),
    ).not.toBeInTheDocument();
    expect(document.querySelectorAll(".fg-connections path")).toHaveLength(1);
  });

  it("animates a rated card out and brings the next card up with a fresh front face", async () => {
    const { fixture } = await mount("flashcards");
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    await click("Show translation");
    await click(/Remembered/i);
    expect(document.querySelector(".mover.out-easy")).toBeInTheDocument();
    await waitFor(() => expect(fixture.attempts).toHaveLength(1));
    await waitFor(() =>
      expect(document.querySelector(".mover.in .word")).toHaveTextContent(
        "book",
      ),
    );
    expect(document.querySelector(".flipper")).not.toHaveClass("on");
    expect(
      screen.getByRole("button", { name: "Show translation" }),
    ).toBeEnabled();
  });

  it.each([
    "flashcards",
    "matching",
    "drag_drop",
    "listening",
    "pronunciation",
    "smart",
  ])(
    "starts %s for library languages omitted from profile capabilities",
    async (type) => {
      const { fixture } = await mount(type, { omitCapabilityLanguage: true });
      await waitFor(() =>
        expect(
          fixture.requests.some((request) =>
            request.path.endsWith("/exercises"),
          ),
        ).toBe(true),
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        fixture.requests.some((request) => request.path.endsWith("/profile")),
      ).toBe(true);
      expect(
        fixture.requests.some(
          (request) =>
            request.path.endsWith("/practice/sessions") &&
            request.method === "POST",
        ),
      ).toBe(true);
    },
  );
  it("preserves explicitly disabled skills when a language capability entry is missing", async () => {
    const { fixture } = await mount("listening", {
      omitCapabilityLanguage: true,
      enabledSkills: ["recognition"],
    });
    await screen.findByRole("alert");
    expect(fixture.requests.every((request) => request.method === "GET")).toBe(
      true,
    );
  });
  it("runs the five real modes, transitions, correction round, voice feedback and authoritative close", async () => {
    vi.mocked(recordVoice).mockResolvedValue("fixture-wave");
    const { fixture } = await mount();
    for (let i = 0; i < 2; i++) {
      await click("Show translation");
      await click(/Remembered/i);
    }
    await screen.findByText("Flashcards completed");
    await next();
    for (const card of focusCards.slice(0, 2)) {
      await click(card.sourceText);
      await click(card.translationText);
      await waitFor(() =>
        expect(fixture.attempts).toHaveLength(3 + focusCards.indexOf(card)),
      );
    }
    await next();
    await screen.findByText("Matching completed");
    await next();
    // A wrong recognition answer stays in the review list even after another skill succeeds.
    await click("book");
    await screen.findByText("Let's review the correct answer");
    await next();
    await click("book");
    await screen.findByText("Got it!");
    await next();
    await screen.findByText("Drag and complete completed");
    await next();
    for (const word of ["chair", "book"]) {
      fireEvent.change(
        await screen.findByRole("textbox", { name: "Your answer" }),
        { target: { value: word } },
      );
      await click("Check answer");
      await screen.findByText("Got it!");
      await next();
    }
    await screen.findByText("Listen and write completed");
    await next();
    await click("Start recording");
    await screen.findByText("Clear pronunciation from the test provider.");
    await next();
    await click("Can't speak now — skip word");
    await screen.findByText("Word skipped");
    await next();
    await screen.findByText("Pronunciation completed");
    await click("Review 1 words before finishing");
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Your answer" }),
      { target: { value: "chair" } },
    );
    await click("Check answer");
    await screen.findByText("Got it!");
    await next();
    await click("Finish session");
    await screen.findByRole("region", { name: "Session summary" });
    expect(screen.getByRole("dialog", { name: "Session summary" })).toHaveClass(
      "fg-completion-modal",
    );
    expect(document.querySelector(".fg-game-surface")).toHaveAttribute("inert");
    expect(document.querySelector(".fg-game-surface main")).toBeInTheDocument();
    expect(fixture.session.status).toBe("completed");
    expect(fixture.attempts).toHaveLength(11);
    expect(
      screen.getAllByText(`${fixture.session.xpEarned} XP`).length +
        screen.getAllByText(`+${fixture.session.xpEarned} XP`).length,
    ).toBeGreaterThan(0);
    const issueTypes = fixture.requests
      .filter((request) => request.path.endsWith("/exercises"))
      .map((request) => request.body.exerciseType);
    expect(
      issueTypes.filter(
        (type, index) => index === 0 || type !== issueTypes[index - 1],
      ),
    ).toEqual([
      "flashcards",
      "matching",
      "recall",
      "listening_spelling",
      "pronunciation",
      "recall",
    ]);
    expect(
      fixture.requests.find(
        (request) =>
          request.path.endsWith("/practice/sessions") &&
          request.method === "POST",
      )?.body,
    ).toMatchObject({
      sourceLanguageCode: "en",
      sessionType: "smart_review",
      count: 2,
    });
    expect(
      sessionStorage.getItem(checkpointKey(focusUserId, focusSessionId)),
    ).not.toContain("fixture-wave");
  });

  it("preserves an ambiguous creation intent across a tab reload", async () => {
    const first = await mount("recall", { failCreateOnce: true });
    await screen.findByRole("alert");
    const operation = first.fixture.requests.find(
      (request) =>
        request.method === "POST" &&
        request.path.endsWith("/practice/sessions"),
    )!;
    first.unmount();
    const second = await mount("recall");
    await screen.findByRole("textbox", { name: "Your answer" });
    const replay = second.fixture.requests.find(
      (request) =>
        request.method === "POST" &&
        request.path.endsWith("/practice/sessions"),
    )!;
    expect(replay.key).toBe(operation.key);
    expect(replay.body).toEqual(operation.body);
    expect(
      Object.keys(sessionStorage).filter((key) =>
        key.startsWith("gotit.focus.creation.v1:"),
      ),
    ).toEqual([]);
  });

  it("retries a committed answer with the same payload and id, then resumes without double XP", async () => {
    const { fixture, unmount } = await mount("recall", {
      failAttemptOnce: true,
    });
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Your answer" }),
      { target: { value: "chair" } },
    );
    await click("Check answer");
    await screen.findByRole("alert");
    expect(screen.getByRole("textbox")).toBeDisabled();
    await click("Retry");
    await screen.findByText("Got it!");
    const calls = fixture.requests.filter((request) =>
      request.path.endsWith("/practice/attempts"),
    );
    expect(calls).toHaveLength(2);
    expect(calls[0].key).toBe(calls[1].key);
    expect(calls[0].body).toEqual(calls[1].body);
    expect(fixture.attempts).toHaveLength(1);
    const saved = readFocusCheckpoint(focusUserId, focusSessionId)!;
    unmount();
    // Same server session on remount; check the actual acknowledged XP as the baseline.
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) =>
        fixture.response(
          url,
          init?.method,
          init?.body ? JSON.parse(String(init.body)) : {},
          new Headers(init?.headers).get("Idempotency-Key") ?? "",
        ),
      ),
    );
    render(
      <MemoryRouter
        initialEntries={[
          `/learn/session/recall?language=en&resume=${focusSessionId}`,
        ]}
      >
        <Routes>
          <Route path="/learn/session/:type" element={<DevFocusGamePage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Got it!");
    expect(screen.getByText("4 XP")).toBeInTheDocument();
    expect(saved.outcomes).toHaveLength(1);
    await next();
    expect(await screen.findByRole("textbox")).toHaveValue("");
  });

  it("offers a second listening attempt as a new server exercise and preserves the remaining queue", async () => {
    const { fixture } = await mount("listening", { failCloseOnce: true });
    fireEvent.change(await screen.findByRole("textbox"), {
      target: { value: "wrong" },
    });
    await click("Check answer");
    await click("Try this word again");
    fireEvent.change(await screen.findByRole("textbox"), {
      target: { value: "chair" },
    });
    await click("Check answer");
    await screen.findByText("Got it!");
    await next();
    fireEvent.change(await screen.findByRole("textbox"), {
      target: { value: "book" },
    });
    await click("Check answer");
    await screen.findByText("Got it!");
    await next();
    await screen.findByText("Listen and write completed");
    expect(fixture.attempts).toHaveLength(3);
    const exercises = fixture.requests
      .filter((request) => request.path.endsWith("/practice/attempts"))
      .map((request) => request.body.exerciseId);
    expect(new Set(exercises).size).toBe(3);
    await click("Finish session");
    await screen.findByRole("alert");
    await click("Retry");
    await screen.findByRole("region", { name: "Session summary" });
    expect(fixture.session.xpEarned).toBe(14);
    expect(
      fixture.requests.filter((request) => request.method === "PATCH"),
    ).toHaveLength(2);
  });

  it("refreshes a definitively expired exercise instead of trapping its old pending answer", async () => {
    const { fixture } = await mount("recall", { expireAttemptOnce: true });
    fireEvent.change(await screen.findByRole("textbox"), {
      target: { value: "chair" },
    });
    await click("Check answer");
    await screen.findByRole("alert");
    await click("Retry");
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "chair" },
    });
    await click("Check answer");
    await screen.findByText("Got it!");
    const submissions = fixture.requests.filter((request) =>
      request.path.endsWith("/practice/attempts"),
    );
    expect(submissions).toHaveLength(2);
    expect(submissions[0].body.exerciseId).not.toBe(
      submissions[1].body.exerciseId,
    );
    expect(fixture.attempts).toHaveLength(1);
  });

  it("requires revealing a flashcard before keyboard rating and allows reviewing a prior card without resubmitting", async () => {
    const { fixture } = await mount("flashcards");
    await screen.findByText("What does this word mean?");
    fireEvent.keyDown(window, { key: "3" });
    expect(fixture.attempts).toHaveLength(0);
    await click("Show translation");
    fireEvent.keyDown(window, { key: "3" });
    await waitFor(() => expect(fixture.attempts).toHaveLength(1));
    await click("Previous card");
    await screen.findByText("Got it!");
    fireEvent.keyDown(window, { key: "3" });
    expect(fixture.attempts).toHaveLength(1);
  });

  it("omits unavailable speech games and rejects direct speech games without creating a session", async () => {
    expect(focusSequence("smart", ["recognition", "recall"], false, 5)).toEqual(
      ["flashcards", "matching", "drag_drop"],
    );
    const { fixture } = await mount("pronunciation", { speech: false });
    await screen.findByText(
      "This game is unavailable for your current learning settings.",
    );
    expect(fixture.requests.some((request) => request.method === "POST")).toBe(
      false,
    );
  });
});

describe("focus practice safeguards", () => {
  it("keeps matching boards distinct and leaves recall available when meanings repeat", () => {
    const cards = [
      focusCards[0],
      { ...focusCards[1], translationText: focusCards[0].translationText },
    ];
    expect(matchingItemIds(cards)).toEqual([focusCards[0].learningItemId]);
    expect(
      focusSequence("smart", ["recognition", "recall"], false, 2, 1),
    ).toEqual(["flashcards", "drag_drop"]);
  });
  it("keeps failures per skill, resolves same-skill retries and explicit correction rounds", () => {
    const base = {
      attemptId: focusUserId,
      itemId: focusCards[0].learningItemId,
      exerciseId: focusSessionId,
      stage: 0,
      score: 0,
      xp: 0,
      expectedAnswer: "chair",
    };
    const wrong: FocusOutcome = {
      ...base,
      mode: "drag_drop",
      result: "incorrect",
    };
    const other: FocusOutcome = {
      ...base,
      mode: "pronunciation",
      stage: 1,
      score: 100,
      result: "correct",
    };
    expect(reviewItems([wrong, other])).toEqual([base.itemId]);
    expect(reviewItems([wrong, { ...other, mode: "drag_drop" }])).toEqual([]);
    expect(reviewItems([wrong, { ...other, review: true }])).toEqual([]);
  });
  it("keeps repeated letter tiles, spaces and non-Latin input usable without grading locally", () => {
    const word = { ...focusCards[0], sourceText: "hello world" };
    const bank = listeningLetters(word, focusSessionId);
    expect(bank.filter((letter) => letter === "l")).toHaveLength(3);
    expect(bank).not.toContain(" ");
    expect(bank).toEqual(listeningLetters(word, focusSessionId));
    expect(
      listeningLetters({ ...word, sourceText: "שלום" }, focusSessionId),
    ).toHaveLength(4);
  });
  it("rejects invalid checkpoint data and isolates cached sessions by owner", () => {
    sessionStorage.setItem(
      checkpointKey(focusUserId, focusSessionId),
      '{"version":1}',
    );
    expect(readFocusCheckpoint(focusUserId, focusSessionId)).toBeUndefined();
    expect(readFocusCheckpoint(focusSessionId, focusSessionId)).toBeUndefined();
  });
});
