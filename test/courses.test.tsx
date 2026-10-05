import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CoursePage } from "../src/pages/CoursePage";
import { HomeworkPage } from "../src/pages/HomeworkPage";
import { recordVoice } from "../src/lib/voice";
import {
  fixtureCourse,
  fixtureHomework,
  courseWithPlan,
} from "./course-fixtures";
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  command: vi.fn(),
  homework: vi.fn(),
  homeworkCommand: vi.fn(),
  start: vi.fn(),
  transcribe: vi.fn(),
  realtimeSession: vi.fn(),
  connectRealtime: vi.fn(),
  translationLanguage: "he",
}));
vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({
    user: { id: "test-user" },
    profile: {
      languages: [{ languageCode: "en" }],
      defaultTranslationLanguage: mocks.translationLanguage,
    },
  }),
}));
vi.mock("../src/lib/courses", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/lib/courses")>();
  return { ...original, courseApi: { ...original.courseApi, ...mocks } };
});
vi.mock("../src/lib/voice", () => ({
  recordVoice: vi.fn().mockResolvedValue("recorded-wav"),
}));
vi.mock("../src/lib/privateLesson", () => ({
  connectPrivateLesson: mocks.connectRealtime,
  PrivateLessonConnectionError: class extends Error {},
}));
function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/courses/:courseId" element={<CoursePage />} />
        <Route path="/courses" element={<CoursePage />} />
        <Route path="/homework/:homeworkId" element={<HomeworkPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(recordVoice).mockReset().mockResolvedValue("recorded-wav");
  mocks.translationLanguage = "he";
  sessionStorage.clear();
  mocks.list.mockResolvedValue({ courses: [], homework: [], available: true });
  mocks.get.mockResolvedValue({ course: structuredClone(fixtureCourse) });
  mocks.transcribe.mockResolvedValue({ text: "I want to speak at work" });
  mocks.realtimeSession.mockResolvedValue({
    realtime: {
      clientSecret: "ephemeral",
      connectionUrl: "https://api.openai.com/v1/realtime/calls",
      openingEvent: {
        type: "response.create",
        response: { instructions: "Ask the question" },
      },
    },
  });
  mocks.homework.mockResolvedValue({
    homework: structuredClone(fixtureHomework),
  });
});

