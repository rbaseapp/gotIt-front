import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CoursePage } from "../src/pages/CoursePage";
import { HomeworkPage } from "../src/pages/HomeworkPage";
import {
  fixtureCourse,
  fixtureHomework,
  courseWithPlan,
} from "./course-fixtures";
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  command: vi.fn(),
  homework: vi.fn(),
  homeworkCommand: vi.fn(),
  start: vi.fn(),
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
  mocks.translationLanguage = "he";
  sessionStorage.clear();
  mocks.list.mockResolvedValue({ courses: [], homework: [], available: true });
  mocks.get.mockResolvedValue({ course: structuredClone(fixtureCourse) });
  mocks.homework.mockResolvedValue({
    homework: structuredClone(fixtureHomework),
  });
});

describe("personal course experience", () => {
  it("defaults the teacher's conversation to the interface language", async () => {
    mocks.translationLanguage = "en";
    renderRoute("/courses");
    const choices = await screen.findAllByRole("combobox");
    expect(choices[1]).toHaveValue("he");
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
    expect(thread).toHaveTextContent("מה תרצה ללמוד?");
    expect(thread).toHaveTextContent("לדבר בעבודה");
    expect(thread).toHaveTextContent("מה כבר למדת?");
    expect(screen.getByText(/2\/6/)).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "מכירים אותך" }),
    ).toHaveAttribute("value", "1");
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
  it("keeps the typed answer after a network failure and reuses its event ID on retry", async () => {
    mocks.get.mockResolvedValue({ course: { ...fixtureCourse, ready: false } });
    mocks.command.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    renderRoute(`/courses/${fixtureCourse.id}`);
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
