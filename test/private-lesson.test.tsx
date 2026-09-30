import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PrivateLessonPage } from "../src/pages/PrivateLessonPage";
import { privateLessonSessionSchema } from "../src/lib/privateLesson";
import { ApiError } from "../src/lib/api";
import { courseWithPlan } from "./course-fixtures";

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
  setup: vi.fn(),
  createRoadmap: vi.fn(),
  course: vi.fn(),
}));
const legacySetupControls = false;

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
    getPrivateLessonSetup: mocks.setup,
    createPrivateLessonRoadmap: mocks.createRoadmap,
  };
});

vi.mock("../src/lib/product", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/lib/product")>();
  return { ...original, product: mocks.capture };
});
vi.mock("../src/lib/courses", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/lib/courses")>();
  return {
    ...original,
    courseApi: {
      ...original.courseApi,
      get: mocks.course,
      homework: vi.fn(async () => {
        throw new ApiError(
          404,
          "LEARNING_DOCUMENT_NOT_FOUND",
          "No homework for legacy report",
        );
      }),
    },
  };
});

function renderPage(initialEntry = "/private-lesson") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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
    lessonMode: "standard",
    teachingLanguage: "target",
    level: "B1",
    topic: "technology",
    grammarFocus: null,
    focusAreas: ["speaking", "vocabulary"],
    customFocus: null,
    correctionMode: "recast",
    vocabularyMode: "learned",
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

const setup = {
  preferences: {
    supportLanguageCode: "he",
    lessonMode: "standard",
    teachingLanguage: "target",
    requestedDurationMinutes: 5,
    teacherVoice: "female",
    speechRate: "normal",
    focusAreas: ["speaking", "vocabulary"],
    customFocus: null,
    correctionMode: "recast",
    vocabularyMode: "learned",
  },
  roadmap: null,
  curriculum: {
    recommended: {
      goalKind: "grammar",
      goalKey: "modal-verbs",
      reason: "A practical next step for level B1",
    },
    communicationGoals: [{ key: "everyday-conversation" }],
    grammarTopics: [
      {
        key: "modal-verbs",
        cefr: "B1",
        prerequisites: ["present-simple-continuous"],
      },
      {
        key: "passive-voice",
        cefr: "B1",
        prerequisites: ["verb-forms-v1-v2-v3"],
      },
    ],
  },
} as const;

const roadmap = {
  id: "77777777-7777-4777-8777-777777777777",
  targetLanguageCode: "en",
  goalKind: "recommended",
  goalKey: "recommended-foundation",
  goalTitle: "Modal Verbs",
  recommendedReason: "A practical next step for level B1",
  status: "active",
  currentMilestonePosition: 1,
  milestones: [
    "foundation",
    "guided-use",
    "controlled-conversation",
    "free-conversation",
    "independent-mastery",
  ].map((key, index) => ({
    id: `88888888-8888-4888-8888-88888888888${index}`,
    position: index + 1,
    key,
    title: key,
    description: key,
    communicationObjective: "Use modal verbs in conversation",
    grammarTopics: ["modal-verbs"],
    successCriteria: { minimumLessons: 2, targetScore: 75 },
    status: index === 0 ? "current" : "locked",
    progressScore: 0,
    evidenceLessonCount: 0,
  })),
} as const;

