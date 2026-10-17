import {
  act,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
import * as speech from "../src/lib/utils";

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30000 });

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({ user: { id: "11111111-1111-4111-8111-111111111111" } }),
}));
vi.mock("../src/lib/useLearningLanguage", () => ({
  useLearningLanguage: () => ({ code: "en", loading: false, error: "" }),
}));
vi.mock("../src/lib/voice", () => ({ recordVoice: vi.fn() }));

const audioPlay = vi.fn(() => Promise.resolve());

async function mount(
  type = "smart",
  options: Parameters<typeof focusFixture>[0] = {},
  resume = false,
  animate = false,
) {
  await i18n.changeLanguage("en");
  vi.stubEnv("VITE_PRACTICE_DESIGN", "true");
  vi.stubGlobal("matchMedia", () => ({
    matches: !animate,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "Audio",
    class {
      playbackRate = 1;
      play = audioPlay;
      pause() {}
    },
  );
  URL.createObjectURL = vi.fn(() => "blob:fixture");
  URL.revokeObjectURL = vi.fn();
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
  it.each(["en", "he"])(
    "keeps source words visible on the final matching board and after resume (%s)",
    async (locale) => {
      const view = await mount("matching", { count: 5, locale });
      await screen.findByRole("button", { name: "chair", exact: true });
      await act(() => i18n.changeLanguage(locale));
      for (const card of focusCards.slice(0, 2)) {
        await click(card.sourceText);
        await click(card.translationText);
        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: card.sourceText, exact: true }),
          ).toBeDisabled(),
        );
      }
      const assertFinalBoard = async () => {
        for (const card of focusCards.slice(2)) {
          expect(
            await screen.findByRole("button", {
              name: card.sourceText,
              exact: true,
            }),
          ).toBeVisible();
        }
        expect(
          [...document.querySelectorAll("[data-word] .w")].map(
            (word) => word.textContent,
          ),
        ).toEqual(focusCards.slice(2).map((card) => card.sourceText));
        expect(
          screen.queryByRole("button", {
            name: i18n.t("focusGames.backToAudio"),
          }),
        ).not.toBeInTheDocument();
      };
      await assertFinalBoard();
      const played = audioPlay.mock.calls.length;
      await click(`${i18n.t("focusGames.play")} water`);
      await waitFor(() => expect(audioPlay.mock.calls.length).toBe(played + 1));
      expect(view.fixture.attempts).toHaveLength(2);

      view.rerender(
        <MemoryRouter
          key="resume-final-board"
          initialEntries={[
            `/learn/session/matching?language=en&resume=${focusSessionId}`,
          ]}
        >
          <Routes>
            <Route path="/learn/session/:type" element={<DevFocusGamePage />} />
          </Routes>
        </MemoryRouter>,
      );
      await assertFinalBoard();
      await click("water");
      await click(focusCards[2].translationText);
      await waitFor(() => expect(view.fixture.attempts).toHaveLength(3));
      expect(view.fixture.attempts[2].result).toBe("correct");
    },
  );

  it("keeps cloze audio silent before a successful receipt, including retries", async () => {
    const speak = vi.spyOn(speech, "speak").mockReturnValue(true);
    const { fixture } = await mount("drag_drop");
    await screen.findByRole("button", { name: "chair", exact: true });
    const audio = screen.getByRole("button", {
      name: i18n.t("focusGames.playSentence"),
    });
    expect(audio).toBeDisabled();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 650));
    });
    expect(speak).not.toHaveBeenCalled();
    expect(audioPlay).not.toHaveBeenCalled();
    expect(
      fixture.requests.some((request) => request.path.includes("/speech/")),
    ).toBe(false);
    await click("book");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "chair", exact: true }),
      ).toBeEnabled(),
    );
    expect(audio).toBeDisabled();
    expect(speak).not.toHaveBeenCalled();
    expect(audioPlay).not.toHaveBeenCalled();
    await click("chair");
    await waitFor(() =>
      expect(speak).toHaveBeenCalledWith(focusCards[0].context, "en", 0.85),
    );
    expect(audio).toBeEnabled();
    speak.mockRestore();
  });
  it("cracks the gift on each tap, then lands the original accessory after the coin burst", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const { fixture } = await mount("drag_drop", {}, false, true);
    await click("book");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "chair", exact: true }),
      ).toBeEnabled(),
    );
    await click("chair");
    await waitFor(() =>
      expect(document.querySelector(".sen")).toHaveTextContent("I read a"),
    );
    await click("book");
    await screen.findByRole("dialog", { name: "Drag and complete completed" });
    await click("Session summary");
    await waitFor(() =>
      expect(document.querySelectorAll(".mochi .fg-mouth .wf")).toHaveLength(2),
    );
    await waitFor(
      () => expect(document.querySelector(".gift")).toBeInTheDocument(),
      { timeout: 8000 },
    );
    const gift = document.querySelector<HTMLButtonElement>(".gift")!;
    fireEvent.click(gift);
    expect(gift.querySelectorAll(".crack path")).toHaveLength(1);
    fireEvent.click(gift);
    expect(gift.querySelectorAll(".crack path")).toHaveLength(2);
    fireEvent.click(gift);
    expect(document.querySelector(".fg-session-end")).toHaveAttribute(
      "data-phase",
      "open",
    );
    expect(document.querySelectorAll(".fg-coins img")).toHaveLength(10);
    expect(document.querySelector(".fg-accessory")).toHaveAttribute(
      "src",
      expect.stringContaining("5aec6f179ff28ecaaa5ec7c111184bde.webp"),
    );
    await screen.findByRole("region", { name: "Session summary" });
    expect(document.querySelector(".fg-accessory")).toHaveClass("glasses");
    expect(document.querySelector(".pill.xpp")).toHaveTextContent(
      `${fixture.session.xpEarned} XP`,
    );
  });
  it("recovers a lost wrong-answer receipt without locking cloze or losing its rejected tile", async () => {
    const { fixture } = await mount("drag_drop", { failAttemptOnce: true });
    await click("book");
    await screen.findByRole("alert");
    await click("Retry");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "chair", exact: true }),
      ).toBeEnabled(),
    );
    expect(
      screen.getByRole("button", { name: "book", exact: true }),
    ).toBeDisabled();
    await click("chair");
    await screen.findByText(i18n.t("focusGames.assisted"));
    const calls = fixture.requests.filter((request) =>
      request.path.endsWith("/practice/attempts"),
    );
    expect(calls).toHaveLength(3);
    expect(calls[0].key).toBe(calls[1].key);
    expect(calls[0].body).toEqual(calls[1].body);
    expect(calls[2].body.exerciseId).not.toBe(calls[1].body.exerciseId);
    expect(fixture.attempts).toHaveLength(2);
  });
  it("keeps a wrong matching pair retryable with fresh server ids and one saved review item", async () => {
    const { fixture } = await mount("matching", { count: 5 });
    await click("chair");
    await click(focusCards[1].translationText);
    await screen.findByText("Almost… try another pair");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "chair", exact: true }),
      ).toBeEnabled(),
    );
    expect(
      document.querySelector("[data-word].matched"),
    ).not.toBeInTheDocument();
    await click("chair");
    await click(focusCards[0].translationText);
    await waitFor(() =>
      expect(document.querySelector("[data-word].matched")).toBeInTheDocument(),
    );
    const submitted = fixture.requests.filter((request) =>
      request.path.endsWith("/practice/attempts"),
    );
    expect(submitted).toHaveLength(2);
    expect(submitted[0].body.exerciseId).not.toBe(submitted[1].body.exerciseId);
    expect(submitted[1].body.hintsUsed).toBeGreaterThan(0);
    expect(
      readFocusCheckpoint(focusUserId, focusSessionId)?.difficultIds,
    ).toEqual([focusCards[0].learningItemId]);
    expect(document.querySelectorAll("[data-meaning]")).toHaveLength(3);
    expect(document.querySelectorAll("[data-word]")).toHaveLength(2);
  });

  it("ends the speaking stage without a fabricated score and pauses new speech games", async () => {
    const { fixture } = await mount("pronunciation");
    await click("Can't speak now — pause speaking games");
    await screen.findByRole("dialog", { name: "Pronunciation completed" });
    expect(
      await screen.findByText("Speaking games are paused for 15 minutes"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/0 \/ 100/)).not.toBeInTheDocument();
    expect(fixture.attempts).toHaveLength(1);
    expect(fixture.attempts[0].result).toBe("skipped");
    expect(
      Number(
        sessionStorage.getItem(`gotit.focus.speakingPause:${focusUserId}`),
      ),
    ).toBeGreaterThan(Date.now());
  });

  it("uses translation mode across listening words and marks mistakes as assisted", async () => {
    const { fixture } = await mount("listening");
    await screen.findByRole("textbox");
    await click("Can't listen now — write the translation instead");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "z" } });
    expect(screen.getByRole("textbox")).toHaveValue("");
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "chair" },
    });
    await waitFor(() => expect(fixture.attempts).toHaveLength(1));
    expect(
      fixture.requests.find((request) =>
        request.path.endsWith("/practice/attempts"),
      )?.body.hintsUsed,
    ).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
    expect(screen.getByText("Write the word")).toBeInTheDocument();
  });

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
    await click(/^Easy/i);
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
  it("runs all five modes with automatic question/board advance, retry and authoritative close", async () => {
    vi.mocked(recordVoice).mockResolvedValue("fixture-wave");
    const { fixture } = await mount();
    for (let i = 0; i < 2; i++) {
      await click("Show translation");
      await click(/^Easy/i);
    }
    await screen.findByRole("dialog", { name: "Flashcards completed" });
    await next();
    for (const card of focusCards.slice(0, 2)) {
      await click(card.sourceText);
      await click(card.translationText);
      await waitFor(() =>
        expect(fixture.attempts).toHaveLength(3 + focusCards.indexOf(card)),
      );
    }
    await screen.findByRole("dialog", { name: "Matching completed" });
    await next();
    await click("book");
    await screen.findByText("Almost… try another word");
    await click("chair");
    await screen.findByText(i18n.t("focusGames.assisted"));
    await waitFor(() =>
      expect(document.querySelector(".fg.drag_drop .sen")).toHaveTextContent(
        "I read a",
      ),
    );
    await click("book");
    await screen.findByRole("dialog", { name: "Drag and complete completed" });
    await next();
    for (const word of ["chair", "book"]) {
      await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: word },
      });
      await screen.findByText("Got it!");
      if (word === "chair")
        await waitFor(() =>
          expect(screen.getByRole("textbox")).toHaveValue(""),
        );
    }
    await screen.findByRole("dialog", { name: "Listen and write completed" });
    await click("Continue to the last game");
    await click("Start recording");
    await click("Allow microphone");
    await screen.findByText("Clear pronunciation from the test provider.");
    await next();
    await click("Can't speak now — pause speaking games");
    await screen.findByRole("dialog", { name: "Pronunciation completed" });
    await click("Session summary");
    await screen.findByRole("region", { name: "Session summary" });
    expect(fixture.session.status).toBe("completed");
    expect(fixture.attempts).toHaveLength(11);
    expect(screen.getByRole("dialog", { name: "Session summary" })).toHaveClass(
      "fg-completion-modal",
    );
    expect(document.querySelector(".fg-game-surface")).toHaveAttribute("inert");
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
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
  });

  it("rejects individual wrong letters, reveals after three mistakes and requeues only once", async () => {
    const { fixture } = await mount("listening", { failCloseOnce: true });
    await screen.findByRole("textbox");
    for (let i = 0; i < 3; i++)
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "z" } });
    await waitFor(() => expect(fixture.attempts).toHaveLength(1));
    expect(
      readFocusCheckpoint(focusUserId, focusSessionId)?.listeningRequeues,
    ).toEqual([focusCards[0].learningItemId]);
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "book" },
    });
    await screen.findByText("Got it!");
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "chair" },
    });
    await screen.findByRole("dialog", { name: "Listen and write completed" });
    expect(fixture.attempts).toHaveLength(3);
    const exercises = fixture.requests
      .filter((request) => request.path.endsWith("/practice/attempts"))
      .map((request) => request.body.exerciseId);
    expect(new Set(exercises).size).toBe(3);
    await click("Session summary");
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
    fireEvent.keyDown(window, { key: "1" });
    expect(fixture.attempts).toHaveLength(0);
    await click("Show translation");
    fireEvent.keyDown(window, { key: "1" });
    await waitFor(() => expect(fixture.attempts).toHaveLength(1));
    await click("Previous card");
    await screen.findByText("Got it!");
    fireEvent.keyDown(window, { key: "1" });
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
