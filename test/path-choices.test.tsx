import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  LearningPathControls,
  PathStepChoice,
} from "../src/components/LearningPathControls";
import { CoursePathChoices } from "../src/components/CoursePathChoices";
import { courseLessonFromLocation } from "../src/lib/courseSelection";
import { courseWithPlan } from "./course-fixtures";
import i18n from "../src/i18n";
const label = (key: string) => i18n.t(`pathChoices.${key}`);

describe("compact path choices", () => {
  it("has no duplicate list and confirms only the unfinished unit remainder", async () => {
    const choose = vi.fn().mockResolvedValue(undefined),
      user = userEvent.setup();
    render(
      <LearningPathControls
        title="Unit"
        busy={false}
        onChoice={choose}
        items={[
          { key: "done", title: "Done", complete: true, skipped: false },
          { key: "later", title: "Later", complete: false, skipped: false },
        ]}
      />,
    );
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText(label("help"))).toBeNull();
    await user.click(
      screen.getByRole("button", { name: `${label("chooseStep")}: Unit` }),
    );
    expect(choose).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: label("skipUnit"), exact: true }),
    );
    expect(choose).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(
      i18n.t("pathChoices.confirmBody", { count: 1 }),
    );
    expect(
      within(dialog).getByRole("button", { name: i18n.t("feedback.cancel") }),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", {
        name: label("skipUnit"),
        exact: true,
      }),
    );
    expect(choose).toHaveBeenCalledWith(true);
  });
  it("restores skipped content, supports Escape/focus and disables saving actions", async () => {
    const choose = vi.fn().mockResolvedValue(undefined),
      user = userEvent.setup();
    const item = {
      key: "lesson",
      title: "Lesson",
      complete: false,
      skipped: true,
    };
    const { rerender } = render(
      <PathStepChoice item={item} busy onChoice={choose} />,
    );
    const trigger = screen.getByRole("button", {
      name: `${label("restore")}: Lesson`,
    });
    await user.click(trigger);
    expect(
      screen.getByRole("button", { name: label("restore"), exact: true }),
    ).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    rerender(<PathStepChoice item={item} busy={false} onChoice={choose} />);
    await user.click(trigger);
    await user.click(
      screen.getByRole("button", { name: label("restore"), exact: true }),
    );
    expect(choose).toHaveBeenCalledWith(false, "lesson");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
  it("restores partly skipped units and hides choices for completed stages", async () => {
    const choose = vi.fn().mockResolvedValue(undefined);
    render(
      <>
        <LearningPathControls
          title="Unit"
          busy={false}
          onChoice={choose}
          items={[
            { key: "done", title: "Done", complete: true, skipped: false },
            { key: "skip", title: "Skipped", complete: false, skipped: true },
            { key: "next", title: "Next", complete: false, skipped: false },
          ]}
        />
        <PathStepChoice
          item={{ key: "done", title: "Done", complete: true, skipped: false }}
          busy={false}
          onChoice={choose}
        />
      </>,
    );
    expect(
      screen.queryByRole("button", { name: `${label("skip")}: Done` }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: `${label("chooseStep")}: Unit` }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: label("restoreUnit") }),
    );
    expect(choose).toHaveBeenCalledWith(false);
  });
  it("opens and skips an exact personal lesson without a second selector or list", async () => {
    const course = courseWithPlan(true),
      choose = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <CoursePathChoices
          course={course}
          unitKey="unit-6"
          lessonIndex={1}
          busy={false}
          onChoice={choose}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
    const url = new URL(
      screen
        .getByRole("link", { name: label("startHere") })
        .getAttribute("href")!,
      "https://gotit.test",
    );
    expect(url.searchParams.get("unit")).toBe("unit-6");
    expect(url.searchParams.get("lesson")).toBe("1");
    expect(url.searchParams.get("version")).toBe("1");
    expect(choose).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: new RegExp(`^${label("skip")}:`) }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: label("skip"), exact: true }),
    );
    expect(choose).toHaveBeenCalledWith({
      version: 1,
      unitKey: "unit-6",
      lessonIndex: 1,
      skipped: true,
    });
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
