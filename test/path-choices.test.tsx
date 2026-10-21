import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LearningPathControls } from "../src/components/LearningPathControls";
import { CoursePathChoices } from "../src/components/CoursePathChoices";
import { courseLessonFromLocation } from "../src/lib/courseSelection";
import { courseWithPlan } from "./course-fixtures";

describe("free learning paths", () => {
  it("confirms unit scope while preserving completed work and distinguishes skips", async () => {
    const choose = vi.fn().mockResolvedValue(undefined),
      user = userEvent.setup();
    render(
      <MemoryRouter>
        <LearningPathControls
          title="יחידה לדוגמה"
          busy={false}
          onChoice={choose}
          items={[
            { key: "done", title: "בוצע", complete: true, skipped: false },
            {
              key: "later",
              title: "מפגש מתקדם",
              complete: false,
              skipped: false,
              href: "/private-lesson?unit=advanced",
            },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 הושלמו · 0 דולגו · 1 נותרו",
    );
    expect(screen.getByRole("link", { name: "התחל מכאן" })).toHaveAttribute(
      "href",
      "/private-lesson?unit=advanced",
    );
    expect(choose).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "דלג על היחידה" }));
    expect(choose).not.toHaveBeenCalled();
    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: "ביטול" }),
    ).toBeVisible();
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "דלג על היחידה",
      }),
    );
    expect(choose).toHaveBeenCalledWith(true);
  });
  it("restores skipped content and keeps actions unavailable during save", async () => {
    const choose = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <MemoryRouter>
        <LearningPathControls
          title="יחידה"
          busy
          onChoice={choose}
          items={[
            { key: "lesson", title: "שיעור", complete: false, skipped: true },
          ]}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: "החזר למסלול: שיעור" }),
    ).toBeDisabled();
    rerender(
      <MemoryRouter>
        <LearningPathControls
          title="יחידה"
          busy={false}
          onChoice={choose}
          items={[
            { key: "lesson", title: "שיעור", complete: false, skipped: true },
          ]}
        />
      </MemoryRouter>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "החזר למסלול: שיעור" }),
    );
    expect(choose).toHaveBeenCalledWith(false, "lesson");
  });
  it("opens any personal-course lesson with exact version and scope without skipping earlier lessons", () => {
    const course = courseWithPlan(true),
      choose = vi.fn();
    render(
      <MemoryRouter>
        <CoursePathChoices course={course} busy={false} onChoice={choose} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "בחר יחידה" }), {
      target: { value: "unit-6" },
    });
    const links = screen.getAllByRole("link", { name: "התחל מכאן" });
    const url = new URL(links[1].getAttribute("href")!, "https://gotit.test");
    expect(url.searchParams.get("unit")).toBe("unit-6");
    expect(url.searchParams.get("lesson")).toBe("1");
    expect(url.searchParams.get("version")).toBe("1");
    expect(choose).not.toHaveBeenCalled();
    expect(course.evidence).toEqual([]);
  });
  it("never silently substitutes the next lesson for stale or malformed selections", () => {
    const course = courseWithPlan(true);
    expect(
      courseLessonFromLocation(
        course,
        new URLSearchParams("unit=unit-6&lesson=1&version=1"),
      ).lesson?.unitKey,
    ).toBe("unit-6");
    for (const query of [
      "unit=unit-6&lesson=1&version=2",
      "unit=unit-6&version=1",
      "unit=unknown&lesson=1&version=1",
      "unit=unit-6&lesson=-1&version=1",
    ])
      expect(
        courseLessonFromLocation(course, new URLSearchParams(query)).lesson,
      ).toBeNull();
    expect(
      courseLessonFromLocation(course, new URLSearchParams()).lesson,
    ).toEqual(course.nextLesson);
  });
});