const savedLesson = {
  id: session.lesson.id,
  targetLanguageCode: "en",
  supportLanguageCode: "he",
  lessonMode: "standard",
  teachingLanguage: "target",
  level: "B1",
  topic: "technology",
  grammarFocus: null,
  focusAreas: ["speaking", "vocabulary"],
  customFocus: null,
  correctionMode: "recast",
  vocabularyMode: "learned",
  continuesFromLessonId: null,
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
    mocks.setup.mockResolvedValue(setup);
    mocks.createRoadmap.mockReset();
    mocks.createRoadmap.mockResolvedValue(roadmap);
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

  it("offers one recommended roadmap action and keeps the full catalog optional", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      await screen.findByRole("button", { name: /מסלול הלמידה/u }),
    );

    expect(
      (await screen.findAllByText("פעלים מודאליים")).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("מומלץ עבורך")).toHaveLength(2);
    expect(screen.queryByText("סביל — Passive Voice")).not.toBeVisible();

    await user.click(
      screen.getAllByText("מומלץ עבורך").at(-1)!.closest("button")!,
    );
    expect(mocks.createRoadmap).toHaveBeenCalledWith({
      targetLanguageCode: "en",
      goalKind: "recommended",
      goalKey: "modal-verbs",
    });
  });

  it("recovers a failed course load and starts with the approved course language pair", async () => {
    const course = courseWithPlan(true);
    mocks.course.mockReset();
    mocks.course
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ course });
    mocks.create.mockResolvedValueOnce(session);
    mocks.connect.mockImplementationOnce(async () => ({
      close: mocks.close,
      send: mocks.send,
      setMicrophoneMuted: mocks.setMicrophoneMuted,
    }));
    const user = userEvent.setup();
    renderPage(`/private-lesson?course=${course.id}&language=de`);
    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
    expect(screen.getByRole("button", { name: "התחלת השיעור" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "ניסיון נוסף" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "התחלת השיעור" }),
      ).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          courseId: course.id,
          targetLanguageCode: "en",
          supportLanguageCode: "he",
        }),
      ),
    );
  });

  it("shows the existing Rachel portrait for a child course and leaves adult setup unchanged", async () => {
    mocks.course.mockReset();
    const child = courseWithPlan(true);
    child.preferences.ageGroup = "child";
    child.versions[0]!.preferences.ageGroup = "child";
    mocks.course.mockResolvedValueOnce({ course: child });
    const childPage = renderPage(`/private-lesson?course=${child.id}`);
    expect(await screen.findByRole("img", { name: /רייצ/u })).toHaveClass(
      "female",
    );
    childPage.unmount();

    const adult = courseWithPlan(true);
    mocks.course.mockResolvedValueOnce({ course: adult });
    renderPage(`/private-lesson?course=${adult.id}`);
    await screen.findByText(adult.nextLesson!.title);
    expect(
      screen.queryByRole("img", { name: /רייצ/u }),
    ).not.toBeInTheDocument();
  });

  it("lets a grammar course use its approved support language for explanations", async () => {
    const course = courseWithPlan(true);
    course.preferences.absoluteBeginner = false;
    course.versions[0]!.preferences.absoluteBeginner = false;
    mocks.course.mockResolvedValueOnce({ course });
    mocks.create.mockRejectedValueOnce(new Error("stop after request"));
    const user = userEvent.setup();
    renderPage(`/private-lesson?course=${course.id}`);
    const selector = await screen.findByRole("combobox", {
      name: "השפה שבה המורה יסביר",
    });
    expect(selector).toHaveAttribute("dir", "auto");
    await user.selectOptions(selector, "support");
    await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: course.id,
          targetLanguageCode: "en",
          supportLanguageCode: "he",
          teachingLanguage: "support",
        }),
      ),
    );
  });

  it("opens level details when the shell level action targets the page", async () => {
    const user = userEvent.setup();
    renderPage("/private-lesson?view=level");

    const dialog = await screen.findByRole("dialog", {
      name: /הרמה הנוכחית שלך/u,
    });
    expect(dialog).toBeInTheDocument();
    await user.click(
      within(dialog).getAllByRole("button", { name: "סגירה" }).at(-1)!,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("starts a zero-background lesson with a teaching language and A1 level", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("radio", { name: /מתחילים מאפס/u }),
    );
    await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          targetLanguageCode: "en",
          supportLanguageCode: "he",
          lessonMode: "absolute_beginner",
          teachingLanguage: "support",
          requestedLevel: "A1",
          speechRate: "slow",
        }),
      ),
    );
  });
  it("offers Hebrew explanations while keeping English as the practiced language", async () => {
    mocks.create.mockRejectedValueOnce(new Error("stop after request"));
    const user = userEvent.setup();
    renderPage();
    const selector = await screen.findByRole("combobox", {
      name: "השפה שבה המורה יסביר",
    });
    expect(selector).toHaveAttribute("dir", "auto");
    await user.selectOptions(selector, "support");
    expect(
      screen.getByText(/המילים והמשפטים לתרגול יישארו בשפת היעד/u),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          targetLanguageCode: "en",
          supportLanguageCode: "he",
          lessonMode: "standard",
          teachingLanguage: "support",
        }),
      ),
    );
  });

  it("requires a chosen support language for explanations, including an RTL language", async () => {
    mocks.setup.mockResolvedValueOnce({
      ...setup,
      preferences: { ...setup.preferences, supportLanguageCode: null },
    });
    mocks.create.mockRejectedValueOnce(new Error("stop after request"));
    const user = userEvent.setup();
    renderPage();
    const selector = await screen.findByRole("combobox", {
      name: "השפה שבה המורה יסביר",
    });
    await user.selectOptions(selector, "support");
    const start = screen.getByRole("button", { name: "התחלת השיעור" });
    expect(start).toBeDisabled();
    await user.click(screen.getByRole("combobox", { name: "בחירת שפת הסבר" }));
    await user.click(screen.getByRole("option", { name: /Arabic/u }));
    expect(start).toBeEnabled();
    await user.click(start);
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          targetLanguageCode: "en",
          supportLanguageCode: "ar",
          teachingLanguage: "support",
        }),
      ),
    );
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
    await screen.findByText("English — English");
    await user.click(
      screen.getByRole("button", { name: "בחירת נושא או מיקוד אחר" }),
    );
    const optionsDialog = screen.getByRole("dialog", {
      name: "התאמת השיעור הזה",
    });
    await user.selectOptions(
      within(optionsDialog).getByRole("combobox", { name: "משך השיעור" }),
      "10",
    );
    await user.click(
      within(optionsDialog).getByRole("button", { name: "התחלת השיעור" }),
    );

    if (legacySetupControls) {
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
    }
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        targetLanguageCode: "en",
        supportLanguageCode: "he",
        lessonMode: "standard",
        teachingLanguage: "target",
        requestedDurationMinutes: 10,
        teacherVoice: "female",
        speechRate: "normal",
        topic: "technology",
        focusAreas: ["speaking", "vocabulary"],
        customFocus: null,
        correctionMode: "recast",
        vocabularyMode: "learned",
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

    const { onAudioLevel } = mocks.connect.mock.calls[0][2] as {
      onAudioLevel: (level: number) => void;
    };
    const avatar = within(fullscreenLesson).getByRole("img");
    act(() => onAudioLevel(0.3));
    expect(avatar).toHaveClass("speaking");
    expect(
      Number(avatar.style.getPropertyValue("--tutor-mouth-soft")),
    ).toBeGreaterThan(0);
    expect(
      Number(avatar.style.getPropertyValue("--tutor-mouth-wide")),
    ).toBeGreaterThan(0);
    act(() => onAudioLevel(0));
    expect(avatar).toHaveClass("listening");
    expect(Number(avatar.style.getPropertyValue("--tutor-mouth-soft"))).toBe(0);

    const openSidebar = vi.fn();
    window.addEventListener("gotit:open-sidebar", openSidebar, { once: true });
    await user.click(screen.getByRole("button", { name: "פתיחת תפריט" }));
    expect(openSidebar).toHaveBeenCalledOnce();

    const talk = screen.getByRole("button", { name: "לחצו והחזיקו כדי לדבר" });
    expect(mocks.connect.mock.calls[0][4]).toBe(true);
    expect(talk).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(talk);
    expect(mocks.setMicrophoneMuted).not.toHaveBeenCalled();
    fireEvent.pointerDown(talk, { pointerId: 1, button: 0 });
    expect(mocks.setMicrophoneMuted).toHaveBeenLastCalledWith(false);
    expect(talk).toHaveAttribute("aria-pressed", "true");
    fireEvent.pointerUp(talk, { pointerId: 1 });
    expect(mocks.setMicrophoneMuted).toHaveBeenLastCalledWith(true);
    expect(talk).toHaveAttribute("aria-pressed", "false");
  });

  it("stops talking on pointer cancellation, keyboard release, and lost focus", async () => {
    mocks.create.mockResolvedValue(session);
    mocks.connect.mockImplementation(async (_session, _audio, handlers) => {
      handlers.onOpen();
      return {
        close: mocks.close,
        send: mocks.send,
        setMicrophoneMuted: mocks.setMicrophoneMuted,
      };
    });
    const user = userEvent.setup();
    renderPage();
    const start = await screen.findByRole("button", { name: "התחלת השיעור" });
    await waitFor(() => expect(start).toBeEnabled());
    await user.click(start);
    const talk = await screen.findByRole("button", {
      name: "לחצו והחזיקו כדי לדבר",
    });
    await waitFor(() => expect(talk).toBeEnabled());

    fireEvent.pointerDown(talk, { pointerId: 3, button: 0 });
    fireEvent.pointerCancel(talk, { pointerId: 3 });
    expect(mocks.setMicrophoneMuted.mock.calls.slice(-2)).toEqual([
      [false],
      [true],
    ]);

    fireEvent.keyDown(talk, { key: " " });
    fireEvent.keyDown(talk, { key: " ", repeat: true });
    expect(mocks.setMicrophoneMuted).toHaveBeenLastCalledWith(false);
    fireEvent.keyUp(talk, { key: " " });
    expect(mocks.setMicrophoneMuted).toHaveBeenLastCalledWith(true);

    fireEvent.pointerDown(talk, { pointerId: 4, button: 0 });
    fireEvent.blur(window);
    expect(mocks.setMicrophoneMuted).toHaveBeenLastCalledWith(true);
    expect(talk).toHaveAttribute("aria-pressed", "false");
  });

  it("explicitly disables the help language when none is selected", async () => {
    mocks.create.mockRejectedValueOnce(new Error("stop after request"));
    mocks.setup.mockResolvedValueOnce({
      ...setup,
      preferences: { ...setup.preferences, supportLanguageCode: null },
    });
    const user = userEvent.setup();
    renderPage();
    const startButton = await screen.findByRole("button", {
      name: "התחלת השיעור",
    });
    await waitFor(() => expect(startButton).toBeEnabled());
    await user.click(startButton);

    if (legacySetupControls) {
      await user.selectOptions(screen.getByLabelText("שפת עזרה"), "");
      await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));
    }
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ supportLanguageCode: null }),
      ),
    );
  });

  it("lets the learner choose deep grammatical correction", async () => {
    mocks.create.mockRejectedValueOnce(new Error("stop after request"));
    mocks.setup.mockResolvedValueOnce({
      ...setup,
      preferences: { ...setup.preferences, correctionMode: "deep_explanation" },
    });
    const user = userEvent.setup();
    renderPage();
    const startButton = await screen.findByRole("button", {
      name: "התחלת השיעור",
    });
    await waitFor(() => expect(startButton).toBeEnabled());
    await user.click(startButton);

    if (legacySetupControls) {
      expect(screen.getByDisplayValue("recast")).toBeChecked();
      await user.click(screen.getByDisplayValue("deep_explanation"));
      await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));
    }
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ correctionMode: "deep_explanation" }),
      ),
    );
  });

  it("lets the learner choose a free lesson without saved vocabulary", async () => {
    mocks.create.mockRejectedValueOnce(new Error("stop after request"));
    mocks.setup.mockResolvedValueOnce({
      ...setup,
      preferences: { ...setup.preferences, vocabularyMode: "none" },
    });
    const user = userEvent.setup();
    renderPage();
    const startButton = await screen.findByRole("button", {
      name: "התחלת השיעור",
    });
    await waitFor(() => expect(startButton).toBeEnabled());
    await user.click(startButton);

    if (legacySetupControls) {
      expect(screen.getByDisplayValue("learned")).toBeChecked();
      await user.click(screen.getByDisplayValue("none"));
      await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));
    }
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ vocabularyMode: "none" }),
      ),
    );
  });

  it("lets the learner request a translation and ends through the recap event", async () => {
    mocks.create.mockResolvedValue(session);
    mocks.setup.mockResolvedValueOnce({
      ...setup,
      preferences: {
        ...setup.preferences,
        teacherVoice: "male",
        speechRate: "very_fast",
      },
    });
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
    const startButton = await screen.findByRole("button", {
      name: "התחלת השיעור",
    });
    await waitFor(() => expect(startButton).toBeEnabled());

    if (legacySetupControls) {
      await user.selectOptions(screen.getByLabelText("קול המורה"), "male");
      await user.selectOptions(
        screen.getByLabelText("מהירות דיבור"),
        "very_fast",
      );
    }
    await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));
    await screen.findByRole("button", { name: "תרגום קטע הדיבור האחרון" });

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherVoice: "male",
        speechRate: "very_fast",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "תרגום קטע הדיבור האחרון" }),
    );
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining(session.realtime.translationEvent),
    );

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

  it("accepts full teaching instructions and older servers without continuation support", () => {
    expect(privateLessonSessionSchema.safeParse(session).success).toBe(true);
    expect(
      privateLessonSessionSchema.safeParse({
        ...session,
        realtime: {
          ...session.realtime,
          openingEvent: {
            type: "response.create",
            response: { instructions: "Lesson policy. ".repeat(2000) },
          },
          continuationEvent: {
            type: "response.create",
            response: { instructions: "Continue in context." },
          },
        },
      }).success,
    ).toBe(true);
  });

  it("continues after silence, respects playback and mute, and stops recovery on closing or unmount", async () => {
    vi.useFakeTimers();
    const continuationEvent = {
      type: "response.create",
      response: { instructions: "Continue in context." },
    };
    mocks.create.mockResolvedValue({
      ...session,
      realtime: { ...session.realtime, continuationEvent },
    });
    mocks.send.mockClear();
    let onEvent: (event: Record<string, unknown>) => void = () => undefined;
    mocks.connect.mockImplementation(async (_session, _audio, handlers) => {
      onEvent = handlers.onEvent;
      handlers.onOpen();
      return {
        close: mocks.close,
        send: mocks.send,
        setMicrophoneMuted: mocks.setMicrophoneMuted,
      };
    });
    const page = renderPage();
    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "התחלת השיעור" }));
      });
      act(() => {
        onEvent({ type: "response.created" });
        onEvent({ type: "output_audio_buffer.started" });
        onEvent({ type: "response.done" });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(mocks.send).not.toHaveBeenCalled();
      act(() => {
        onEvent({ type: "output_audio_buffer.stopped" });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(mocks.send).toHaveBeenCalledTimes(1);
      expect(mocks.send).toHaveBeenLastCalledWith(
        expect.objectContaining(continuationEvent),
      );
      act(() => {
        onEvent({ type: "response.done" });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(mocks.send).toHaveBeenCalledTimes(2);
      act(() => {
        onEvent({ type: "response.done" });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(mocks.send).toHaveBeenCalledTimes(2);
      fireEvent.click(screen.getByRole("button", { name: "נמשיך בשיעור" }));
      expect(mocks.send).toHaveBeenCalledTimes(3);
      act(() => {
        onEvent({ type: "response.done" });
      });
      const talk = screen.getByRole("button", {
        name: "לחצו והחזיקו כדי לדבר",
      });
      fireEvent.pointerDown(talk, { pointerId: 7, button: 0 });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(mocks.send).toHaveBeenCalledTimes(3);
      fireEvent.pointerUp(talk, { pointerId: 7 });
      fireEvent.click(screen.getByRole("button", { name: "סיום השיעור" }));
      const sendsAtClosing = mocks.send.mock.calls.length;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(mocks.send).toHaveBeenCalledTimes(sendsAtClosing);
      page.unmount();
      onEvent({ type: "response.done" });
      await vi.advanceTimersByTimeAsync(60_000);
      expect(mocks.send).toHaveBeenCalledTimes(sendsAtClosing);
    } finally {
      page.unmount();
      vi.useRealTimers();
    }
  });

  it("shows saved lesson reports in the journal", async () => {
    mocks.list.mockResolvedValue([savedLesson]);
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: /technology/u }),
    );
    await user.click(screen.getByText("פירוט, תיקונים ואוצר מילים"));
    const summary = within(screen.getByRole("dialog")).getByText(
      "You spoke clearly about technology.",
    );
    expect(summary.closest('[role="dialog"]')).toBeInTheDocument();
    expect(summary).toHaveAttribute("dir", "auto");
    expect(summary).toHaveAttribute("lang", "he");
    expect(screen.getAllByText("Clear answers")[0]).toHaveAttribute(
      "dir",
      "auto",
    );
    expect(
      screen.getByRole("button", { name: "תרגול המילים המומלצות עכשיו" }),
    ).toBeInTheDocument();
  });

  it("separates lesson history and level progress by target language", async () => {
    const spanishLesson = {
      ...savedLesson,
      id: "99999999-9999-4999-8999-999999999999",
      targetLanguageCode: "es",
      supportLanguageCode: "en",
      topic: "viajes",
      startedAt: "2026-09-28T10:00:00.000Z",
      report: {
        ...savedLesson.report,
        summary: "Resumen de la lección.",
        assessment: {
          ...savedLesson.report.assessment,
          overallLevel: "C2",
        },
        nextLessonPlan: "Continue the Spanish lesson.",
      },
    } as const;
    mocks.list.mockResolvedValue([spanishLesson, savedLesson]);

    renderPage();

    expect(
      await screen.findByRole("heading", { name: /English/u }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Spanish/u }),
    ).toBeInTheDocument();
    const levelButton = screen.getByRole("button", { name: /הרמה שלך/u });
    expect(within(levelButton).getByText("B1")).toBeInTheDocument();
    expect(
      screen.queryByText("Continue the Spanish lesson."),
    ).not.toBeInTheDocument();
  });

  it("shows only lessons from the selected course, even when another course uses the same language", async () => {
    const course = courseWithPlan(true);
    mocks.course.mockResolvedValue({ course });
    mocks.list.mockResolvedValue([
      { ...savedLesson, topic: "Selected course lesson", course: { courseId: course.id } },
      { ...savedLesson, id: "99999999-9999-4999-8999-999999999998", topic: "Other English course", course: { courseId: "10000000-0000-4000-8000-000000000002" } },
      { ...savedLesson, id: "99999999-9999-4999-8999-999999999997", topic: "Free English lesson", course: null },
    ]);
    renderPage(`/private-lesson?course=${course.id}`);
    expect(await screen.findByRole("heading", { name: "השיעורים בקורס הזה" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Selected course lesson/ })).toBeInTheDocument();
    expect(screen.queryByText("Other English course")).not.toBeInTheDocument();
    expect(screen.queryByText("Free English lesson")).not.toBeInTheDocument();
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

  it("keeps the transcript readable until the learner asks for a report after the connection closes", async () => {
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
    const startButton = await screen.findByRole("button", {
      name: "התחלת השיעור",
    });
    await waitFor(() => expect(startButton).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "התחלת השיעור" }));
    await screen.findByRole("button", { name: "סיום השיעור" });
    closeSession?.();

    expect(mocks.complete).not.toHaveBeenCalled();
    expect(screen.getByText("The voice connection closed.")).toBeInTheDocument();
    expect(screen.queryByText("You spoke clearly about technology.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "יצירת סיכום השיעור" }));
    await waitFor(() =>
      expect(mocks.complete).toHaveBeenCalledWith(
        session.lesson.id,
        expect.objectContaining({ completionReason: "disconnected", turns: [] }),
      ),
    );
    expect(await screen.findByText("You spoke clearly about technology.")).toBeInTheDocument();
  });
});
