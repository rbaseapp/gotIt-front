import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PreferenceReview } from "../src/components/PreferenceReview";
import { fixtureCourse, courseWithPlan } from "./course-fixtures";

describe("inline interview preference review", () => {
  it.each([
    ["השפה שארצה ללמוד", "targetLanguageCode", "de", "language"],
    ["שפת השיחה עם המורה", "supportLanguageCode", "de", "language"],
    ["המטרה שלך", "goal", "מטרה מתוקנת", "text"],
    ["סוג המסלול", "path", "goal", "select"],
    ["הקצב שלך", "minutesPerLesson", 5, "pace"],
    ["נקודת הפתיחה", "experience", "למדתי בעבר", "experience"],
    ["אופן הלמידה", "ageGroup", "teen", "style"],
    ["תחומי עניין", "interests", ["אוכל", "עבודה"], "list"],
    ["מה שסיפרת לי", "statedNeeds", ["שיחות קצרות", "הסברים ברורים"], "list"],
    ["ההמלצות שלי עבורך", "recommendations", [], "list"],
  ] as const)(
    "saves %s without replacing other preferences",
    async (label, key, value, kind) => {
      const onSave = vi.fn().mockResolvedValue(true);
      const user = userEvent.setup();
      render(
        <PreferenceReview
          course={fixtureCourse}
          disabled={false}
          onSave={onSave}
        />,
      );
      const trigger = screen.getByRole("button", {
        name: key === "goal" ? "עריכת המטרה" : `עריכת ${label}`,
      });
      await user.click(trigger);
      if (kind === "language") {
        const choice = screen.getByRole("combobox");
        await user.clear(choice);
        await user.type(choice, "Deutsch");
        await user.keyboard("{Enter}");
      } else if (kind === "select") {
        await user.selectOptions(screen.getByRole("combobox"), "goal");
      } else if (kind === "pace") {
        await user.selectOptions(screen.getByLabelText("דקות לשיעור"), "5");
        await user.selectOptions(screen.getByLabelText("ימים בשבוע"), "7");
      } else if (kind === "style") {
        await user.selectOptions(screen.getByLabelText("קבוצת גיל"), "teen");
        await user.selectOptions(
          screen.getByLabelText("נוחות בקריאה"),
          "developing",
        );
      } else {
        fireEvent.change(screen.getByRole("textbox"), {
          target: { value: Array.isArray(value) ? value.join("\n") : value },
        });
        if (kind === "experience")
          await user.selectOptions(screen.getByLabelText("רמת פתיחה"), "B1");
      }
      await user.click(
        screen.getByRole("button", { name: "שמירה", exact: true }),
      );
      const expected = {
        ...fixtureCourse.preferences,
        [key]: value,
        ...(kind === "pace" ? { daysPerWeek: 7 } : {}),
        ...(kind === "style" ? { literacy: "developing" } : {}),
        ...(kind === "experience"
          ? { startingLevel: "B1", absoluteBeginner: false }
          : {}),
      };
      expect(onSave).toHaveBeenCalledExactlyOnceWith(expected);
      await waitFor(() =>
        expect(screen.queryByRole("form")).not.toBeInTheDocument(),
      );
      expect(trigger).toHaveFocus();
    },
  );

  it("cancels without saving and allows adding empty lists", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const course = structuredClone(fixtureCourse);
    course.preferences.interests = [];
    course.preferences.statedNeeds = [];
    course.preferences.recommendations = [];
    render(
      <PreferenceReview course={course} disabled={false} onSave={onSave} />,
    );
    const trigger = screen.getByRole("button", { name: "עריכת תחומי עניין" });
    await user.click(trigger);
    await user.type(screen.getByRole("textbox"), "טיולים");
    await user.keyboard("{Escape}");
    expect(onSave).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(screen.getByRole("textbox")).toHaveValue("");
    await user.click(
      screen.getByRole("button", { name: "ביטול", exact: true }),
    );
    expect(
      screen.getByRole("button", { name: "עריכת מה שסיפרת לי" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "עריכת ההמלצות שלי עבורך" }),
    ).toBeEnabled();
  });

  it("keeps a failed edit for retry, validates list limits and drops stale editors after refresh", async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    const user = userEvent.setup();
    const { rerender } = render(
      <PreferenceReview
        course={fixtureCourse}
        disabled={false}
        onSave={onSave}
      />,
    );
    await user.click(screen.getByRole("button", { name: "עריכת תחומי עניין" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, {
      target: { value: Array(9).fill("טיולים").join("\n") },
    });
    await user.click(
      screen.getByRole("button", { name: "שמירה", exact: true }),
    );
    expect(input).toBeInvalid();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "x".repeat(101) } });
    expect(input).toBeInvalid();
    fireEvent.change(input, { target: { value: "תיקון" } });
    await user.click(
      screen.getByRole("button", { name: "שמירה", exact: true }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(input).toHaveValue("תיקון");
    rerender(
      <PreferenceReview
        course={{ ...fixtureCourse, revision: fixtureCourse.revision + 1 }}
        disabled={false}
        onSave={onSave}
      />,
    );
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("locks target language after a plan and keeps the saved snapshot read only", () => {
    const { rerender } = render(
      <PreferenceReview
        course={courseWithPlan()}
        disabled={false}
        onSave={() => true}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "עריכת השפה שארצה ללמוד" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("כדי ללמוד שפה אחרת, אפשר לפתוח קורס חדש."),
    ).toBeInTheDocument();
    rerender(
      <PreferenceReview
        course={courseWithPlan(true)}
        disabled
        readOnly
        onSave={() => false}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
