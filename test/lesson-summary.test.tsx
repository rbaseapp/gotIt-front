import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { LessonSummary } from "../src/components/LessonSummary";
import { guidedReport } from "./guided-lesson-fixtures";
import he from "../src/locales/he/translation.json";
import { savedPrivateLessonSchema } from "../src/lib/privateLesson";
vi.mock("../src/pages/HomeworkPage", () => ({
  LessonHomeworkCard: () => null,
}));
it("shows actual duration and deduplicates independent and assisted evidence separately", () => {
  render(
    <MemoryRouter>
      <LessonSummary
        lesson={savedPrivateLessonSchema.parse(guidedReport)}
        returnTo="/courses"
      >
        Report detail
      </LessonSummary>
    </MemoryRouter>,
  );
  expect(screen.getByText(/3 דקות/)).toBeInTheDocument();
  expect(screen.getAllByText("בקשת תה במשפט עצמאי.")).toHaveLength(1);
  expect(screen.getAllByText("בקשת קפה בעזרת דוגמה.")).toHaveLength(1);
  const link = screen.getByRole("link", { name: he.dashboard.smartPractice });
  expect(link).toHaveAttribute("href", expect.stringContaining("language=en"));
  expect(link).toHaveAttribute(
    "href",
    expect.stringContaining(guidedReport.id),
  );
});
it("an empty legacy report cannot claim independent learning or turn planned minutes into actual evidence", () => {
  const lesson = structuredClone(guidedReport);
  lesson.actualDurationSeconds = 0;
  for (const skill of Object.values(lesson.report!.assessment.skills))
    skill.evidence = [];
  render(
    <MemoryRouter>
      <LessonSummary lesson={lesson} returnTo="/learn">
        Report detail
      </LessonSummary>
    </MemoryRouter>,
  );
  expect(
    screen.getByText(he.privateLesson.report.noEvidence),
  ).toBeInTheDocument();
  expect(screen.getByText(/0 דקות/)).toBeInTheDocument();
  expect(screen.queryByText("בקשת תה במשפט עצמאי.")).not.toBeInTheDocument();
});
