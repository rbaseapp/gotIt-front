import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PrivateLessonPage } from "../src/pages/PrivateLessonPage";
import { privateLessonSessionSchema } from "../src/lib/privateLesson";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  connect: vi.fn(),
  close: vi.fn(),
  send: vi.fn(() => true),
  setMicrophoneMuted: vi.fn(() => true),
  list: vi.fn(async () => []),
  complete: vi.fn(),
  remove: vi.fn(),
  capture: vi.fn(),
}));

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({
    profile: {
      defaultSourceLanguage: "en",
      defaultTranslationLanguage: "he",
      languages: [{ languageCode: "en", effectiveLevel: "B1" }],
      interests: ["technology"],
    },
    retryProfile: vi.fn(async () => undefined),
  }),
}));

vi.mock("../src/lib/privateLesson", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../src/lib/privateLesson")>();
  return {
    ...original,
    createPrivateLessonSession: mocks.create,
    connectPrivateLesson: mocks.connect,
    listPrivateLessons: mocks.list,
    completePrivateLessonSession: mocks.complete,
    deletePrivateLesson: mocks.remove,
  };
});

vi.mock("../src/lib/product", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/lib/product")>();
  return { ...original, product: mocks.capture };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <PrivateLessonPage />
    </MemoryRouter>,
  );
}

const session = {
  lesson: {
    id: "11111111-1111-4111-8111-111111111111",
    durationSeconds: 300,
    wrapUpAfterSeconds: 295,
    targetLanguageCode: "en",
    supportLanguageCode: "he",
    level: "B1",
    topic: "technology",
    grammarFocus: null,
    focusAreas: ["speaking", "vocabulary"],
    customFocus: null,
    continuesFromLessonId: null,
    teacherVoice: "female",
    speechRate: "normal",
    targetWords: [
      {
        learningItemId: "22222222-2222-4222-8222-222222222222",
        sourceText: "achieve",
        translationText: "להשיג",
      },
    ],
  },
  realtime: {
    clientSecret: "ephemeral-secret",
    expiresAt: null,
    model: "gpt-realtime-test",
    connectionUrl: "https://api.openai.com/v1/realtime/calls",
    openingEvent: {
      type: "response.create",
      response: { instructions: "Begin." },
    },
    wrapUpEvent: {
      type: "response.create",
      response: { instructions: "Summarize." },
    },
    translationEvent: {
      type: "response.create",
      response: { instructions: "Translate." },
    },
  },
} as const;

const savedLesson = {
  id: session.lesson.id,
  targetLanguageCode: "en",
  supportLanguageCode: "he",
  level: "B1",
  topic: "technology",
  grammarFocus: null,
  teacherVoice: "female",
  speechRate: "normal",
  plannedDurationSeconds: 300,
  actualDurationSeconds: 140,
  targetWords: session.lesson.targetWords,
  status: "completed",
  startedAt: "2026-09-27T10:00:00.000Z",
  endedAt: "2026-09-27T10:02:20.000Z",
  report: {
    summary: "You spoke clearly about technology.",
    assessment: {
      overallLevel: "B1",
      confidence: "medium",
      skills: {
        speaking: { score: 60, level: "B1", feedback: "Clear answers." },
        vocabulary: { score: 55, level: "B1", feedback: "Useful vocabulary." },
        grammar: { score: 52, level: "B1", feedback: "Mostly accurate." },
        fluency: { score: 56, level: "B1", feedback: "Good flow." },
        comprehension: {
          score: 62,
          level: "B1",
          feedback: "Relevant responses.",
        },
      },
    },
    strengths: ["Clear answers"],
    corrections: [],
    grammarPoints: [],
    vocabulary: [
      {
        learningItemId: session.lesson.targetWords[0].learningItemId,
        sourceText: "achieve",
        translationText: "להשיג",
        outcome: "needs_review",
        note: "Use it once more.",
      },
    ],
    newWordSuggestions: [],
    nextLessonPlan: "Practice a longer answer.",
    recommendedReviewItemIds: [session.lesson.targetWords[0].learningItemId],
  },
} as const;

