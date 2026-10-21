import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { courseWithPlan } from "./course-fixtures";
import {
  courseProgram,
  programPercent,
  programKind,
  programsDesignEnabled,
} from "../src/lib/programs";
import { DevProgramsView } from "../src/pages/DevProgramsView";
import { selectedProgram } from "../src/lib/learningNavigation";
import type { Course } from "../src/lib/courses";

vi.mock("../src/context/AppContext", () => ({
  useApp: () => ({
    user: null,
    profile: { defaultSourceLanguage: "es", defaultTranslationLanguage: "he" },
  }),
}));
vi.mock("../src/components/ProgramArtwork", () => ({
  ProgramArtwork: ({ input, alt }: { input: unknown; alt: string }) => (
    <div role="img" aria-label={alt} data-artwork={JSON.stringify(input)} />
  ),
}));
vi.mock("../src/lib/product", async (original) => ({
  ...(await original<object>()),
  product: async () => ({
    dailyGoal: { current: 6, value: 10, type: "minutes" },
    gamification: { currentStreakDays: 4 },
  }),
}));

function course(
  id: string,
  title: string,
  language: string,
  completed = false,
) {
  const item = courseWithPlan(true);
  item.id = id;
  item.preferences.targetLanguageCode = language;
  item.versions[0].preferences.targetLanguageCode = language;
  item.versions[0].plan.title = title;
  item.versions[0].plan.outcome = `Goal for ${title}`;
  if (completed) {
    item.nextLesson = null;
    item.progress.covered = 12;
  }
  return item;
}
const spanish = () =>
  course("10000000-0000-4000-8000-000000000001", "שיחת חולין בספרדית", "es");
const english = () =>
  course("10000000-0000-4000-8000-000000000002", "אנגלית לעבודה", "en");
const completed = () =>
  course("10000000-0000-4000-8000-000000000003", "יסודות ספרדית", "es", true);
function view(items: Course[] = [spanish(), english(), completed()]) {
  const onNew = vi.fn();
  render(
    <MemoryRouter>
      <DevProgramsView
        courses={items}
        homework={[]}
        packs={[]}
        coursesLoading={false}
        packsLoading={false}
        coursesError=""
        packsError=""
        retryCourses={vi.fn()}
        retryPacks={vi.fn()}
        busy={false}
        onRemove={vi.fn()}
        onNew={onNew}
      />
    </MemoryRouter>,
  );
  return { onNew };
}
beforeEach(() => localStorage.clear());
it("keeps the new screen limited to exact DEV and explicit loopback previews", () => {
  expect(programsDesignEnabled("gotit-dev.rbaseapp.com", false)).toBe(true);
  expect(programsDesignEnabled("gotit.rbaseapp.com", true)).toBe(false);
  expect(programsDesignEnabled("localhost", false)).toBe(false);
  expect(programsDesignEnabled("localhost", true)).toBe(true);
});
it("derives progress and lesson from server facts, never marks an unfinished unit complete", () => {
  const item = spanish();
  item.progress.covered = 3;
  item.nextLesson!.unitKey = item.versions[0].plan.units[1].key;
  item.nextLesson!.lessonIndex = 1;
  const program = courseProgram(item, "Fallback");
  expect(programPercent(program)).toBe(25);
  expect(program.lessonNumber).toBe(4);
  expect(program.checkpoints.every((point) => !point.completed)).toBe(true);
  expect(program.continueTo).toContain(`course=${item.id}`);
});
it("drafts remain drafts with no made-up lesson count or completion", () => {
  const item = courseWithPlan(false);
  const program = courseProgram(item, "Fallback");
  expect(program.status).toBe("draft");
  expect(program.completed).toBe(0);
  expect(program.continueTo).toBe(`/courses/${item.id}`);
  expect(programPercent({ total: 0, completed: 10 })).toBe(0);
});
it("selects icons from multilingual subject matter", () => {
  expect(programKind("ספרדית לטיול")).toBe("travel");
  expect(programKind("אנגלית לעבודה")).toBe("work");
  expect(programKind("Grammar", "grammar")).toBe("books");
});
it("changes active content, mascot language, and persistent selection together", async () => {
  view();
  expect(
    screen.getByRole("heading", { name: "שיחת חולין בספרדית" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "להפוך לתוכנית הפעילה" })[0]);
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "אנגלית לעבודה" }),
    ).toBeInTheDocument(),
  );
  expect(selectedProgram()).toBe(english().id);
  expect(
    document
      .querySelector("[data-artwork*=mascot]")
      ?.getAttribute("data-artwork"),
  ).toContain("en");
});
it("filters other programs and keeps creation available in every filter", async () => {
  const { onNew } = view();
  fireEvent.click(screen.getByRole("button", { name: "הושלמה" }));
  expect(
    screen.getByRole("heading", { name: "יסודות ספרדית" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "אנגלית לעבודה" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /תוכנית חדשה/ }));
  expect(onNew).toHaveBeenCalledOnce();
});
it("empty and partial-error states do not invent a program or artwork", () => {
  view([]);
  expect(screen.getByText("התוכנית הראשונה שלכם")).toBeInTheDocument();
  expect(document.querySelector("[data-artwork]")).toBeNull();
});