describe("personal course experience", () => {
  it("runs a hands-free interview, saves speech as a voice turn, and plays the server reply", async () => {
    const intake = {
      ...structuredClone(fixtureCourse),
      ready: false,
      intakeAnswers: [],
    };
    mocks.get.mockResolvedValue({ course: intake });
    const updated = {
      ...intake,
      revision: intake.revision + 1,
      messages: [
        ...intake.messages,
        { role: "learner", text: "I want a work course", channel: "voice" },
        { role: "tutor", text: "What do you know already?", channel: "text" },
      ],
    };
    mocks.command.mockResolvedValue({ course: updated });
    const send = vi.fn().mockReturnValue(true);
    const mute = vi.fn().mockReturnValue(true);
    let emit: ((event: Record<string, unknown>) => void) | undefined;
    mocks.connectRealtime.mockImplementation(
      async (_session, _audio, handlers) => {
        emit = handlers.onEvent;
        handlers.onOpen();
        return { send, setMicrophoneMuted: mute, close: vi.fn() };
      },
    );
    const user = userEvent.setup();
    renderRoute(`/courses/${intake.id}`);
    await user.click(
      await screen.findByRole("button", { name: "מתחילים ראיון חי" }),
    );
    await waitFor(() => expect(mocks.connectRealtime).toHaveBeenCalledOnce());
    emit?.({ type: "response.done" });
    emit?.({ type: "output_audio_buffer.stopped" });
    expect(
      await screen.findByText("המורה מקשיבה לך — פשוט לדבר."),
    ).toBeInTheDocument();
    emit?.({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "I want a work course",
    });
    await waitFor(() =>
      expect(mocks.command).toHaveBeenCalledWith(
        intake.id,
        "turns",
        expect.objectContaining({
          message: "I want a work course",
          channel: "voice",
        }),
      ),
    );
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "response.create",
          response: expect.objectContaining({
            instructions: expect.stringContaining("What do you know already?"),
          }),
        }),
      ),
    );
    expect(mute).toHaveBeenCalledWith(true);
    emit?.({ type: "response.done" });
    emit?.({ type: "output_audio_buffer.stopped" });
    expect(mute).toHaveBeenLastCalledWith(false);
    mocks.command.mockResolvedValue({
      course: {
        ...updated,
        revision: updated.revision + 1,
        ready: true,
        messages: [
          ...updated.messages,
          { role: "learner", text: "Some basics", channel: "voice" },
          { role: "tutor", text: "Let's review your plan", channel: "text" },
        ],
      },
    });
    emit?.({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Some basics",
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    emit?.({ type: "response.done" });
    expect(screen.queryByText("זה מה שהבנתי ממך")).not.toBeInTheDocument();
    emit?.({ type: "output_audio_buffer.stopped" });
    expect(await screen.findByText("זה מה שהבנתי ממך")).toBeInTheDocument();
  });
  it("sends a transcribed voice answer through the same conversation route as typed text", async () => {
    const intake = structuredClone(fixtureCourse);
    intake.ready = false;
    intake.intakeAnswers = [];
    intake.intakeProgress = { current: 1, answered: 0, total: 6 };
    mocks.get.mockResolvedValue({ course: intake });
    mocks.command.mockResolvedValue({
      course: { ...intake, revision: intake.revision + 1 },
    });
    const user = userEvent.setup();
    renderRoute(`/courses/${intake.id}`);
    await user.click(await screen.findByText("מעדיפים לכתוב תשובה?"));
    await user.click(await screen.findByRole("button", { name: "תשובה בקול" }));
    expect(await screen.findByRole("textbox")).toHaveValue(
      "I want to speak at work",
    );
    await user.click(screen.getByRole("button", { name: "שליחה" }));
    await waitFor(() =>
      expect(mocks.command).toHaveBeenCalledWith(
        intake.id,
        "turns",
        expect.objectContaining({
          message: "I want to speak at work",
          channel: "voice",
          mode: "preferences",
        }),
      ),
    );
    expect(mocks.transcribe).toHaveBeenCalledWith("recorded-wav", "he");
  });
  it("returns from review to correct a saved answer without dropping the conversation", async () => {
    const intake = structuredClone(fixtureCourse);
    intake.intakeAnswers = [
      { topic: "goal", text: "Old goal", channel: "voice" },
    ];
    intake.messages = [
      { role: "tutor", text: "What is your goal?", channel: "text" },
      { role: "learner", text: "Old goal", channel: "voice" },
      { role: "tutor", text: "Review your answers", channel: "text" },
    ];
    mocks.get.mockResolvedValue({ course: intake });
    mocks.command.mockResolvedValue({
      course: { ...intake, revision: intake.revision + 1 },
    });
    const user = userEvent.setup();
    renderRoute(`/courses/${intake.id}`);
    await user.click(await screen.findByRole("button", { name: "חזרה לשיחה" }));
    expect(screen.getByRole("log")).toHaveTextContent("Old goal");
    await user.click(screen.getByText("מעדיפים לכתוב תשובה?"));
    await user.click(screen.getByRole("button", { name: "תיקון התשובה" }));
    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "New goal");
    await user.click(screen.getByRole("button", { name: "שמירת התיקון" }));
    await waitFor(() =>
      expect(mocks.command).toHaveBeenCalledWith(
        intake.id,
        "turns",
        expect.objectContaining({
          message: "New goal",
          channel: "text",
          mode: "preferences",
          answerIndex: 0,
        }),
      ),
    );
    await user.click(screen.getByRole("button", { name: "תיקון התשובה" }));
    await user.click(screen.getByRole("button", { name: "תשובה בקול" }));
    expect(await screen.findByRole("textbox")).toHaveValue(
      "I want to speak at work",
    );
    await user.click(screen.getByRole("button", { name: "שמירת התיקון" }));
    await waitFor(() =>
      expect(mocks.command).toHaveBeenLastCalledWith(
        intake.id,
        "turns",
        expect.objectContaining({
          message: "I want to speak at work",
          channel: "voice",
          answerIndex: 0,
        }),
      ),
    );
  });
  it("defaults the teacher's conversation to the interface language", async () => {
    mocks.translationLanguage = "en";
    renderRoute("/courses");
    const choices = await screen.findAllByRole("combobox");
    expect(choices[1]).toHaveValue("Hebrew — עברית");
  });
  it("shows the bounded interview as visible chat bubbles with text and voice replies", async () => {
    const intake = structuredClone(fixtureCourse);
    intake.ready = false;
    intake.intakeProgress = { current: 2, answered: 1, total: 6 };
    intake.messages = [
      { role: "tutor", text: "מה תרצה ללמוד?", channel: "text" },
      { role: "learner", text: "לדבר בעבודה", channel: "voice" },
      { role: "tutor", text: "מה כבר למדת?", channel: "text" },
    ];
    mocks.get.mockResolvedValue({ course: intake });
    renderRoute(`/courses/${intake.id}`);
    const thread = await screen.findByRole("log");
    expect(thread).not.toHaveTextContent("לדבר בעבודה");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "השיחה המלאה" }));
    expect(thread).toHaveTextContent("מה תרצה ללמוד?");
    expect(thread).toHaveTextContent("לדבר בעבודה");
    expect(thread).toHaveTextContent("מה כבר למדת?");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "מתחילים ראיון חי" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).not.toBeVisible();
    await userEvent.setup().click(screen.getByText("מעדיפים לכתוב תשובה?"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "תשובה בקול" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("השיחה שלנו עד עכשיו")).not.toBeInTheDocument();
  });
  it("shows the learner's stated weekly range during review", async () => {
    const course = structuredClone(fixtureCourse);
    course.reportedAvailability = "10 דקות, 1-2 פעמים בשבוע";
    course.preferences.daysPerWeek = 2;
    mocks.get.mockResolvedValue({ course });
    renderRoute(`/courses/${course.id}`);
    expect(
      await screen.findByText(course.reportedAvailability),
    ).toBeInTheDocument();
  });
  it("starts with only a language pair and an invitation to talk, not a preferences form", async () => {
    renderRoute("/courses");
    await screen.findByRole("button", { name: "בונים תוכנית עם המורה" });
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "שיחה חופשית" })).toHaveAttribute(
      "href",
      "/private-lesson?practice=free",
    );
  });
  it("saves preference approval before generating the plan, then waits for a separate course approval", async () => {
    const user = userEvent.setup();
    const approved = {
      ...fixtureCourse,
      revision: 4,
      approvedPreferences: fixtureCourse.preferences,
      preferencesApprovedAt: fixtureCourse.createdAt,
    };
    mocks.command.mockImplementation(async (_id, path) => ({
      course:
        path === "preferences/approve"
          ? approved
          : path === "plan"
            ? { ...courseWithPlan(), revision: 5 }
            : { ...courseWithPlan(true), revision: 6 },
    }));
    renderRoute(`/courses/${fixtureCourse.id}`);
    await user.click(
      await screen.findByRole("button", {
        name: "ההעדפות מתאימות — נבנה תוכנית",
      }),
    );
    const approvePlan = await screen.findByRole("button", {
      name: "אישור התוכנית ויציאה לדרך",
    });
    expect(mocks.command.mock.calls.map((call) => call[1])).toEqual([
      "preferences/approve",
      "plan",
    ]);
    expect(mocks.command.mock.calls[1]?.[2]).toMatchObject({ revision: 4 });
    expect(
      screen.queryByRole("link", { name: "מתחילים את השיעור הבא" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/יחידות/).length).toBeGreaterThan(0);
    await user.click(approvePlan);
    expect(
      await screen.findByRole("link", { name: /מתחילים את השיעור הבא/ }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining(`course=${fixtureCourse.id}`),
    );
  });
  it("lets a learner inspect future units while keeping one next-lesson action", async () => {
    mocks.get.mockResolvedValue({ course: courseWithPlan(true) });
    const user = userEvent.setup();
    renderRoute(`/courses/${fixtureCourse.id}`);
    await screen.findByRole("link", { name: /מתחילים את השיעור הבא/ });
    await user.click(screen.getByText("מנהלים שיחה עצמאית"));
    expect(
      screen
        .getAllByText(
          "שיחה קצרה שבה מציגים את עצמנו ושואלים את האדם השני שאלה.",
        )
        .at(-1),
    ).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: /מתחילים את השיעור הבא/ }),
    ).toHaveLength(1);
  });
  it("groups multiple courses by language and shows each course's own progress", async () => {
    const first = courseWithPlan(true);
    first.progress.covered = 1;
    const second = courseWithPlan(true);
    second.id = "10000000-0000-4000-8000-000000000002";
    second.versions[0]!.plan.title = "English for travel";
    const spanish = courseWithPlan(true);
    spanish.id = "10000000-0000-4000-8000-000000000003";
    spanish.preferences.targetLanguageCode = "es";
    spanish.versions[0]!.plan.title = "Spanish for work";
    mocks.list.mockResolvedValue({
      courses: [first, second, spanish],
      homework: [],
      available: true,
    });

    renderRoute("/courses");
    const groups = await screen.findAllByRole("region");
    const english = groups.find((group) =>
      within(group).queryByRole("heading", { name: /English/ }),
    );
    const spanishGroup = groups.find((group) =>
      within(group).queryByRole("heading", { name: /Spanish/ }),
    );
    expect(english).toBeDefined();
    expect(spanishGroup).toBeDefined();
    expect(within(english!).getAllByRole("link")).toHaveLength(2);
    expect(within(spanishGroup!).getAllByRole("link")).toHaveLength(1);
    expect(within(english!).getByText("2 קורסים")).toBeInTheDocument();
    expect(within(spanishGroup!).getByText("קורס אחד")).toBeInTheDocument();
    expect(
      within(english!).getByRole("link", { name: /1 מתוך 12 שיעורים בוצעו/ }),
    ).toHaveAttribute("href", `/courses/${first.id}`);
    expect(
      within(spanishGroup!).queryByText("English for travel"),
    ).not.toBeInTheDocument();
  });
  it("asks before deleting a course and keeps it visible when deletion fails", async () => {
    const course = courseWithPlan(true);
    mocks.list.mockResolvedValue({
      courses: [course],
      homework: [],
      available: true,
    });
    const user = userEvent.setup();
    renderRoute("/courses");
    const deleteButton = await screen.findByRole("button", {
      name: /מחיקת קורס:/,
    });
    await user.click(deleteButton);
    expect(mocks.delete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "ביטול" }));
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: /אנגלית מהיסודות/ }),
    ).toBeInTheDocument();
    await user.click(deleteButton);
    mocks.delete.mockRejectedValueOnce(new Error("Delete failed"));
    await user.click(screen.getByRole("button", { name: "מחיקת הקורס" }));
    expect(await screen.findByText("Delete failed")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /אנגלית מהיסודות/ }),
    ).toBeInTheDocument();
    mocks.delete.mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole("button", { name: "מחיקת הקורס" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /מחיקת קורס:/ }),
      ).not.toBeInTheDocument(),
    );
    expect(mocks.delete).toHaveBeenCalledWith(course.id);
  });
  it("marks done, next, and later lessons only from the selected course", async () => {
    const selected = courseWithPlan(true);
    selected.evidence = [
      {
        lessonId: "30000000-0000-4000-8000-000000000001",
        version: 1,
        unitKey: "unit-1",
        lessonIndex: 0,
        covered: true,
        independent: true,
        recordedAt: "2026-09-29T10:00:00.000Z",
      },
    ];
    selected.nextLesson = {
      ...selected.nextLesson!,
      lessonIndex: 1,
      title: selected.versions[0]!.plan.units[0]!.lessons[1]!.title,
    };
    mocks.get.mockResolvedValue({ course: selected });
    renderRoute(`/courses/${selected.id}`);
    await screen.findByText("כל מה שנלמד בקורס");
    const firstUnit = screen.getByText("מציגים את עצמנו").closest("details")!;
    expect(within(firstUnit).getByText(/השיעור בוצע/)).toBeInTheDocument();
    expect(within(firstUnit).getByText("השיעור הבא")).toBeInTheDocument();
    expect(screen.getAllByText("בהמשך התוכנית").length).toBeGreaterThan(0);
  });
  it("keeps the typed answer after a network failure and reuses its event ID on retry", async () => {
    mocks.get.mockResolvedValue({ course: { ...fixtureCourse, ready: false } });
    mocks.command.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    renderRoute(`/courses/${fixtureCourse.id}`);
    await user.click(await screen.findByText("מעדיפים לכתוב תשובה?"));
    const input = await screen.findByRole("textbox");
    await user.type(input, "רוצה ללמוד מההתחלה");
    await user.click(screen.getByRole("button", { name: "שליחה" }));
    await screen.findByRole("alert");
    expect(input).toHaveValue("רוצה ללמוד מההתחלה");
    await user.click(screen.getByRole("button", { name: "שליחה" }));
    await waitFor(() => expect(mocks.command).toHaveBeenCalledTimes(2));
    expect(mocks.command.mock.calls[0]?.[2].eventId).toEqual(
      mocks.command.mock.calls[1]?.[2].eventId,
    );
  });
  it("shows feedback before moving on, and never submits a client score", async () => {
    const completed = structuredClone(fixtureHomework);
    completed.revision = 1;
    completed.completedCount = 1;
    completed.tasks[0]!.done = true;
    completed.tasks[0]!.solution = {
      answer: "is",
      explanation: "עם she משתמשים ב־is.",
    };
    completed.tasks[0]!.attempts = [
      {
        answer: "is",
        channel: "text",
        result: "correct",
        feedback: "זה מתאים.",
        independent: false,
        createdAt: fixtureCourse.createdAt,
      },
    ];
    mocks.homeworkCommand.mockResolvedValue({ homework: completed });
    const user = userEvent.setup();
    renderRoute(`/homework/${fixtureHomework.id}`);
    await user.click(
      await screen.findByRole("button", { name: "is", exact: true }),
    );
    await user.click(screen.getByRole("button", { name: "בדיקת התשובה" }));
    expect(await screen.findByText("זה מתאים.")).toBeInTheDocument();
    expect(screen.getByText("משימה 1 מתוך 2")).toBeInTheDocument();
    expect(mocks.homeworkCommand.mock.calls[0]?.[2]).not.toHaveProperty(
      "score",
    );
    await user.click(screen.getByRole("button", { name: "למשימה הבאה" }));
    expect(screen.getByText("משימה 2 מתוך 2")).toBeInTheDocument();
  });
  it("records a homework voice answer only while held and cancels a lost pointer", async () => {
    const homework = structuredClone(fixtureHomework);
    homework.tasks[0]!.done = true;
    homework.completedCount = 1;
    mocks.homework.mockResolvedValue({ homework });
    mocks.homeworkCommand.mockResolvedValue({ homework });
    vi.mocked(recordVoice).mockImplementation(
      (cancel, release) =>
        new Promise<string>((resolve, reject) => {
          cancel.addEventListener(
            "abort",
            () => reject(new Error("cancelled")),
            {
              once: true,
            },
          );
          release.addEventListener("abort", () => resolve("recorded-wav"), {
            once: true,
          });
        }),
    );
    const user = userEvent.setup();
    renderRoute(`/homework/${homework.id}`);
    const talk = await screen.findByRole("button", {
      name: "לחצו והחזיקו כדי לדבר",
    });
    fireEvent.click(talk);
    expect(recordVoice).not.toHaveBeenCalled();

    fireEvent.pointerDown(talk, { pointerId: 3, button: 0 });
    expect(recordVoice).toHaveBeenCalledTimes(1);
    expect(talk).toHaveAttribute("aria-pressed", "true");
    const firstCancel = vi.mocked(recordVoice).mock.calls[0]![0];
    fireEvent.pointerCancel(talk, { pointerId: 3 });
    expect(firstCancel.aborted).toBe(true);
    expect(talk).toHaveAttribute("aria-pressed", "false");
    expect(mocks.transcribe).not.toHaveBeenCalled();

    fireEvent.keyDown(talk, { key: " " });
    expect(recordVoice).toHaveBeenCalledTimes(2);
    const release = vi.mocked(recordVoice).mock.calls[1]![1];
    expect(release.aborted).toBe(false);
    fireEvent.keyUp(talk, { key: " " });
    expect(release.aborted).toBe(true);
    expect(await screen.findByRole("textbox")).toHaveValue(
      "I want to speak at work",
    );
    expect(mocks.transcribe).toHaveBeenCalledWith("recorded-wav", "en");

    await user.click(screen.getByRole("button", { name: "בדיקת התשובה" }));
    expect(mocks.homeworkCommand).toHaveBeenCalledWith(
      homework.id,
      "actions",
      expect.objectContaining({ action: "answer", channel: "voice" }),
    );
  });
  it("refreshes an unstarted older exercise before showing its question", async () => {
    const old = structuredClone(fixtureHomework);
    old.needsRefresh = true;
    old.tasks[0]!.prompt = "Choose the correct short answer: No, ____.";
    const refreshed = structuredClone(fixtureHomework);
    mocks.homework.mockResolvedValue({ homework: old });
    mocks.homeworkCommand.mockResolvedValue({ homework: refreshed });
    renderRoute(`/homework/${old.id}`);
    await screen.findByText(refreshed.tasks[0]!.prompt);
    expect(mocks.homeworkCommand).toHaveBeenCalledWith(
      old.id,
      "prepare",
      expect.objectContaining({ revision: old.revision }),
    );
    expect(screen.queryByText(old.tasks[0]!.prompt)).not.toBeInTheDocument();
  });
  it("restores the server draft and persists a pause before navigating away", async () => {
    const homework = structuredClone(fixtureHomework);
    homework.tasks[0]!.done = true;
    homework.tasks[1]!.draft = "We are";
    homework.completedCount = 1;
    mocks.homework.mockResolvedValue({ homework });
    mocks.homeworkCommand.mockResolvedValue({
      homework: { ...homework, revision: 1 },
    });
    const user = userEvent.setup();
    renderRoute(`/homework/${fixtureHomework.id}`);
    expect(await screen.findByRole("textbox")).toHaveValue("We are");
    await user.click(
      screen.getByRole("button", { name: "שמירה והשלמה אחר כך" }),
    );
    await waitFor(() =>
      expect(mocks.homeworkCommand).toHaveBeenCalledWith(
        homework.id,
        "actions",
        expect.objectContaining({
          action: "draft",
          answer: "We are",
          taskIndex: 1,
        }),
      ),
    );
  });
  it("resumes a saved plan change after generation failure without resending the conversation", async () => {
    mocks.get.mockResolvedValue({
      course: { ...courseWithPlan(true), pendingPlanChange: "יותר תרגול שיחה" },
    });
    mocks.command.mockResolvedValue({ course: courseWithPlan() });
    const user = userEvent.setup();
    renderRoute(`/courses/${fixtureCourse.id}`);
    await user.click(
      await screen.findByRole("button", { name: "בניית התוכנית שלי" }),
    );
    expect(mocks.command.mock.calls.map((call) => call[1])).toEqual(["plan"]);
  });
});