const lessonWithSuggestion = {
  ...savedLesson,
  report: {
    ...savedLesson.report,
    newWordSuggestions: [
      {
        sourceText: "confident",
        translationText: "בטוח בעצמו",
        example: "I feel confident speaking today.",
      },
    ],
  },
} as const;

describe("private voice lesson", () => {
  beforeEach(() => {
    mocks.list.mockResolvedValue([]);
    mocks.complete.mockReset();
    mocks.remove.mockReset();
    mocks.capture.mockReset();
    mocks.capture.mockResolvedValue({
      capture: {
        outcome: "created",
        learningItemId: "55555555-5555-4555-8555-555555555555",
        occurrenceId: "66666666-6666-4666-8666-666666666666",
      },
    });
    mocks.setMicrophoneMuted.mockClear();
  });
  it("uses the authenticated app API without asking the learner for a token", async () => {
    mocks.create.mockResolvedValue(session);
    mocks.connect.mockImplementation(
      async (
        _session: unknown,
        _audio: unknown,
        handlers: { onOpen: () => void },
      ) => {
        handlers.onOpen();
        return {
          close: mocks.close,
          send: mocks.send,
          setMicrophoneMuted: mocks.setMicrophoneMuted,
        };
      },
    );
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByLabelText(/אסימון/u)).not.toBeInTheDocument();
    expect(screen.getByLabelText("השפה לתרגול")).toHaveValue("en");
    expect(screen.getByLabelText("השפה לתרגול")).toHaveDisplayValue(
      "English — English",
    );
    expect(
      within(screen.getByLabelText("השפה לתרגול")).getByRole("option", {
        name: "Hebrew — עברית",
      }),
    ).toHaveValue("he");
    expect(screen.getByLabelText("שפת עזרה")).toHaveDisplayValue(
      "Hebrew — עברית",
    );
    expect(screen.getByLabelText("רמה")).toHaveDisplayValue(
      "לפי הרמה בפרופיל שלי",
    );
    expect(screen.getByRole("option", { name: "מתחילים" })).toHaveValue("A1");
    expect(
      within(screen.getByLabelText("רמה")).queryByRole("option", {
        name: "A1",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("משך השיעור")).toHaveDisplayValue("5 דקות");
    await user.selectOptions(screen.getByLabelText("משך השיעור"), "10");
    await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        targetLanguageCode: "en",
        supportLanguageCode: "he",
        requestedDurationMinutes: 10,
        teacherVoice: "female",
        speechRate: "normal",
        topic: "technology",
        focusAreas: ["speaking", "vocabulary"],
        customFocus: null,
      }),
    );
    expect(await screen.findByText("achieve · להשיג")).toBeInTheDocument();
    const fullscreenLesson = screen.getByRole("dialog", {
      name: "השיעור הפרטי שלך",
    });
    expect(fullscreenLesson).toBeInTheDocument();
    expect(fullscreenLesson.parentElement).toBe(document.body);
    expect(document.body).toHaveClass("private-lesson-session-open");
    expect(mocks.connect).toHaveBeenCalledOnce();

    const openSidebar = vi.fn();
    window.addEventListener("gotit:open-sidebar", openSidebar, { once: true });
    await user.click(screen.getByRole("button", { name: "פתיחת תפריט" }));
    expect(openSidebar).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "השתקת המיקרופון" }));
    expect(mocks.setMicrophoneMuted).toHaveBeenCalledWith(true);
    expect(
      screen.getByRole("button", { name: "הפעלת המיקרופון" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("explicitly disables the help language when none is selected", async () => {
    mocks.create.mockRejectedValueOnce(new Error("stop after request"));
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("שפת עזרה"), "");
    await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ supportLanguageCode: null }),
      ),
    );
  });

  it("lets the learner request a translation and ends through the recap event", async () => {
    mocks.create.mockResolvedValue(session);
    mocks.send.mockClear();
    let onRealtimeEvent: ((event: Record<string, unknown>) => void) | undefined;
    mocks.connect.mockImplementation(
      async (
        _session: unknown,
        _audio: unknown,
        handlers: {
          onOpen: () => void;
          onEvent: (event: Record<string, unknown>) => void;
        },
      ) => {
        onRealtimeEvent = handlers.onEvent;
        handlers.onOpen();
        return {
          close: mocks.close,
          send: mocks.send,
          setMicrophoneMuted: mocks.setMicrophoneMuted,
        };
      },
    );
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("קול המורה"), "male");
    await user.selectOptions(screen.getByLabelText("מהירות דיבור"), "fast");
    await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));
    await screen.findByRole("button", { name: "תרגום המשפט האחרון" });

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ teacherVoice: "male", speechRate: "fast" }),
    );
    await user.click(
      screen.getByRole("button", { name: "תרגום המשפט האחרון" }),
    );
    expect(mocks.send).toHaveBeenCalledWith(session.realtime.translationEvent);

    await user.click(screen.getByRole("button", { name: "סיום השיעור" }));
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: "session.update" }),
    );
    onRealtimeEvent?.({ type: "response.done" });
    expect(mocks.send).toHaveBeenCalledWith(session.realtime.wrapUpEvent);
  });

  it("rejects a server response that could send the ephemeral secret elsewhere", () => {
    expect(
      privateLessonSessionSchema.safeParse({
        ...session,
        realtime: {
          ...session.realtime,
          connectionUrl: "https://evil.example/realtime",
        },
      }).success,
    ).toBe(false);
  });

  it("shows saved lesson reports in the journal", async () => {
    mocks.list.mockResolvedValue([savedLesson]);
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: /technology/u }),
    );
    expect(
      screen.getByRole("heading", {
        name: "You spoke clearly about technology.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Clear answers")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "תרגול המילים המומלצות עכשיו" }),
    ).toBeInTheDocument();
  });

  it("saves a suggested word from the lesson report", async () => {
    mocks.list.mockResolvedValue([lessonWithSuggestion]);
    const libraryChanged = vi.fn();
    window.addEventListener("gotit:library-changed", libraryChanged, {
      once: true,
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: /technology/u }),
    );
    await user.click(screen.getByRole("button", { name: "שמירת מילה" }));

    await waitFor(() =>
      expect(mocks.capture).toHaveBeenCalledWith(
        expect.anything(),
        "captures",
        "POST",
        expect.objectContaining({
          item: expect.objectContaining({
            sourceText: "confident",
            sourceLanguageCode: "en",
            translationLanguageCode: "he",
          }),
          translation: { text: "בטוח בעצמו", variants: [] },
        }),
        expect.any(String),
      ),
    );
    expect(await screen.findByRole("button", { name: "נשמרה" })).toBeDisabled();
    expect(libraryChanged).toHaveBeenCalledOnce();
  });

  it("shows an actionable error when saving a suggestion fails", async () => {
    mocks.list.mockResolvedValue([lessonWithSuggestion]);
    mocks.capture.mockRejectedValueOnce(new Error("Saving failed"));
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: /technology/u }),
    );
    await user.click(screen.getByRole("button", { name: "שמירת מילה" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Saving failed");
    expect(screen.getByRole("button", { name: "שמירת מילה" })).toBeEnabled();
  });

  it("finalizes and saves a report when the voice connection closes", async () => {
    mocks.create.mockResolvedValue(session);
    mocks.complete.mockResolvedValue(savedLesson);
    let closeSession: (() => void) | undefined;
    mocks.connect.mockImplementation(
      async (
        _session: unknown,
        _audio: unknown,
        handlers: { onOpen: () => void; onClose: () => void },
      ) => {
        closeSession = handlers.onClose;
        handlers.onOpen();
        return {
          close: mocks.close,
          send: mocks.send,
          setMicrophoneMuted: mocks.setMicrophoneMuted,
        };
      },
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));
    await screen.findByRole("button", { name: "סיום השיעור" });
    closeSession?.();

    await waitFor(() =>
      expect(mocks.complete).toHaveBeenCalledWith(
        session.lesson.id,
        expect.objectContaining({
          completionReason: "disconnected",
          turns: [],
        }),
      ),
    );
    expect(
      await screen.findByText("You spoke clearly about technology."),
    ).toBeInTheDocument();
  });
});
