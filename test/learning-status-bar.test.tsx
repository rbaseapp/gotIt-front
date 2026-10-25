import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import i18n from "../src/i18n";
import { LearningStatusBar } from "../src/components/LearningStatusBar";

const language = {
  value: "en",
  options: ["en", "ar", "en"],
  translationCode: "he",
  onChange: vi.fn(),
};

describe("shared learning status bar", () => {
  it("exposes server progress and zero-day streak, and delegates language changes", () => {
    const onChange = vi.fn();
    render(
      <LearningStatusBar
        goal={{ type: "items", current: 3, value: 10 }}
        streakDays={0}
        language={{ ...language, onChange }}
      />,
    );
    expect(
      screen.getByRole("progressbar", { name: "היעד היומי" }),
    ).toHaveAttribute("value", "3");
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "10");
    expect(document.querySelector(".learning-status-streak")).toHaveTextContent(
      "0",
    );
    expect(screen.getAllByRole("option")).toHaveLength(2);
    const select = screen.getByRole("combobox", { name: "שפת המקור" });
    fireEvent.change(select, { target: { value: "ar" } });
    expect(onChange).toHaveBeenCalledExactlyOnceWith("ar");
    expect(select).toHaveValue("en");
  });

  it("keeps an unavailable goal/streak absent and honors scoped-language locking", () => {
    render(<LearningStatusBar language={{ ...language, disabled: true }} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(document.querySelector(".learning-status-streak")).toBeNull();
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("clamps the progress indicator while retaining the actual achieved amount", () => {
    render(
      <LearningStatusBar
        goal={{ type: "minutes", current: 15, value: 10 }}
        language={language}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "10");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      expect.stringContaining("15 / 10"),
    );
  });

  it("localizes language options and pair direction in LTR", async () => {
    await i18n.changeLanguage("en");
    render(<LearningStatusBar language={language} />);
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Arabic" })).toBeInTheDocument();
    expect(
      document.querySelector(".learning-status-language"),
    ).toHaveTextContent("Hebrew →");
  });
});
